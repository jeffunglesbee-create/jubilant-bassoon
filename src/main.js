// Entry point for esbuild. Imports the full legacy script as a single module.
// Individual modules will be extracted from src/legacy/field.js over time.
// Phase 3+: utils are imported directly in field.js; no globalThis bridge needed.

import './legacy/field.js';
