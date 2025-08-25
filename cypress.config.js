const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,
    screenshotOnRunFailure: true,
    video: true,
    videoCompression: 32,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    watchForFileChanges: false,
    chromeWebSecurity: false,
    
    // Test file patterns
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    
    // Screenshot and video settings
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    
    // Test results - using mochawesome for HTML reports
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/reports',
      overwrite: false,
      html: false,
      json: true,
      timestamp: 'mmddyyyy_HHMMss'
    },

    setupNodeEvents(on, config) {
      // Custom tasks only (removed visual regression plugins for now)
      
      // Custom tasks
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        clearLocalStorage() {
          // Clear localStorage for clean test runs
          return null;
        },
        
        seedTestData() {
          // Seed test data for consistent testing
          return {
            jobs: [
              {
                id: 'test-job-1',
                company: 'Test Company',
                position: 'Software Engineer',
                status: 'applied',
                location: 'Remote',
                dateCreated: new Date().toISOString()
              }
            ],
            resumes: [
              {
                id: 'test-resume-1',
                basics: {
                  name: 'Test User',
                  email: 'test@example.com',
                  phone: '555-0123',
                  summary: 'Experienced software developer'
                }
              }
            ]
          };
        }
      });

      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'vanilla',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.{cy,spec}.{js,jsx,ts,tsx}',
  },
})
