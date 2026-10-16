#!/usr/bin/env python3
"""BDB event frames: one row per player per NAMED EVENT FRAME, never per tick.

field-relay-nba docs/CC-CMD-2026-10-15-build-bdb-frames.md, Tasks 1-2, with
the owner's 2026-10-16 rulings recorded under its Task 1:

- runs here, as its own script and dispatch-only workflow; the six existing
  builders (build-bdb-data.py, bdb-update.yml) are not touched;
- the ceiling is 2,000,000 bytes on the exact bytes uploaded, compact JSON;
- both events are kept (ball_snap, pass_forward); whole games are cut in
  gameId order; two variants are measured in the same run and recorded:
    (a) ball_snap on every play that has one (the spec's literal order)
    (b) ball_snap only on plays that are dropbacks or carry pass_forward
  (b) is used when it keeps more whole games, because no written metric
  reads a snap frame on a play that is neither (see the CC-CMD);
- season and sourceDataset are on the envelope; targetYear is not;
- the coordinate convention is data on the envelope, and is verified on
  the week's own plays against the alternatives before anything uploads.

Week 2 was picked in Task 0 (jubilant-bassoon outbox/bdb-frames-task0-latest.json:
the week where every team plays with the fewest plays).

Exits non-zero on: missing credentials, a season that is absent or not
single, a convention the data does not support, an artifact over the
ceiling, an R2 upload that fails, or an R2 read-back that differs.
`--self-test` runs the analysers on synthetic rows and exits.
"""
import base64, csv, hashlib, io, json, os, statistics, sys, urllib.parse, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone

OWNER, SLUG = "alexandermeau", "nfl-big-data-bowl-archived-data-2025"
PFX = "big-data-bowl-data/"
SOURCE_DATASET = f"kaggle {OWNER}/{SLUG}"
WEEK = 2
EVENTS = ("ball_snap", "pass_forward")
CEILING_BYTES = 2_000_000
FIELD_LENGTH = 120.0   # yards, end line to end line, end zones included
FIELD_WIDTH = 53.3     # yards, sideline to sideline, as the dataset uses
TRUTHY = ("1", "true", "t", "yes")   # build-bdb-data.py's _truthy
FILE = "bdb_event_frames.json"
CONVENTION_MIN_AGREEMENT = 0.9

CONVENTION = {
    "frame": "offense-right",
    "units": "yards",
    "origin": "corner where the offense's own end line meets the sideline on its right",
    "x": "along the field, 0 to 120, increasing in the offense's direction of play; "
         "includes both end zones (field of play 10 to 110)",
    "y": "across the field, 0 to 53.3, increasing to the offense's left",
    "transform": "rows whose source playDirection is 'left' are rotated 180 degrees about "
                 "the field centre: x' = 120 - x, y' = 53.3 - y; 'right' rows are unchanged",
}


# ── pure analysers (self-tested) ────────────────────────────────────────────

def season_of(rows):
    """games.csv rows -> (season, week_of). A season that is absent or not
    single is a failure, never a default."""
    seasons, week_of = set(), {}
    for r in rows:
        s = (r.get("season") or "").strip()
        if not s.isdigit():
            raise ValueError(f"game {r.get('gameId')} has no season")
        seasons.add(int(s))
        week_of[r["gameId"]] = int(r["week"])
    if len(seasons) != 1:
        raise ValueError(f"expected one season, found {sorted(seasons)}")
    return seasons.pop(), week_of


def plays_index(rows, week_of, week):
    out = {}
    for r in rows:
        if week_of.get(r["gameId"]) != week:
            continue
        out[(r["gameId"], r["playId"])] = {
            "off": r["possessionTeam"], "def": r["defensiveTeam"],
            "dropback": (r.get("isDropback") or "").strip().lower() in TRUTHY,
            "passLocation": r.get("passLocationType") or None,
        }
    return out


def standardise(x, y, direction):
    if direction == "left":
        return round(FIELD_LENGTH - x, 2), round(FIELD_WIDTH - y, 2)
    if direction == "right":
        return round(x, 2), round(y, 2)
    raise ValueError(f"unknown playDirection {direction!r}")


