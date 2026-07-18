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

import { isNationalGame } from './utils/national-game.js';
globalThis.isNationalGame = isNationalGame;

import { wxDescription, wxIcon, wxAlert, weatherDramaModifier } from './utils/weather.js';
globalThis.wxDescription = wxDescription;
globalThis.wxIcon = wxIcon;
globalThis.wxAlert = wxAlert;
globalThis.weatherDramaModifier = weatherDramaModifier;

import { isVolatileMatchup, _upsetDogPrice } from './utils/odds.js';
globalThis.isVolatileMatchup = isVolatileMatchup;
globalThis._upsetDogPrice = _upsetDogPrice;

import { _chipsHTML } from './utils/chips.js';
globalThis._chipsHTML = _chipsHTML;

import { urlBase64ToUint8Array } from './utils/push.js';
globalThis.urlBase64ToUint8Array = urlBase64ToUint8Array;

import { _raiQualityBar } from './utils/rai.js';
globalThis._raiQualityBar = _raiQualityBar;

import { _srSitToYL100 } from './utils/nfl.js';
globalThis._srSitToYL100 = _srSitToYL100;

import { _otwSigTierRank } from './utils/otw.js';
globalThis._otwSigTierRank = _otwSigTierRank;

import { WX_DIR, cardinalDir } from './utils/wind.js';
globalThis.WX_DIR = WX_DIR;
globalThis.cardinalDir = cardinalDir;

import { VENUE_COORDS, isOutdoorVenue, getVenueCoords } from './utils/venues.js';
globalThis.VENUE_COORDS = VENUE_COORDS;
globalThis.isOutdoorVenue = isOutdoorVenue;
globalThis.getVenueCoords = getVenueCoords;

import { isFeaturedTierGame } from './utils/tier-game.js';
globalThis.isFeaturedTierGame = isFeaturedTierGame;

import './legacy/field.js';
