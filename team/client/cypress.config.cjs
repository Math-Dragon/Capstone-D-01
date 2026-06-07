const { execSync } = require('child_process');
const lighthouseLib = require('@cypress-audit/lighthouse');
const { lighthouse, prepareAudit } = lighthouseLib;

module.exports = {
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        prepareAudit(launchOptions);
      });
      on('task', {
        lighthouse: lighthouse(),
        seedUsers() {
          execSync('node ../server/seeds/lighthouse-test-user.js', { env: { ...process.env, NODE_ENV: 'test' } });
          return null;
        },
        cleanupUsers() {
          execSync('node ../server/seeds/lighthouse-test-user.js cleanup', { env: { ...process.env, NODE_ENV: 'test' } });
          return null;
        },
      });
    },
  },
};