class Week:
    """Feed every tracking row of the week; keeps only named-event frames."""

    def __init__(self, plays, players):
        self.plays, self.players = plays, players
        self.frames = defaultdict(list)   # (g, p, event) -> [player rows]
        self.direction = {}               # (g, p) -> playDirection
        self.ball_arrived = {}            # (g, p) -> (x, y) raw, pass_arrived football
        self.rows = 0

    def add(self, r):
        self.rows += 1
        ev = r["event"]
        if ev not in EVENTS and ev != "pass_arrived":
            return
        key = (r["gameId"], r["playId"])
        self.direction.setdefault(key, r["playDirection"])
        nid = r["nflId"]
        if nid in ("", "NA"):
            if ev == "pass_arrived":
                self.ball_arrived.setdefault(key, (float(r["x"]), float(r["y"])))
            return
        if ev == "pass_arrived":
            return
        meta = self.plays.get(key)
        side = None if meta is None else ("offense" if r["club"] == meta["off"]
                                          else "defense" if r["club"] == meta["def"] else None)
        x, y = standardise(float(r["x"]), float(r["y"]), r["playDirection"])
        self.frames[(r["gameId"], r["playId"], ev)].append({
            "nflId": int(nid), "team": r["club"], "pos": (self.players.get(nid) or (None, None))[1],
            "side": side, "x": x, "y": y, "_raw": (float(r["x"]), float(r["y"]))})


def convention_check(week):
    """Does 'offense-right' hold on this week's plays, and do the alternatives fail?

    x: at the snap the offense lines up behind the defense, so its mean x is the
       smaller one in a frame where the offense plays toward +x.
    y: plays.csv passLocationType names the side of a pass from the offense's
       view; where the ball arrives (tracking, pass_arrived) must sit on that side.
    Both are split by playDirection: on 'right' plays every candidate frame is the
    same frame, so only 'left' plays can tell them apart."""
    def frames_for(transform):
        res = {"x_snap": {"left": [0, 0], "right": [0, 0]}, "y_pass": {"left": [0, 0], "right": [0, 0]}}
        for (g, p, ev), rows in week.frames.items():
            if ev != "ball_snap":
                continue
            d = week.direction.get((g, p))
            off = [transform(*r["_raw"], d)[0] for r in rows if r["side"] == "offense"]
            dfn = [transform(*r["_raw"], d)[0] for r in rows if r["side"] == "defense"]
            if off and dfn and d in res["x_snap"]:
                res["x_snap"][d][1] += 1
                res["x_snap"][d][0] += statistics.mean(off) < statistics.mean(dfn)
        for key, (bx, by) in week.ball_arrived.items():
            loc = (week.plays.get(key) or {}).get("passLocation")
            d = week.direction.get(key)
            if loc not in ("OUTSIDE_LEFT", "OUTSIDE_RIGHT") or d not in ("left", "right"):
                continue
            ty = transform(bx, by, d)[1]
            res["y_pass"][d][1] += 1
            res["y_pass"][d][0] += (ty > FIELD_WIDTH / 2) == (loc == "OUTSIDE_LEFT")
        return res

    candidates = {
        "offense-right (declared: rotate left plays 180 degrees)": lambda x, y, d: standardise(x, y, d),
        "raw (source frame, no transform)": lambda x, y, d: (x, y),
        "mirror x only (flip x on left plays, keep y)": lambda x, y, d: ((FIELD_LENGTH - x) if d == "left" else x, y),
    }
    out = {name: frames_for(t) for name, t in candidates.items()}
    rate = lambda c: (c[0] / c[1]) if c[1] else None
    declared = out["offense-right (declared: rotate left plays 180 degrees)"]
    holds = all(rate(declared[k][d]) is not None and rate(declared[k][d]) >= CONVENTION_MIN_AGREEMENT
                for k in ("x_snap", "y_pass") for d in ("left", "right"))
    return {"agreement": {n: {k: {d: {"agree": v[k][d][0], "of": v[k][d][1]} for d in v[k]} for k in v}
                          for n, v in out.items()},
            "threshold": CONVENTION_MIN_AGREEMENT, "declared_holds": holds}


