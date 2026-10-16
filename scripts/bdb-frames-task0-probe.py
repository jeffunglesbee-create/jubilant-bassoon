#!/usr/bin/env python3
"""Task 0 of field-relay-nba docs/CC-CMD-2026-10-15-build-bdb-frames.md:
measure the Kaggle BDB archive BEFORE anything is extracted.

Runs here because the Kaggle credentials are this repo's secrets (the relay has
none). Order is the point of the task:

  A. file listing + sizes        Kaggle's files-list API; no file is downloaded
  B. games / plays / players     the small tables, read whole; every other CSV
                                 header read for a position column
  C. ONE tracking week, streamed it is parsed line by line and never stored;
                                 the week is picked from A and B before C starts

Nothing in C is a sample: every row of the picked week is counted. Every other
week is described from A and B only, and the artifact says so (Rule 91).

Stop condition (spec): `pass_forward` is not an event string present in the
data. Matched exactly: a near-miss ('pass_forward ', 'PASS_FORWARD') is
reported as itself and does not satisfy it.

Never prints or writes the key: only HTTP statuses and lengths.
`--self-test` runs the analysers against synthetic rows and exits.
"""
import base64, csv, io, json, os, re, statistics, sys, urllib.error, urllib.parse, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone

OWNER, SLUG = "alexandermeau", "nfl-big-data-bowl-archived-data-2025"
API = "https://www.kaggle.com/api/v1"
TARGET_EVENTS = ("ball_snap", "pass_forward")   # the contract's `events`
SPEC_EVENTS = ("ball_snap", "snap", "pass_forward", "pass_arrived")  # named in the spec
CEILING_BYTES = 2 * 1024 * 1024  # Task 1's build gate, "<= 2 MB"
WEEK_FILE = re.compile(r"(?:^|/)tracking_week_(\d+)\.csv$")
POSITION_COL = re.compile(r"position|^pos$|^pos_|_pos$", re.I)


# ── pure analysers (self-tested) ────────────────────────────────────────────

def week_files(listing):
    """{week: bytes} from a files-list response's entries. Bytes as Kaggle reports them."""
    out = {}
    for f in listing:
        m = WEEK_FILE.search(f["name"])
        if m:
            out[int(m.group(1))] = f["bytes"]
    return dict(sorted(out.items()))


def games_summary(rows):
    """games.csv rows -> seasons, weeks, games per week, teams per week."""
    seasons, per_week, teams = Counter(), Counter(), defaultdict(set)
    week_of = {}
    for r in rows:
        seasons[r["season"]] += 1
        w = int(r["week"])
        per_week[w] += 1
        teams[w].update((r["homeTeamAbbr"], r["visitorTeamAbbr"]))
        week_of[r["gameId"]] = w
    return {
        "seasons": dict(seasons),
        "games_per_week": {w: per_week[w] for w in sorted(per_week)},
        "teams_per_week": {w: len(teams[w]) for w in sorted(teams)},
        "all_teams": len(set().union(*teams.values())) if teams else 0,
    }, week_of


TRUTHY = ("1", "true", "t", "yes")  # build-bdb-data.py's _truthy, so the two cannot disagree


def plays_summary(rows, week_of):
    """plays.csv rows -> plays per game per week, dropback plays per week, and
    the literal isDropback values seen (so the dropback count is measured, not
    assumed to be spelled TRUE)."""
    per_game, dropbacks, raw_db = Counter(), Counter(), Counter()
    index = {}
    unknown_game = 0
    for r in rows:
        g = r["gameId"]
        raw = r.get("isDropback")
        raw_db[raw] += 1          # every row of the file, the literal census
        if g not in week_of:
            unknown_game += 1
            continue
        per_game[g] += 1
        is_db = (raw or "").strip().lower() in TRUTHY
        if is_db:
            dropbacks[week_of[g]] += 1
        index[(g, r["playId"])] = (r["possessionTeam"], r["defensiveTeam"], is_db)
    by_week = defaultdict(list)
    for g, n in per_game.items():
        by_week[week_of[g]].append(n)
    out = {}
    for w in sorted(by_week):
        ns = sorted(by_week[w])
        out[w] = {"games": len(ns), "plays": sum(ns), "plays_per_game_min": ns[0],
                  "plays_per_game_median": statistics.median(ns), "plays_per_game_max": ns[-1],
                  "dropback_plays": dropbacks[w]}
    return out, index, unknown_game, dict(raw_db.most_common())


