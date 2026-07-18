// Entry point for esbuild. Imports the full legacy script as a single module.
// Individual modules will be extracted from src/legacy/field.js over time.

// Phase 3 extracted modules — imported here (not in field.js) so sync-source.mjs
// can copy field.js verbatim into the non-module <script> tag without import syntax.
// Exposed on globalThis so field.js call sites resolve them as globals in the IIFE.
import { fmtGolfToPar } from './utils/golf-format.js';
globalThis.fmtGolfToPar = fmtGolfToPar;

import { fieldTierRank, fieldTierLabel } from './utils/tier.js';
globalThis.fieldTierRank = fieldTierRank;
globalThis.fieldTierLabel = fieldTierLabel;

import { inferSport, golfRoundLabel } from './utils/sport-format.js';
globalThis.inferSport = inferSport;
globalThis.golfRoundLabel = golfRoundLabel;

import { fmtESPNClock } from './utils/espn-clock.js';
globalThis.fmtESPNClock = fmtESPNClock;

import { _normWCName } from './utils/wc-name.js';
globalThis._normWCName = _normWCName;

import './legacy/field.js';