def example_play(week):
    """One 'left' play with an outside pass: the play where the candidate
    frames differ, with its numbers, so the declaration can be checked by hand."""
    for key in sorted(week.ball_arrived):
        loc = (week.plays.get(key) or {}).get("passLocation")
        if week.direction.get(key) != "left" or loc not in ("OUTSIDE_LEFT", "OUTSIDE_RIGHT"):
            continue
        snap = week.frames.get((key[0], key[1], "ball_snap")) or []
        off = [r for r in snap if r["side"] == "offense"]
        dfn = [r for r in snap if r["side"] == "defense"]
        if not off or not dfn:
            continue
        bx, by = week.ball_arrived[key]
        return {"gameId": int(key[0]), "playId": int(key[1]), "playDirection": "left",
                "passLocationType": loc,
                "snap_mean_x": {"raw": {"offense": round(statistics.mean(r["_raw"][0] for r in off), 2),
                                        "defense": round(statistics.mean(r["_raw"][0] for r in dfn), 2)},
                                "declared": {"offense": round(statistics.mean(r["x"] for r in off), 2),
                                             "defense": round(statistics.mean(r["x"] for r in dfn), 2)}},
                "ball_at_pass_arrived": {"raw": [bx, by], "declared": list(standardise(bx, by, "left"))}}
    return None


def keep(week, variant):
    """Frame keys emitted under a variant."""
    pf_plays = {(g, p) for (g, p, ev) in week.frames if ev == "pass_forward"}
    out = []
    for (g, p, ev) in week.frames:
        if ev == "ball_snap" and variant == "b":
            meta = week.plays.get((g, p)) or {}
            if not (meta.get("dropback") or (g, p) in pf_plays):
                continue
        out.append((g, p, ev))
    return sorted(out, key=lambda k: (int(k[0]), int(k[1]), EVENTS.index(k[2])))


def item(week, key):
    g, p, ev = key
    rows = [{k: v for k, v in r.items() if k != "_raw"} for r in week.frames[key]]
    return {"gameId": int(g), "playId": int(p), "event": ev, "players": rows}


def compact(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def envelope(season, week_no, variant, data, scope, updated):
    return {
        "updated": updated, "season": season, "sourceDataset": SOURCE_DATASET,
        "week": week_no, "metric": "event_frames", "events": list(EVENTS),
        "playFilter": ("ball_snap on every play that has one; pass_forward on every play that has one"
                       if variant == "a" else
                       "ball_snap only on plays with isDropback TRUE or a pass_forward frame; "
                       "pass_forward on every play that has one"),
        "coordinateConvention": CONVENTION, "scope": scope, "data": data,
    }


def fit(week, season, week_no, variant, updated, ceiling=CEILING_BYTES):
    """Whole games in gameId order, as many as fit with the envelope. Returns
    (body bytes, scope) for the largest prefix under the ceiling."""
    keys = keep(week, variant)
    games = sorted({int(g) for (g, _p, _e) in keys})
    by_game = defaultdict(list)
    for k in keys:
        by_game[int(k[0])].append(item(week, k))
    best, n = None, 0
    lo, hi = 0, len(games)
    while lo <= hi:   # the body grows with every game, so the largest fitting prefix is a binary search
        mid = (lo + hi) // 2
        kept = games[:mid]
        teams = sorted({r["team"] for g in kept for it in by_game[g] for r in it["players"]})
        scope = {"gamesKept": mid, "gamesInWeek": len(games), "gameIds": kept, "teamsKept": len(teams),
                 "ceilingBytes": ceiling, "cut": f"whole games in gameId order; {len(games) - mid} of {len(games)} dropped"}
        body = compact(envelope(season, week_no, variant, [it for g in kept for it in by_game[g]], scope, updated))
        if len(body) <= ceiling:
            best, n, lo = (body, scope), mid, mid + 1
        else:
            hi = mid - 1
    return best, n


def coverage(week, scope):
    kept = set(scope["gameIds"])
    db = {k for k, m in week.plays.items() if m["dropback"] and int(k[0]) in kept}
    pf = {(g, p) for (g, p, ev) in week.frames if ev == "pass_forward" and int(g) in kept}
    return {"dropback_plays": len(db), "dropback_plays_with_pass_forward": len(db & pf),
            "share": round(len(db & pf) / len(db), 4) if db else None}


# ── IO ─────────────────────────────────────────────────────────────────────

def _kaggle(name, timeout=600):
    u, k = (os.environ.get("KAGGLE_USERNAME") or "").strip(), (os.environ.get("KAGGLE_KEY") or "").strip()
    if not (u and k):
        raise SystemExit("KAGGLE_USERNAME/KAGGLE_KEY absent")
    auth = "Basic " + base64.b64encode(f"{u}:{k}".encode()).decode()
    url = f"https://www.kaggle.com/api/v1/datasets/download/{OWNER}/{SLUG}?file_name={urllib.parse.quote(name)}"
    return urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": auth, "User-Agent": "FIELD/1.0"}),
                                  timeout=timeout)