def pick_week(teams_per_week, all_teams, plays_by_week, bytes_by_week=None):
    """The rule, stated so it can be checked: among weeks where every team plays
    (the spec prefers league-wide cross-section), the one with the fewest
    plays.csv plays, lowest week number on a tie. Play count is a PROXY for the
    artifact's size; the artifact is measured for the picked week only."""
    full = [w for w, n in teams_per_week.items() if n == all_teams and w in plays_by_week]
    if not full:
        return None, "no week has every team"
    w = min(full, key=lambda k: (plays_by_week[k]["plays"], k))
    cands = {k: {"plays": plays_by_week[k]["plays"], "tracking_bytes": (bytes_by_week or {}).get(k)} for k in full}
    return w, (f"week {w}: of the weeks where every team plays ({full}), the fewest plays.csv plays, "
               f"lowest week on a tie; play count is the size proxy, artifact bytes measured for week {w} "
               f"only; candidates {json.dumps(cands)}")


def position_columns(headers):
    """{file: [columns that look like a position]} over every header read."""
    return {f: [c for c in cols if POSITION_COL.search(c)] for f, cols in headers.items()}


def parse_time(s):
    try:
        return datetime.fromisoformat(s.strip())
    except ValueError:
        return None


class WeekCounter:
    """Feed every tracking row of one week; never stores rows."""

    def __init__(self, plays_index, players):
        self.plays_index = plays_index      # (gameId, playId) -> (off, def, isDropback)
        self.players = players              # nflId -> (displayName, position)
        self.rows = 0
        self.no_event_rows = 0
        self.event_rows = Counter()         # literal event string -> rows
        self.event_frames = defaultdict(set)  # event -> {(g, p, f)}
        self.frame_type = Counter()
        self.direction = Counter()
        self.club = Counter()
        self.frame_rows = Counter()         # (g, p, f) -> rows
        self.frame_players = Counter()      # (g, p, f) -> non-football rows
        self.frame_events = defaultdict(set)  # (g, p, f) -> {event}
        self.play_time = defaultdict(dict)  # (g, p) -> {frameId: time}
        self.bad_time = 0
        self.nfl_ids = set()
        self.football_rows = 0
        self.player_club = defaultdict(set)  # (g, p, nflId) -> {club}
        self.week_club = defaultdict(set)    # nflId -> {club} across the week
        self.track_name = {}                 # nflId -> first tracking displayName
        self.x_range = [float("inf"), float("-inf")]
        self.y_range = [float("inf"), float("-inf")]
        self.emit = defaultdict(list)       # (g, p, event) -> contract player rows

    def add(self, r):
        self.rows += 1
        g, p, f = r["gameId"], r["playId"], int(r["frameId"])
        key = (g, p, f)
        ev = r["event"]
        if ev in ("", "NA"):
            self.no_event_rows += 1
        else:
            self.event_rows[ev] += 1
            self.event_frames[ev].add(key)
            self.frame_events[key].add(ev)
        self.frame_type[r.get("frameType")] += 1
        self.direction[r["playDirection"]] += 1
        self.frame_rows[key] += 1
        t = parse_time(r["time"])
        if t is None:
            self.bad_time += 1
        else:
            self.play_time[(g, p)].setdefault(f, t)
        nid = r["nflId"]
        if nid in ("", "NA"):
            self.football_rows += 1
            return
        self.frame_players[key] += 1
        self.nfl_ids.add(nid)
        self.club[r["club"]] += 1
        self.player_club[(g, p, nid)].add(r["club"])
        self.week_club[nid].add(r["club"])
        self.track_name.setdefault(nid, r.get("displayName"))
        x, y = float(r["x"]), float(r["y"])
        self.x_range = [min(self.x_range[0], x), max(self.x_range[1], x)]
        self.y_range = [min(self.y_range[0], y), max(self.y_range[1], y)]
        if ev in TARGET_EVENTS:
            meta = self.plays_index.get((g, p))
            side = None if meta is None else ("offense" if r["club"] == meta[0]
                                              else "defense" if r["club"] == meta[1] else None)
            pos = (self.players.get(nid) or (None, None))[1]
            self.emit[(g, p, ev)].append({"nflId": int(nid), "team": r["club"], "pos": pos,
                                          "side": side, "x": float(r["x"]), "y": float(r["y"])})

    def result(self):
        plays = {(g, p) for (g, p, _f) in self.frame_rows}
        games = {g for (g, _p) in plays}
        deltas = Counter()
        for frames in self.play_time.values():
            ids = sorted(frames)
            for a, b in zip(ids, ids[1:]):
                if b == a + 1:
                    deltas[round((frames[b] - frames[a]).total_seconds(), 3)] += 1
        frames_per_play = Counter((g, p) for (g, p, _f) in self.frame_rows)
        fpp = sorted(frames_per_play.values())
        multi_event_frames = sum(1 for evs in self.frame_events.values() if len(evs) > 1)
        events = {}
        for ev in sorted(self.event_rows, key=lambda e: -self.event_rows[e]):
            fr = self.event_frames[ev]
            per_play = Counter((g, p) for (g, p, _f) in fr)
            events[ev] = {"rows": self.event_rows[ev], "frames": len(fr), "plays": len(per_play),
                          "plays_with_more_than_one_frame": sum(1 for n in per_play.values() if n > 1)}
        resolved = sum(1 for n in self.nfl_ids if n in self.players)
        name_mismatch = sum(1 for n, t in self.track_name.items()
                            if n in self.players and (self.players[n][0] or "") != (t or ""))
        no_name = sum(1 for n in self.nfl_ids if n in self.players and not (self.players[n][0] or "").strip())
        dropback_plays = {k for k in plays if (self.plays_index.get(k) or (0, 0, False))[2]}
        pf_plays = {(g, p) for (g, p, _f) in self.event_frames.get("pass_forward", ())}
        unknown_side = sum(1 for rows in self.emit.values() for r in rows if r["side"] is None)
        unknown_pos = sum(1 for rows in self.emit.values() for r in rows if r["pos"] is None)
        return {
            "rows": self.rows, "rows_without_event": self.no_event_rows,
            "games": len(games), "plays": len(plays),
            "plays_not_in_plays_csv": sum(1 for k in plays if k not in self.plays_index),
            "frames": len(self.frame_rows),
            "frames_per_play": {"min": fpp[0] if fpp else None,
                                "median": statistics.median(fpp) if fpp else None,
                                "max": fpp[-1] if fpp else None},
            "frame_interval_seconds": {str(k): v for k, v in deltas.most_common(8)},
            "unparsed_time_rows": self.bad_time,
            "events": events,
            "frames_with_more_than_one_event": multi_event_frames,
            "frame_type": dict(self.frame_type.most_common()),
            "play_direction": dict(self.direction.most_common()),
            "football_rows": self.football_rows,
            "players_per_frame": dict(sorted(Counter(self.frame_players.values()).items())),
            "clubs": len(self.club),
            "club_changes_within_a_play": sum(1 for s in self.player_club.values() if len(s) > 1),
            "nflIds": len(self.nfl_ids), "nflIds_resolved_in_players_csv": resolved,
            "nflIds_with_empty_name_in_players_csv": no_name,
            "nflIds_whose_tracking_name_differs_from_players_csv": name_mismatch,
            "nflIds_with_more_than_one_club_in_week": sum(1 for c in self.week_club.values() if len(c) > 1),
            "x_range": self.x_range, "y_range": self.y_range,
            "dropback_plays": len(dropback_plays),
            "dropback_plays_with_pass_forward": len(dropback_plays & pf_plays),
            "emitted_player_rows_side_unresolved": unknown_side,
            "emitted_player_rows_pos_unresolved": unknown_pos,
        }

    def artifact_bytes(self, week):
        """Exact compact-JSON size of Task 2's contract over this week, both events."""
        data = [{"gameId": int(g), "playId": int(p), "event": ev, "players": rows}
                for (g, p, ev), rows in sorted(self.emit.items())]
        env = {"updated": "2026-10-16T00:00:00+00:00", "season": 2022,
               "sourceDataset": f"kaggle {OWNER}/{SLUG}", "week": week,
               "metric": "event_frames", "events": list(TARGET_EVENTS), "data": data}
        whole = len(json.dumps(env, separators=(",", ":")).encode())
        per_game = Counter()
        for d in data:
            per_game[d["gameId"]] += len(json.dumps(d, separators=(",", ":")).encode()) + 1
        return whole, dict(per_game)


