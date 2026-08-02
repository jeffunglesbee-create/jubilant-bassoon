#!/usr/bin/env python3
# FIELD — NFL Drama Profile Builder
# Source of record: Drive doc 1aPuvlvLNmv1libMqkUIRrQWXBpUSzLRC
# ("FIELD — Drama Profile Builder: Full Automation," May 20 2026).
# Computes a per-team drama_index (32-78 scale) from real nflverse
# play-by-play WPA. Reads DRAMA_SEASONS env var (set by GitHub Actions
# for overrides). Outputs team_drama_profiles_nfl.json (read by
# inject_drama_profiles.py). Prints top-10 ranking for CI log review.

import json, sys, os
import numpy as np
import pandas as pd

try:
    import nfl_data_py as nfl
except ImportError:
    print("ERROR: pip install nfl_data_py pandas numpy")
    sys.exit(1)

_env_seasons = os.environ.get('DRAMA_SEASONS', '')
SEASONS = [int(s.strip()) for s in _env_seasons.split(',') if s.strip()] or [2022, 2023, 2024]
print(f"Seasons: {SEASONS}")

RECENCY_WEIGHTS = {s: w for s, w in zip(SEASONS, [0.20, 0.35, 0.45][:len(SEASONS)])}
CLOSE_MARGIN_THRESHOLD = 8
LATE_SECONDS = 120
OUTPUT_MIN = 32
OUTPUT_MAX = 78
METRIC_WEIGHTS = {
    'late_wpa_movement': 0.40,
    'total_wpa_movement': 0.25,
    'close_game_rate': 0.25,
    'lead_change_rate': 0.10,
}

COLUMNS = [
    'game_id', 'season', 'home_team', 'away_team',
    'posteam', 'defteam', 'play_type',
    'game_seconds_remaining', 'qtr',
    'wp', 'wpa', 'epa', 'score_differential',
]

print(f"Loading nflverse PBP data for seasons {SEASONS}...")
pbp_raw = nfl.import_pbp_data(SEASONS, columns=COLUMNS)
pbp = pbp_raw[pbp_raw['play_type'].isin([
    'pass', 'run', 'no_play', 'field_goal', 'punt', 'qb_kneel', 'qb_spike'
])].copy()
pbp = pbp.dropna(subset=['wpa', 'game_seconds_remaining'])
print(f"  {len(pbp_raw):,} raw rows -> {len(pbp):,} after filtering")
print(f"  {pbp['game_id'].nunique():,} games")

def compute_game_drama(group):
    g = group.sort_values('game_seconds_remaining', ascending=False)
    wpa = g['wpa'].fillna(0)
    total_wpa_movement = wpa.abs().sum()
    late_plays = g[g['game_seconds_remaining'] <= LATE_SECONDS]
    late_wpa_movement = late_plays['wpa'].fillna(0).abs().sum()
    near_end = g[
        (g['game_seconds_remaining'] <= LATE_SECONDS + 30) &
        (g['game_seconds_remaining'] > 0)
    ]
    close_at_end = 0
    if not near_end.empty:
        margin = near_end['score_differential'].abs().iloc[-1]
        close_at_end = int(margin <= CLOSE_MARGIN_THRESHOLD)
    diff = g['score_differential'].fillna(0)
    lead_changes = int(((diff.shift(1) * diff) < 0).sum())
    return pd.Series({
        'home_team': g['home_team'].iloc[0],
        'away_team': g['away_team'].iloc[0],
        'season': int(g['season'].iloc[0]),
        'total_wpa_movement': round(float(total_wpa_movement), 4),
        'late_wpa_movement': round(float(late_wpa_movement), 4),
        'close_at_end': close_at_end,
        'lead_changes': lead_changes,
    })

print("\nComputing game-level drama metrics (~30-60s)...")
games = pbp.groupby('game_id').apply(compute_game_drama).reset_index()
games = games.drop(columns=['game_id'])
print(f"  {len(games):,} games processed")

home = games[['season','home_team','total_wpa_movement','late_wpa_movement',
    'close_at_end','lead_changes']].rename(columns={'home_team': 'team'})
away = games[['season','away_team','total_wpa_movement','late_wpa_movement',
    'close_at_end','lead_changes']].rename(columns={'away_team': 'team'})
team_games = pd.concat([home, away], ignore_index=True)
team_games['weight'] = team_games['season'].map(RECENCY_WEIGHTS)

def weighted_avg(df, col):
    return np.average(df[col], weights=df['weight'])

records = []
for team, group in team_games.groupby('team'):
    records.append({
        'team': team,
        'games': len(group),
        'total_wpa_movement': weighted_avg(group, 'total_wpa_movement'),
        'late_wpa_movement': weighted_avg(group, 'late_wpa_movement'),
        'close_game_rate': weighted_avg(group, 'close_at_end'),
        'lead_change_rate': weighted_avg(group, 'lead_changes'),
    })
profiles = pd.DataFrame(records)

for col in METRIC_WEIGHTS.keys():
    mean = profiles[col].mean()
    std = profiles[col].std()
    profiles[f'{col}_z'] = (profiles[col] - mean) / (std + 1e-9)

profiles['drama_composite'] = sum(
    profiles[f'{col}_z'] * weight
    for col, weight in METRIC_WEIGHTS.items()
)
c_min = profiles['drama_composite'].min()
c_max = profiles['drama_composite'].max()
profiles['drama_index'] = (
    (profiles['drama_composite'] - c_min) / (c_max - c_min)
    * (OUTPUT_MAX - OUTPUT_MIN) + OUTPUT_MIN
).round(1)

drama_dict = dict(zip(profiles['team'].str.upper(), profiles['drama_index']))

with open('team_drama_profiles_nfl.json', 'w') as f:
    json.dump(drama_dict, f, sort_keys=True, indent=2)

ranked = sorted(drama_dict.items(), key=lambda x: x[1], reverse=True)
print("\n=== TOP 10 ===")
for team, score in ranked[:10]:
    print(f"  {team}: {score}")
print("\n=== REFERENCE POINTS ===")
for team in ['KC', 'SF', 'BUF', 'DAL', 'NYG', 'CLE']:
    print(f"  {team}: {drama_dict.get(team, 'N/A')}")
print("\n✓ Saved: team_drama_profiles_nfl.json")