def _rows(name):
    r = _kaggle(name)
    return r, csv.DictReader(io.TextIOWrapper(r, encoding="utf-8", newline=""))


def _r2(method, key, body=None):
    acct, tok = os.environ.get("CLOUDFLARE_ACCOUNT_ID", ""), os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not (acct and tok):
        raise SystemExit("CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN absent")
    url = f"https://api.cloudflare.com/client/v4/accounts/{acct}/r2/buckets/field-relay-data/objects/{key}"
    headers = {"Authorization": f"Bearer {tok}"}
    if body is not None:
        headers.update({"Content-Type": "application/json", "Content-Length": str(len(body))})
    with urllib.request.urlopen(urllib.request.Request(url, data=body, method=method, headers=headers), timeout=120) as r:
        return r.status, r.read()


def main():
    now = datetime.now(timezone.utc)
    updated = now.isoformat(timespec="seconds")
    year = now.year if now.month >= 8 else now.year - 1   # the relay's nflYear, same August turnover
    report = {"builder": "build-bdb-frames", "generated": updated, "week": WEEK, "ceilingBytes": CEILING_BYTES}

    r, rd = _rows(PFX + "games.csv")
    with r:
        season, week_of = season_of(rd)
    r, rd = _rows(PFX + "plays.csv")
    with r:
        plays = plays_index(rd, week_of, WEEK)
    players = {}
    r, rd = _rows(PFX + "players.csv")
    with r:
        for row in rd:
            players[row["nflId"]] = (row.get("displayName"), row.get("position") or None)
    week = Week(plays, players)
    r, rd = _rows(PFX + f"tracking_week_{WEEK}.csv")
    with r:
        for row in rd:
            week.add(row)
    report.update(season=season, tracking_rows=week.rows, plays_in_week=len(plays),
                  frames={ev: sum(1 for k in week.frames if k[2] == ev) for ev in EVENTS})

    conv = convention_check(week)
    report["convention"] = conv
    report["convention_example"] = example_play(week)
    unresolved = sum(1 for rows in week.frames.values() for x in rows if x["side"] is None or x["pos"] is None)
    report["rows_with_unresolved_side_or_pos"] = unresolved

    variants = {}
    for v in ("a", "b"):
        best, n = fit(week, season, WEEK, v, updated)
        full = compact(envelope(season, WEEK, v, [item(week, k) for k in keep(week, v)], {"gamesKept": "all"}, updated))
        variants[v] = {"frames": len(keep(week, v)), "bytes_whole_week": len(full), "games_under_ceiling": n,
                       "bytes_kept": len(best[0]) if best else None}
        variants[v]["_best"] = best
    chosen = "b" if variants["b"]["games_under_ceiling"] > variants["a"]["games_under_ceiling"] else "a"
    report["variants"] = {k: {kk: vv for kk, vv in v.items() if kk != "_best"} for k, v in variants.items()}
    report["chosen"] = chosen
    report["chosen_reason"] = ("(b) keeps more whole games under the ceiling; no written metric reads a snap "
                               "frame on a play that is neither a dropback nor a pass" if chosen == "b" else
                               "(b) keeps no more whole games than (a), so the spec's literal order holds")

    def finish(code, why=None):
        if why:
            report["failure"] = why
        os.makedirs("outbox", exist_ok=True)
        with open("outbox/bdb-event-frames-build-latest.json", "w") as fh:
            json.dump(report, fh, indent=2, default=str)
            fh.write("\n")
        print(json.dumps({k: report.get(k) for k in ("season", "chosen", "variants", "failure")}, indent=2, default=str))
        sys.exit(code)

    if not conv["declared_holds"]:
        finish(1, "the declared coordinate convention is not supported by this week's plays")
    if unresolved:
        finish(1, f"{unresolved} emitted rows have no side or no position")
    best = variants[chosen]["_best"]
    if not best or variants[chosen]["games_under_ceiling"] == 0:
        finish(1, "not even one whole game fits under the ceiling")
    body, scope = best
    if len(body) > CEILING_BYTES:
        finish(1, f"artifact is {len(body)} bytes, over {CEILING_BYTES}")
    report["artifact"] = {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
                          "r2_key": f"nfl/{year}/{FILE}", "scope": scope,
                          "pass_forward_coverage": coverage(week, scope)}

    key = f"nfl/{year}/{FILE}"
    try:
        status, resp = _r2("PUT", key, body)
        ok = status == 200 and json.loads(resp or b"{}").get("success", False)
    except Exception as e:  # recorded with its type, then a failing exit: no swallowed upload
        finish(1, f"R2 upload raised {type(e).__name__}: {str(e)[:200]}")
    if not ok:
        finish(1, f"R2 upload answered {status}")
    try:
        status, back = _r2("GET", key)
    except Exception as e:
        finish(1, f"R2 read-back raised {type(e).__name__}: {str(e)[:200]}")
    report["artifact"]["r2_readback"] = {"status": status, "bytes": len(back),
                                         "sha256_matches": hashlib.sha256(back).hexdigest() == report["artifact"]["sha256"]}
    if not report["artifact"]["r2_readback"]["sha256_matches"]:
        finish(1, "R2 read-back differs from the bytes uploaded")
    os.makedirs("outbox/nfl", exist_ok=True)
    with open(f"outbox/nfl/{FILE}", "wb") as fh:
        fh.write(body)
    finish(0)


