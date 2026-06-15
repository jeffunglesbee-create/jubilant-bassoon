// wdio.desktop-chrome.conf.js — WDIO config for desktop Chrome audit.
//
// The runtime path is tests/desktop-chrome-viewport.js, which uses the
// standalone `remote()` API (no @wdio/cli runner needed). This config is
// the @wdio/cli-compatible entry point in case the project switches to the
// `wdio` test runner later — mirrors the mobile audit pattern.
//
// To run via the cli runner:
//   npx wdio run wdio.desktop-chrome.conf.js

exports.config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 9515,
  path: '/',
  specs: ['./tests/desktop-chrome-viewport.js'],
  exclude: [],
  maxInstances: 1,
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1366,768',
      ],
    },
    'goog:loggingPrefs': { browser: 'ALL' },
  }],
  logLevel: 'warn',
  bail: 0,
  baseUrl: 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt',
  waitforTimeout: 10000,
  connectionRetryTimeout: 60000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 60000 },
};
