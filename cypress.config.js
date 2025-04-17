const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Environment variables for testing
      testUserEmail: 'test@example.com',
      testUserPassword: 'testPassword123',
      adminUserEmail: 'admin@example.com',
      adminUserPassword: 'adminPassword123',
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
  },
});
