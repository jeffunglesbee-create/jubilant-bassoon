// wdio.desktop-safari.conf.js — WDIO config for desktop Safari audit.
//
// Runtime entry point is tests/desktop-safari-viewport.js, which uses the
// standalone `remote()` API. This config mirrors wdio.desktop-chrome.conf.js
// for the @wdio/cli runner.
//
// To run via the cli runner (macOS only, safaridriver must be enabled):
//   sudo safaridriver --enable
//   npx wdio run wdio.desktop-safari.conf.js

exports.config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4444,
  path: '/',
  specs: ['./tests/desktop-safari-viewport.js'],
  exclude: [],
  maxInstances: 1,
  capabilities: [{
    browserName: 'safari',
    platformName: 'mac',
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