def games_under_ceiling(whole, per_game, ceiling=CEILING_BYTES):
    """How many whole games fit, in gameId order, keeping the envelope."""
    envelope = whole - sum(per_game.values())
    total, n = envelope, 0
    for g in sorted(per_game):
        if total + per_game[g] > ceiling:
            break
        total += per_game[g]
        n += 1
    return n, total


def position_granularity(pos_cols, duplicate_nflId):
    """per-player when a position column exists only in players.csv and nflId is
    unique there; per-play when any other file carries one."""
    elsewhere = {f: c for f, c in pos_cols.items() if c and f != "players.csv"}
    if elsewhere:
        return {"grain": "per-play", "columns": elsewhere}
    if pos_cols.get("players.csv") and duplicate_nflId == 0:
        return {"grain": "per-player", "columns": {"players.csv": pos_cols["players.csv"]}}
    return {"grain": "unresolved", "columns": pos_cols, "duplicate_nflId": duplicate_nflId}


def spec_events(events):
    return {e: ({"present": True, **events[e]} if e in events else {"present": False}) for e in SPEC_EVENTS}


def verdict(events, population):
    present = "pass_forward" in events
    near = sorted(e for e in events if e != "pass_forward" and re.sub(r"[^a-z]", "", e.lower()) == "passforward")
    return {"stop_condition": "pass_forward is not an event string present in the data",
            "population": population,
            "met": not present, "pass_forward_present": present, "near_misses": near,
            "reading": ("pass_forward is present" if present
                        else f"pass_forward is absent from {population}; the other weeks were not read")}