# ── self-test ──────────────────────────────────────────────────────────────

def self_test():
    fails = []
    def check(name, cond):
        print(("PASS  " if cond else "FAIL  ") + name)
        if not cond:
            fails.append(name)

    try:
        season_of([{"gameId": "1", "week": "2", "season": ""}])
        check("a game with no season fails the build", False)
    except ValueError:
        check("a game with no season fails the build", True)
    try:
        season_of([{"gameId": "1", "week": "2", "season": "2022"}, {"gameId": "2", "week": "2", "season": "2023"}])
        check("two seasons fail the build", False)
    except ValueError:
        check("two seasons fail the build", True)
    try:
        season_of([{"gameId": "1", "week": "2", "season": "2022"}, {"gameId": "2", "week": "2", "season": ""}])
        check("one game with no season fails the build even when others have one", False)
    except ValueError:
        check("one game with no season fails the build even when others have one", True)
    s, wk = season_of([{"gameId": "1", "week": "2", "season": "2022"}, {"gameId": "2", "week": "3", "season": "2022"}])
    check("one season is read, never defaulted", s == 2022 and wk == {"1": 2, "2": 3})

    check("left plays rotate 180 degrees", standardise(100.0, 10.0, "left") == (20.0, 43.3))
    check("right plays are unchanged", standardise(100.0, 10.0, "right") == (100.0, 10.0))
    try:
        standardise(1.0, 1.0, "up")
        check("an unknown direction fails", False)
    except ValueError:
        check("an unknown direction fails", True)

    plays = plays_index([
        {"gameId": "1", "playId": "1", "possessionTeam": "A", "defensiveTeam": "B", "isDropback": "TRUE", "passLocationType": "OUTSIDE_LEFT"},
        {"gameId": "1", "playId": "2", "possessionTeam": "B", "defensiveTeam": "A", "isDropback": "FALSE", "passLocationType": ""},
        {"gameId": "2", "playId": "1", "possessionTeam": "C", "defensiveTeam": "D", "isDropback": "t", "passLocationType": "OUTSIDE_RIGHT"},
        {"gameId": "1", "playId": "3", "possessionTeam": "A", "defensiveTeam": "B", "isDropback": "FALSE", "passLocationType": ""},
        {"gameId": "9", "playId": "1", "possessionTeam": "C", "defensiveTeam": "D", "isDropback": "TRUE", "passLocationType": ""},
    ], {"1": 2, "2": 2, "9": 3}, 2)
    check("plays of other weeks are left out; 't' is a dropback", set(plays) == {("1", "1"), ("1", "2"), ("2", "1"), ("1", "3")}
          and plays[("2", "1")]["dropback"])

    players = {"10": ("Q", "QB"), "20": ("C", "CB"), "30": ("W", "WR"), "40": ("L", "LB")}
    w = Week(plays, players)
    def row(g, p, nid, club, ev, x, y, d):
        return {"gameId": g, "playId": p, "nflId": nid, "club": club, "event": ev, "x": str(x), "y": str(y),
                "playDirection": d}
    try:
        # play (1,1): offense A moves LEFT; at the snap A is at higher raw x than B
        w.add(row("1", "1", "10", "A", "ball_snap", 70, 30, "left"))
        w.add(row("1", "1", "20", "B", "ball_snap", 65, 30, "left"))
        w.add(row("1", "1", "NA", "football", "ball_snap", 69, 30, "left"))
        w.add(row("1", "1", "10", "A", "pass_forward", 75, 30, "left"))
        w.add(row("1", "1", "20", "B", "pass_forward", 66, 31, "left"))
        # the pass goes to the offense's left: raw y is LOW on a left play
        w.add(row("1", "1", "NA", "football", "pass_arrived", 55, 10, "left"))
        w.add(row("1", "1", "10", "A", "pass_arrived", 55, 10, "left"))
        # play (1,2): a run (not a dropback) moving right
        w.add(row("1", "2", "30", "B", "ball_snap", 40, 20, "right"))
        w.add(row("1", "2", "40", "A", "ball_snap", 45, 20, "right"))
        # play (2,1): moving right, pass to the offense's right: raw y LOW on a right play
        w.add(row("2", "1", "10", "C", "ball_snap", 30, 26, "right"))
        w.add(row("2", "1", "20", "D", "ball_snap", 35, 26, "right"))
        w.add(row("2", "1", "10", "C", "pass_forward", 25, 26, "right"))
        w.add(row("2", "1", "20", "D", "pass_forward", 33, 26, "right"))
        w.add(row("2", "1", "NA", "football", "pass_arrived", 45, 8, "right"))
        w.add(row("2", "1", "99", "C", "tackle", 1, 1, "right"))
        # play (1,3): a trick pass that is NOT a dropback; its snap stays under (b)
        w.add(row("1", "3", "30", "A", "ball_snap", 60, 20, "right"))
        w.add(row("1", "3", "40", "B", "ball_snap", 65, 20, "right"))
        w.add(row("1", "3", "30", "A", "pass_forward", 58, 20, "right"))
        fed = True
    except Exception as e:
        print(f"FAIL  the week feed runs on rows with a football ({type(e).__name__})")
        fails.append("feed")
        print(f"\n{len(fails)} failed")
        return 1


    check("only named events are kept; the ball never becomes a player row",
          set(w.frames) == {("1", "1", "ball_snap"), ("1", "1", "pass_forward"), ("1", "2", "ball_snap"),
                            ("2", "1", "ball_snap"), ("2", "1", "pass_forward"),
                            ("1", "3", "ball_snap"), ("1", "3", "pass_forward")}
          and all(r["nflId"] != "NA" for rows in w.frames.values() for r in rows))
    snap = {r["nflId"]: r for r in w.frames[("1", "1", "ball_snap")]}
    check("rows carry side, pos and the declared frame", snap[10]["side"] == "offense" and snap[10]["pos"] == "QB"
          and (snap[10]["x"], snap[10]["y"]) == (50.0, 23.3) and snap[20]["side"] == "defense")
    check("the football at pass_arrived is kept raw for the y check", w.ball_arrived[("1", "1")] == (55.0, 10.0))

    conv = convention_check(w)
    ag = conv["agreement"]
    dec = ag["offense-right (declared: rotate left plays 180 degrees)"]
    check("declared frame: offense behind defense at the snap on left and right plays",
          dec["x_snap"]["left"] == {"agree": 1, "of": 1} and dec["x_snap"]["right"] == {"agree": 3, "of": 3})
    check("declared frame: the pass lands on the side named, both directions",
          dec["y_pass"]["left"] == {"agree": 1, "of": 1} and dec["y_pass"]["right"] == {"agree": 1, "of": 1})
    check("raw frame fails x on the left play", ag["raw (source frame, no transform)"]["x_snap"]["left"]["agree"] == 0)
    check("mirror-x frame fails y on the left play",
          ag["mirror x only (flip x on left plays, keep y)"]["y_pass"]["left"]["agree"] == 0)
    check("declared holds when every split agrees", conv["declared_holds"] is True)
    bad = Week(plays, players)
    bad.frames, bad.direction, bad.ball_arrived = w.frames, dict(w.direction), {("1", "1"): (55.0, 50.0)}
    check("a pass landing on the wrong side breaks the declaration", convention_check(bad)["declared_holds"] is False)
    half = Week(plays, players)
    half.frames, half.direction = w.frames, dict(w.direction)
    half.ball_arrived = {("1", "1"): (55.0, 10.0), ("2", "1"): (45.0, 8.0), ("1", "3"): (50.0, 50.0)}
    half.plays = dict(plays); half.plays[("1", "3")] = dict(plays[("1", "3")], passLocation="OUTSIDE_RIGHT")
    check("agreement of 1 in 2 on one split is below the threshold, so the declaration fails",
          convention_check(half)["declared_holds"] is False)
    ex = example_play(w)
    check("the worked example is the left play, with raw and declared numbers",
          ex["playId"] == 1 and ex["snap_mean_x"]["raw"]["offense"] > ex["snap_mean_x"]["raw"]["defense"]
          and ex["snap_mean_x"]["declared"]["offense"] < ex["snap_mean_x"]["declared"]["defense"])

    ka, kb = keep(w, "a"), keep(w, "b")
    check("variant a keeps every snap", ("1", "2", "ball_snap") in ka and len(ka) == 7)
    check("variant b drops the snap of a run that has no pass", ("1", "2", "ball_snap") not in kb and len(kb) == 6)
    check("variant b keeps the snap of a pass play that is not a dropback", ("1", "3", "ball_snap") in kb)
    check("emitted items are ordered by game, play, event", [(k[0], k[1], k[2]) for k in ka][:2]
          == [("1", "1", "ball_snap"), ("1", "1", "pass_forward")])
    it = item(w, ("1", "1", "ball_snap"))
    check("emitted rows never carry the raw coordinates", all("_raw" not in r for r in it["players"]))

    env = envelope(2022, 2, "b", [], {"gamesKept": 0}, "t")
    check("envelope carries season, sourceDataset, week, events and the convention, never targetYear",
          env["season"] == 2022 and env["sourceDataset"] == SOURCE_DATASET and env["week"] == 2
          and env["events"] == ["ball_snap", "pass_forward"] and env["coordinateConvention"]["frame"] == "offense-right"
          and "targetYear" not in env)
    whole = len(compact(envelope(2022, 2, "a", [item(w, k) for k in ka], {"gamesKept": "all"}, "t")))
    best, n = fit(w, 2022, 2, "a", "t", ceiling=whole + 500)
    check("everything fits under a generous ceiling", n == 2 and len(best[0]) <= whole + 500)
    one = len(compact(envelope(2022, 2, "a", [item(w, k) for k in ka if k[0] == "1"],
                               {"gamesKept": 1, "gamesInWeek": 2, "gameIds": [1], "teamsKept": 2,
                                "ceilingBytes": 0, "cut": "whole games in gameId order; 1 of 2 dropped"}, "t")))
    best, n = fit(w, 2022, 2, "a", "t", ceiling=one + 40)
    check("a ceiling between one and two games keeps exactly the first game", n == 1 and best[1]["gameIds"] == [1])
    best, n = fit(w, 2022, 2, "a", "t", ceiling=one - 60)
    check("a ceiling below one game keeps no game but still writes the envelope",
          n == 0 and best is not None and best[1]["gamesKept"] == 0 and len(best[0]) <= one - 60)
    best, n = fit(w, 2022, 2, "a", "t", ceiling=len(compact(envelope(2022, 2, "a", [], {}, "t"))) - 1)
    check("a ceiling below the bare envelope fits nothing at all", best is None)
    exact = None
    for cand in range(one - 60, one + 60):
        sc = {"gamesKept": 1, "gamesInWeek": 2, "gameIds": [1], "teamsKept": 2, "ceilingBytes": cand,
              "cut": "whole games in gameId order; 1 of 2 dropped"}
        if len(compact(envelope(2022, 2, "a", [item(w, k) for k in ka if k[0] == "1"], sc, "t"))) == cand:
            exact = cand
    best, n = fit(w, 2022, 2, "a", "t", ceiling=exact) if exact else (None, -1)
    check("an artifact exactly at the ceiling is inside it", exact is not None and n == 1 and len(best[0]) == exact)
    check("pass_forward coverage counts dropbacks in kept games only",
          coverage(w, {"gameIds": [1, 2]}) == {"dropback_plays": 2, "dropback_plays_with_pass_forward": 2, "share": 1.0}
          and coverage(w, {"gameIds": [2]})["dropback_plays"] == 1)

    print(f"\n{len(fails)} failed")
    return 1 if fails else 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    main()
