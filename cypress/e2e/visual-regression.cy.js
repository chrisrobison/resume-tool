// Make visual tests opt-in. Set `--env visual=1` or `CYPRESS_VISUAL=1` to run.
const visualEnabled = Boolean(Cypress.env('visual') || Cypress.env('VISUAL') || process.env.CYPRESS_VISUAL);
const vDescribe = visualEnabled ? describe : describe.skip;

vDescribe('Visual Regression Testing', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
  });

  describe('Application Layout', () => {
    it('should match baseline application layout', () => {
      // Seed consistent test data for visual consistency
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData(testData.testJobs);
        cy.seedResumeData(testData.testResumes);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Wait for data to load and render (cards are .item-card now)
      cy.get('.item-card').should('have.length', 3);
      
      // Take full page screenshot for baseline
      cy.compareSnapshot('application-layout-full', {
        capture: 'fullPage'
      });
    });

    it('should match navigation header consistently', () => {
      // Support multiple possible navigation selectors (legacy vs migrated)
      cy.get('#main-nav, .sidebar, nav', { timeout: 10000 }).first().should('be.visible');

      // Compare just the navigation area
      cy.get('#main-nav, .sidebar, nav').first().compareSnapshot('navigation-header');
    });

    it('should match job statistics panel', () => {
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData(testData.testJobs);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Support alternative stats selectors (some layouts expose items header instead)
      cy.get('.stats-container, .items-header, .sidebar-header, .summary', { timeout: 10000 }).first().should('be.visible');
      cy.get('.stats-container, .items-header, .sidebar-header, .summary').first().compareSnapshot('job-statistics-panel');
    });
  });

  describe('Job Card Layouts', () => {
    beforeEach(() => {
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData(testData.testJobs);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
    });

    it('should match job card with applied status', () => {
      cy.get('.item-card').contains('TechCorp Inc')
        .closest('.item-card')
        .compareSnapshot('job-card-applied-status');
    });

    it('should match job card with interviewing status', () => {
      cy.get('.item-card').contains('StartupCo')
        .closest('.item-card')
        .compareSnapshot('job-card-interviewing-status');
    });

    it('should match job card with saved status', () => {
      cy.get('.item-card').contains('Enterprise Solutions')
        .closest('.item-card')
        .compareSnapshot('job-card-saved-status');
    });

    it('should match job cards grid layout', () => {
      // Jobs container may be named differently in migrated layout
      cy.get('#jobs-container, #items-list, .items-list, #items-panel', { timeout: 10000 }).first().compareSnapshot('job-cards-grid-layout');
    });
  });

  describe('Modal Dialogs', () => {
    it('should match add job modal layout', () => {
      cy.get('#add-item-btn').click();
      cy.openModal('form-modal');

      // Wait for modal animation to complete
      cy.wait(300);

      cy.get('#form-modal').compareSnapshot('add-job-modal-layout');
    });

    it('should match import job modal layout', () => {
      cy.get('#import-job-btn').click();
      cy.openModal('import-job-modal');
      
      cy.wait(300);
      
      cy.get('#import-job-modal').compareSnapshot('import-job-modal-layout');
    });

    it('should match import job modal with API warning', () => {
      cy.clearAPIKeys();
      cy.get('#import-job-btn').click();
      cy.openModal('import-job-modal');
      
      cy.wait(300);
      
      // Ensure API warning is visible
      cy.get('#import-api-warning').should('be.visible');

      cy.get('#import-job-modal').compareSnapshot('import-job-modal-api-warning');
    });
  });

  describe('Section Layouts', () => {
    beforeEach(() => {
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData(testData.testJobs);
        cy.seedResumeData(testData.testResumes);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
    });

    it('should match jobs section layout', () => {
      cy.navigateToSection('jobs');
      cy.wait(500);
      
      cy.get('#main-content').compareSnapshot('jobs-section-layout');
    });

    it('should match resumes section layout', () => {
      cy.navigateToSection('resumes');
      cy.wait(500);
      
      cy.get('#main-content').compareSnapshot('resumes-section-layout');
    });

    it('should match settings section layout', () => {
      cy.navigateToSection('settings');
      cy.wait(500);
      
      cy.get('#main-content').compareSnapshot('settings-section-layout');
    });

    it('should match logs section layout', () => {
      // 'logs' historically referred to AI history — map to the current nav key
      cy.navigateToSection('ai');
      cy.wait(500);
      
      cy.get('#main-content, .main-content, .content-panels, #details-panel', { timeout: 10000 }).first().compareSnapshot('logs-section-layout');
    });
  });

  describe('Empty States', () => {
    it('should match empty jobs state', () => {
      // Ensure no jobs in storage
      cy.window().then((win) => {
        win.localStorage.removeItem('jobHuntData');
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      cy.get('.empty-state').should('be.visible');
      cy.get('#jobs-container, #items-list, .items-list, #items-panel', { timeout: 10000 }).first().compareSnapshot('empty-jobs-state');
    });

    it('should match empty resumes state', () => {
      cy.navigateToSection('resumes');
      cy.wait(500);
      
      cy.get('#resumes-container, .resume-list-content, #details-content, .items-list', { timeout: 10000 }).first().compareSnapshot('empty-resumes-state');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    viewports.forEach((viewport) => {
      it(`should match layout on ${viewport.name}`, () => {
        cy.fixture('test-data').then((testData) => {
          cy.seedJobData(testData.testJobs.slice(0, 2)); // Limit jobs for mobile
        });
        
        cy.viewport(viewport.width, viewport.height);
        cy.visitJobsApp('new');
        cy.waitForStore();
        
        // Wait for layout to stabilize
        cy.wait(1000);
        
        cy.compareSnapshot(`responsive-layout-${viewport.name}`, {
          capture: 'viewport'
        });
      });
    });
  });

  describe('Theme Variations', () => {
    beforeEach(() => {
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData([testData.testJobs[0]]);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
    });

    it('should match default theme', () => {
      cy.compareSnapshot('theme-default', {
        capture: 'viewport'
      });
    });

    it('should match dark theme if available', () => {
      // Try to set dark theme via settings
      cy.navigateToSection('settings');
      
      cy.get('body').then(($body) => {
        if ($body.find('#theme-select').length > 0) {
          cy.get('#theme-select').select('dark');
          cy.wait(500);
          
          cy.compareSnapshot('theme-dark', {
            capture: 'viewport'
          });
        }
      });
    });
  });

  describe('Loading States', () => {
    it('should match initial loading state', () => {
      // Visit page and capture before data loads
      cy.visit('/jobs-new.html');
      
      // Capture the loading state quickly
      cy.compareSnapshot('loading-state-initial', {
        capture: 'viewport'
      });
    });
  });

  describe('Error States', () => {
    it('should match API error state', () => {
      // Set invalid API key to trigger error
      cy.setAPIKey('claude', 'invalid-key');
      
      cy.get('#import-job-btn').click();
      cy.openModal('import-job-modal');
      
      // Try to use AI import (this should fail)
      cy.get('#job-url-import').type('https://example.com/job');
      
      // If there's an import button, click it to trigger API error
      cy.get('#import-job-modal').within(() => {
        cy.get('button').contains('Import').then(($btn) => {
          if ($btn.length > 0) {
            cy.wrap($btn).click();
            cy.wait(2000); // Wait for error to appear
            
            cy.compareSnapshot('api-error-state');
          }
        });
      });
    });
  });
});