# ── IO (live only) ─────────────────────────────────────────────────────────

def _auth():
    u = (os.environ.get("KAGGLE_USERNAME") or "").strip()
    k = (os.environ.get("KAGGLE_KEY") or "").strip()
    return ("Basic " + base64.b64encode(f"{u}:{k}".encode()).decode()) if (u and k) else None


def _open(url, auth, timeout=180):
    req = urllib.request.Request(url, headers={"Authorization": auth, "User-Agent": "FIELD/1.0"})
    return urllib.request.urlopen(req, timeout=timeout)


class _Counted(io.RawIOBase):
    def __init__(self, resp):
        self.resp, self.n = resp, 0
    def readable(self):
        return True
    def readinto(self, b):
        chunk = self.resp.read(len(b))
        self.n += len(chunk)
        b[:len(chunk)] = chunk
        return len(chunk)


def _download(auth, name):
    url = f"{API}/datasets/download/{OWNER}/{SLUG}?file_name={urllib.parse.quote(name)}"
    return _open(url, auth)


def _csv(resp):
    counted = _Counted(resp)
    text = io.TextIOWrapper(io.BufferedReader(counted, 1 << 20), encoding="utf-8", newline="")
    return counted, csv.DictReader(text)


def _listing(auth):
    files, token, pages, seen = [], None, 0, set()
    while True:
        q = "?pageSize=200" + (f"&pageToken={urllib.parse.quote(token)}" if token else "")
        with _open(f"{API}/datasets/list/{OWNER}/{SLUG}{q}", auth, timeout=90) as r:
            status, j = r.status, json.loads(r.read())
        pages += 1
        for f in j.get("datasetFiles") or j.get("files") or []:
            name = f.get("nameNullable") or f.get("name")
            if name not in seen:
                seen.add(name)
                files.append({"name": name,
                              "bytes": f.get("totalBytesNullable") or f.get("totalBytes") or f.get("size")})
        nxt = j.get("nextPageTokenNullable") or j.get("nextPageToken")
        if not nxt or nxt == token or pages >= 20:
            return status, files, pages, bool(nxt) and nxt != token
        token = nxt


def live(write):
    """Each stage writes the artifact before the next starts, so a failure in a
    later stage keeps what earlier ones measured. `write(out)` is called after
    every stage and on failure; the error is recorded with its stage."""
    auth = _auth()
    out = {"probe": "bdb-frames-task0", "dataset": f"{OWNER}/{SLUG}",
           "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "creds_present": bool(auth), "stages_done": []}
    if not auth:
        out["error"] = {"stage": "auth", "type": "MissingCredentials",
                        "message": "KAGGLE_USERNAME/KAGGLE_KEY absent"}
        write(out)
        return out, 1
    stage = "A listing"
    try:
        # A. listing: no file is downloaded
        with _open(f"{API}/datasets/view/{OWNER}/{SLUG}", auth, timeout=90) as r:
            view = json.loads(r.read())
        out["view"] = {k: view.get(k) for k in ("totalBytesNullable", "lastUpdated", "currentVersionNumberNullable",
                                                "subtitleNullable", "licenseNameNullable") if k in view}
        status, files, pages, truncated = _listing(auth)
        out["listing"] = {"http": status, "pages": pages, "truncated": truncated, "files": files}
        weeks = week_files(files)
        out["tracking_bytes_by_week"] = weeks
        out["tracking_weeks"] = sorted(weeks)
        prefix = next((f["name"].rsplit("/", 1)[0] + "/" for f in files if "/" in f["name"]), "")
        out["stages_done"].append(stage)
        write(out)

        # B. the small tables, whole; every CSV's header
        stage = "B tables"
        with _download(auth, prefix + "games.csv") as r:
            _, rd = _csv(r)
            gsum, week_of = games_summary(rd)
        out["games"] = gsum
        with _download(auth, prefix + "plays.csv") as r:
            _, rd = _csv(r)
            psum, plays_index, unknown, raw_db = plays_summary(rd, week_of)
        out["plays_by_week"] = psum
        out["plays_with_unknown_game"] = unknown
        out["isDropback_values"] = raw_db
        players, pos_counts, dup, empty_name = {}, Counter(), 0, 0
        with _download(auth, prefix + "players.csv") as r:
            _, rd = _csv(r)
            for row in rd:
                if row["nflId"] in players:
                    dup += 1
                if not (row.get("displayName") or "").strip():
                    empty_name += 1
                players[row["nflId"]] = (row.get("displayName"), row.get("position") or None)
                pos_counts[row.get("position") or "(empty)"] += 1
        out["players"] = {"rows": len(players), "duplicate_nflId": dup, "empty_displayName": empty_name,
                          "positions": dict(pos_counts.most_common())}
        headers = {}
        for name in sorted(f["name"] for f in files if f["name"].endswith(".csv")):
            with _download(auth, name) as r:
                line = r.readline(65536).decode("utf-8", "replace").strip()
            headers[name.rsplit("/", 1)[-1]] = [c.strip('"') for c in line.split(",")]
        out["headers"] = headers
        out["position_columns"] = position_columns(headers)
        out["position_granularity"] = position_granularity(out["position_columns"], dup)
        out["team_columns"] = {f: [c for c in cols if c in ("club", "teamAbbr", "possessionTeam",
                                                             "defensiveTeam", "homeTeamAbbr", "visitorTeamAbbr")]
                               for f, cols in headers.items()}
        week, why = pick_week(gsum["teams_per_week"], gsum["all_teams"], psum, weeks)
        out["picked_week"], out["picked_week_rule"] = week, why
        out["stages_done"].append(stage)
        write(out)
        if week is None:
            out["error"] = {"stage": "pick", "type": "NoWeek", "message": why}
            write(out)
            return out, 1
        name = next((f["name"] for f in files if week_files([f]) and list(week_files([f])) == [week]), None)
        if name is None:
            out["error"] = {"stage": "pick", "type": "NoFile", "message": f"no tracking file for week {week}"}
            write(out)
            return out, 1

        # C. one week, every row, never stored
        stage = "C week"
        wc = WeekCounter(plays_index, players)
        with _download(auth, name) as r:
            out["stream_headers"] = {h: r.headers.get(h) for h in ("Content-Type", "Content-Length", "Content-Encoding")}
            counted, rd = _csv(r)
            for row in rd:
                wc.add(row)
        res = wc.result()
        res["bytes_streamed"] = counted.n
        res["bytes_listed"] = weeks.get(week)
        res["plays_in_plays_csv"] = psum[week]["plays"]
        whole, per_game = wc.artifact_bytes(week)
        n_games, kept = games_under_ceiling(whole, per_game)
        res["artifact_bytes_full_week"] = whole
        res["artifact_games_under_ceiling"] = {"games": n_games, "of": len(per_game), "bytes": kept,
                                               "ceiling": CEILING_BYTES}
        out["week"] = res
        population = f"week {week}, every row of 1 of {len(weeks)} tracking files"
        out["spec_events"] = spec_events(res["events"])
        out["verdict"] = verdict(res["events"], population)
        out["coverage"] = (f"event vocabulary, sample rate, resolution and artifact size: {population}. "
                           f"Games and plays per week: games.csv and plays.csv, all weeks. "
                           f"Bytes per week: Kaggle's file listing, all weeks.")
        out["stages_done"].append(stage)
        write(out)
        return out, 0
    except Exception as e:  # recorded with its stage; the artifact keeps every earlier stage
        out["error"] = {"stage": stage, "type": type(e).__name__, "message": str(e)[:300]}
        write(out)
        return out, 1


# ── self-test ──────────────────────────────────────────────────────────────

def self_test():
    fails = []
    def check(name, cond):
        print(("PASS  " if cond else "FAIL  ") + name)
        if not cond:
            fails.append(name)

    lst = [{"name": "d/tracking_week_2.csv", "bytes": 20}, {"name": "d/tracking_week_10.csv", "bytes": 5},
           {"name": "d/plays.csv", "bytes": 1}, {"name": "d/xtracking_week_3.csv", "bytes": 9},
           {"name": "d/tracking_week_4.csv.bak", "bytes": 9}]
    check("week files: parsed numerically, sorted, non-week files ignored", week_files(lst) == {2: 20, 10: 5})

    games = [{"gameId": "1", "season": "2022", "week": "1", "homeTeamAbbr": "A", "visitorTeamAbbr": "B"},
             {"gameId": "2", "season": "2022", "week": "1", "homeTeamAbbr": "C", "visitorTeamAbbr": "D"},
             {"gameId": "3", "season": "2022", "week": "2", "homeTeamAbbr": "A", "visitorTeamAbbr": "C"},
             {"gameId": "4", "season": "2022", "week": "3", "homeTeamAbbr": "A", "visitorTeamAbbr": "B"},
             {"gameId": "5", "season": "2022", "week": "3", "homeTeamAbbr": "C", "visitorTeamAbbr": "D"}]
    gs, week_of = games_summary(games)
    check("games: per week counted", gs["games_per_week"] == {1: 2, 2: 1, 3: 2})
    check("games: teams per week, and the league size", gs["teams_per_week"] == {1: 4, 2: 2, 3: 4} and gs["all_teams"] == 4)

    plays = [{"gameId": "1", "playId": "10", "possessionTeam": "A", "defensiveTeam": "B", "isDropback": "TRUE"},
             {"gameId": "1", "playId": "11", "possessionTeam": "B", "defensiveTeam": "A", "isDropback": "FALSE"},
             {"gameId": "2", "playId": "10", "possessionTeam": "C", "defensiveTeam": "D", "isDropback": "TRUE"},
             {"gameId": "4", "playId": "10", "possessionTeam": "A", "defensiveTeam": "B", "isDropback": "FALSE"},
             {"gameId": "4", "playId": "11", "possessionTeam": "A", "defensiveTeam": "B", "isDropback": "t"},
             {"gameId": "5", "playId": "10", "possessionTeam": "C", "defensiveTeam": "D", "isDropback": "FALSE"},
             {"gameId": "9", "playId": "10", "possessionTeam": "C", "defensiveTeam": "D", "isDropback": "TRUE"}]
    try:
        ps, idx, unknown, raw_db = plays_summary(plays, week_of)
    except Exception as e:
        check(f"plays: summary runs ({type(e).__name__})", False)
        return 1
    check("plays: per game per week, dropbacks", ps[1]["plays"] == 3 and ps[1]["dropback_plays"] == 2
          and ps[1]["plays_per_game_max"] == 2 and ps[1]["plays_per_game_min"] == 1)
    check("plays: a play whose game is not in games.csv is counted apart", unknown == 1 and ("9", "10") not in idx)
    check("plays: isDropback literals recorded, and 't' counts as the builder's _truthy does",
          raw_db == {"TRUE": 3, "FALSE": 3, "t": 1} and ps[3]["dropback_plays"] == 1)

    ps_tie = {1: {"plays": 3}, 2: {"plays": 1}, 3: {"plays": 3}}
    w, why = pick_week(gs["teams_per_week"], gs["all_teams"], ps_tie, {1: 50, 3: 40})
    check("pick: a week missing teams is never picked; a tie goes to the lower week", w == 1)
    check("pick: the rule names the proxy, the tie-break and each candidate's bytes",
          "proxy" in why and "tie" in why and '"tracking_bytes": 40' in why)
    w2, _ = pick_week(gs["teams_per_week"], gs["all_teams"], {1: {"plays": 3}, 3: {"plays": 2}})
    check("pick: fewest plays wins among complete weeks", w2 == 3)
    check("pick: no complete week -> None", pick_week({1: 2}, 4, {1: {"plays": 1}})[0] is None)

    pc = position_columns({"players.csv": ["nflId", "position"], "player_play.csv": ["nflId", "positionLinedUp", "posTeam"],
                           "tracking": ["nflId", "x", "pos"]})
    check("position columns: found in every file, not confused with posTeam", pc == {
        "players.csv": ["position"], "player_play.csv": ["positionLinedUp"], "tracking": ["pos"]})
    check("granularity: a position column outside players.csv -> per-play",
          position_granularity(pc, 0)["grain"] == "per-play")
    check("granularity: only players.csv, nflId unique -> per-player",
          position_granularity({"players.csv": ["position"], "plays.csv": []}, 0)["grain"] == "per-player")
    check("granularity: duplicate nflId -> unresolved, not per-player",
          position_granularity({"players.csv": ["position"]}, 2)["grain"] == "unresolved")

    players = {"100": ("Q", "QB"), "200": ("Cee", "CB"), "500": ("", "LB")}
    def row(g, p, f, nid, club, ev="NA", t=None, x="10.0"):
        t = t or f"2022-09-08 20:00:{f:02d}.{0}"
        name = {"100": "Q", "200": "C"}.get(nid, "X")
        return {"gameId": g, "playId": p, "frameId": str(f), "nflId": nid, "displayName": name,
                "club": club, "event": ev,
                "frameType": "SNAP" if ev == "ball_snap" else "AFTER_SNAP", "playDirection": "left",
                "time": t, "x": x, "y": "20.0"}
    wc = WeekCounter(idx, players)
    tenth = lambda f: f"2022-09-08 20:00:{f // 10:02d}.{f % 10}"
    try:
        for f in (1, 2, 3, 4):
            ev = "ball_snap" if f == 1 else "pass_forward" if f == 3 else "pass_forward " if f == 4 else "NA"
            wc.add(row("1", "10", f, "100", "A", ev, tenth(f)))
            wc.add(row("1", "10", f, "200", "B", ev, tenth(f)))
            wc.add(row("1", "10", f, "NA", "football", ev, tenth(f), x="11.0"))
        wc.add(row("1", "11", 1, "300", "B", "ball_snap", tenth(1)))
        wc.add(row("1", "11", 2, "300", "A", "NA", "not a time"))
        res = wc.result()
    except Exception as e:
        check(f"week counter runs on rows with a football ({type(e).__name__})", False)
        return 1
    gap = WeekCounter(idx, players)
    gap.add(row("1", "10", 1, "100", "A", "NA", tenth(1)))
    gap.add(row("1", "10", 3, "100", "A", "NA", tenth(3)))
    check("sample rate: a gap in frameId is not read as one interval", gap.result()["frame_interval_seconds"] == {})
    check("events: counted by FRAME, not by row (3 rows per frame)", res["events"]["pass_forward"]["frames"] == 1
          and res["events"]["pass_forward"]["rows"] == 3)
    check("events: a near-miss string is its own vocabulary entry", "pass_forward " in res["events"]
          and res["events"]["pass_forward"]["plays"] == 1)
    check("events: plays per event", res["events"]["ball_snap"]["plays"] == 2)
    check("rows, plays, games, frames", (res["rows"], res["plays"], res["games"], res["frames"]) == (14, 2, 1, 6))
    check("rows without an event counted apart", res["rows_without_event"] == 4)
    check("tracking plays missing from plays.csv counted", res["plays_not_in_plays_csv"] == 0)
    check("sample rate: consecutive frames 0.1 s apart", res["frame_interval_seconds"] == {"0.1": 3})
    check("unparseable time counted", res["unparsed_time_rows"] == 1)
    check("football rows apart from players", res["football_rows"] == 4)
    check("players per frame excludes the ball", res["players_per_frame"] == {1: 2, 2: 4})
    check("a player whose club changes inside a play is counted", res["club_changes_within_a_play"] == 1)
    check("resolution: nflIds found in players.csv", (res["nflIds"], res["nflIds_resolved_in_players_csv"]) == (3, 2))
    check("resolution: a tracking name that differs from players.csv is counted",
          res["nflIds_whose_tracking_name_differs_from_players_csv"] == 1)
    check("resolution: a player who changes club across the week is counted",
          res["nflIds_with_more_than_one_club_in_week"] == 1)
    blank = WeekCounter(idx, players)
    blank.add(dict(row("1", "10", 1, "500", "A"), displayName=""))
    check("resolution: an empty players.csv name is counted", blank.result()["nflIds_with_empty_name_in_players_csv"] == 1)
    check("dropback coverage: play 10 is a dropback with pass_forward; play 11 is not a dropback",
          (res["dropback_plays"], res["dropback_plays_with_pass_forward"]) == (1, 1))
    check("emitted rows: side from possessionTeam, pos from players.csv",
          sorted((r["nflId"], r["side"], r["pos"]) for r in wc.emit[("1", "10", "pass_forward")])
          == [(100, "offense", "QB"), (200, "defense", "CB")])
    check("emitted rows: only TARGET_EVENTS frames, never the ball",
          set(e for (_g, _p, e) in wc.emit) == {"ball_snap", "pass_forward"}
          and all(r["nflId"] != "NA" for rows in wc.emit.values() for r in rows))
    check("emitted rows: unresolved pos counted", res["emitted_player_rows_pos_unresolved"] == 1)
    whole, per_game = wc.artifact_bytes(1)
    check("artifact bytes: whole = envelope + games", whole > sum(per_game.values()) > 0)
    n, kept = games_under_ceiling(1000, {"a": 300, "b": 300, "c": 300}, ceiling=750)
    check("ceiling: stops at the first game that would cross it (envelope 100 + 300 + 300)", (n, kept) == (2, 700))
    n2, _ = games_under_ceiling(1000, {"a": 300, "b": 300, "c": 300}, ceiling=1000)
    check("ceiling: exactly at the ceiling is inside it", n2 == 3)

    v = verdict({"pass_forward": {}, "ball_snap": {}}, "week 1")
    check("verdict: present -> NOT MET", v["met"] is False and v["pass_forward_present"] is True)
    v = verdict({"pass_forward ": {}, "PASS_FORWARD": {}, "ball_snap": {}}, "week 1, 1 of 9")
    check("verdict: only near-misses -> MET, and they are named", v["met"] is True
          and v["near_misses"] == ["PASS_FORWARD", "pass_forward "])
    check("verdict: carries its population, and says the other weeks were not read",
          v["population"] == "week 1, 1 of 9" and "not read" in v["reading"])
    se = spec_events({"ball_snap": {"frames": 2, "plays": 2}, "pass_arrived": {"frames": 1, "plays": 1}})
    check("spec events: each named event present or absent, snap absent here",
          se["snap"] == {"present": False} and se["ball_snap"]["present"] and se["ball_snap"]["frames"] == 2
          and se["pass_forward"] == {"present": False} and se["pass_arrived"]["present"])

    print(f"\n{len(fails)} failed")
    return 1 if fails else 0


def _writer(stamp_from):
    def write(out):
        os.makedirs("outbox", exist_ok=True)
        stamp = stamp_from["generated"].replace(":", "").replace("-", "")[:15] if "generated" in stamp_from else "unknown"
        body = json.dumps(out, indent=2, default=str)
        for path in (f"outbox/bdb-frames-task0-{stamp}Z.json", "outbox/bdb-frames-task0-latest.json"):
            with open(path, "w") as fh:
                fh.write(body + "\n")
    return write


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    holder = {}
    def write(out):
        holder.update(generated=out["generated"])
        _writer(holder)(out)
    result, code = live(write)
    v = result.get("verdict", {})
    print(json.dumps({k: result.get(k) for k in ("stages_done", "error", "tracking_bytes_by_week", "picked_week",
                                                  "picked_week_rule", "coverage")}, indent=2, default=str))
    print(f"stop condition {'MET' if v.get('met') else 'NOT MET'}: {v.get('reading')}" if v else "no verdict")
    sys.exit(code)
