describe('Component Functionality Tests', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
  });

  describe('Job Manager Component', () => {
    it('should create a new job successfully', () => {
      cy.get('#add-job-btn').should('be.visible').click();
      cy.openModal('job-modal');
      
      // Fill job form
      cy.fixture('test-data').then((testData) => {
        cy.fillJobForm(testData.formTestData.validJob);
      });
      
      cy.takeNamedScreenshot('job-manager-create-job');
      
      // Save job
      cy.get('#job-modal').within(() => {
        cy.get('button').contains('Save').click();
      });
      
      // Verify job appears in list
      cy.get('.job-card').should('contain.text', 'Test Company');
      cy.takeNamedScreenshot('job-manager-job-created');
    });

    it('should update job status', () => {
      // Seed test data first
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData([testData.testJobs[0]]);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Click on job to open details
      cy.get('.job-card').first().click();
      
      // Change status
      cy.get('.status-dropdown').select('interviewing');
      cy.takeNamedScreenshot('job-manager-status-change');
      
      // Verify status updated
      cy.get('.job-status').should('contain.text', 'Interviewing');
    });

    it('should filter jobs by status', () => {
      // Seed multiple jobs with different statuses
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData(testData.testJobs);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Test different filter options
      cy.get('#status-filter').select('applied');
      cy.get('.job-card').should('have.length', 1);
      cy.takeNamedScreenshot('job-manager-filter-applied');
      
      cy.get('#status-filter').select('interviewing');
      cy.get('.job-card').should('have.length', 1);
      cy.takeNamedScreenshot('job-manager-filter-interviewing');
      
      cy.get('#status-filter').select('all');
      cy.get('.job-card').should('have.length.greaterThan', 1);
      cy.takeNamedScreenshot('job-manager-filter-all');
    });
  });

  describe('Resume Editor Component', () => {
    beforeEach(() => {
      cy.navigateToSection('resumes');
    });

    it('should create a new resume', () => {
      cy.get('#add-resume-btn').should('be.visible').click();
      
      // Wait for resume editor to load
      cy.waitForComponent('resume-editor-migrated');
      
      // Fill basic information
      cy.get('#basics-name').clear().type('Test User');
      cy.get('#basics-email').clear().type('test@example.com');
      cy.get('#basics-phone').clear().type('555-0123');
      cy.get('#basics-summary').clear().type('Experienced software developer');
      
      cy.takeNamedScreenshot('resume-editor-basic-info');
      
      // Save resume
      cy.get('#save-resume-btn').click();
      
      // Verify resume was saved
      cy.get('.resume-card').should('contain.text', 'Test User');
      cy.takeNamedScreenshot('resume-editor-resume-saved');
    });

    it('should add work experience', () => {
      // Create a basic resume first
      cy.fixture('test-data').then((testData) => {
        cy.seedResumeData([testData.testResumes[0]]);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      cy.navigateToSection('resumes');
      
      // Open resume for editing
      cy.get('.resume-card').first().click();
      cy.waitForComponent('resume-editor-migrated');
      
      // Navigate to work section
      cy.get('[data-section-tab="work"]').click();
      
      // Add work experience
      cy.get('#add-work-btn').click();
      cy.get('#work-company-0').type('New Company');
      cy.get('#work-position-0').type('Senior Developer');
      cy.get('#work-startDate-0').type('2023-01-01');
      
      cy.takeNamedScreenshot('resume-editor-add-work');
    });
  });

  describe('Settings Manager Component', () => {
    beforeEach(() => {
      cy.navigateToSection('settings');
    });

    it('should configure API keys', () => {
      cy.waitForComponent('settings-manager-migrated');
      
      // Navigate to API settings
      cy.get('[data-settings-tab="api"]').click();
      
      // Set Claude API key
      cy.fixture('test-data').then((testData) => {
        cy.get('#claude-api-key').clear().type(testData.testAPIKeys.claude);
        cy.get('#openai-api-key').clear().type(testData.testAPIKeys.openai);
      });
      
      cy.takeNamedScreenshot('settings-manager-api-keys');
      
      // Test API connection
      cy.get('#test-claude-api').click();
      cy.get('#api-test-result').should('be.visible');
      
      cy.takeNamedScreenshot('settings-manager-api-test');
    });

    it('should change theme settings', () => {
      cy.waitForComponent('settings-manager-migrated');
      
      // Navigate to theme settings
      cy.get('[data-settings-tab="theme"]').click();
      
      // Change theme
      cy.get('#theme-select').select('dark');
      cy.takeNamedScreenshot('settings-manager-theme-dark');
      
      cy.get('#theme-select').select('modern');
      cy.takeNamedScreenshot('settings-manager-theme-modern');
    });
  });

  describe('Global Store Component', () => {
    it('should maintain state across components', () => {
      // Add a job
      cy.get('#add-job-btn').click();
      cy.openModal('job-modal');
      
      cy.fixture('test-data').then((testData) => {
        cy.fillJobForm(testData.formTestData.validJob);
      });
      
      cy.get('#job-modal').within(() => {
        cy.get('button').contains('Save').click();
      });
      
      // Navigate to different section and back
      cy.navigateToSection('resumes');
      cy.navigateToSection('jobs');
      
      // Verify job still exists
      cy.get('.job-card').should('contain.text', 'Test Company');
      cy.takeNamedScreenshot('global-store-state-persistence');
    });

    it('should handle state updates across components', () => {
      // Seed test data
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData([testData.testJobs[0]]);
        cy.seedResumeData([testData.testResumes[0]]);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Check initial statistics
      cy.get('[data-stat="total-jobs"]').should('contain.text', '1');
      
      // Add another job
      cy.get('#add-job-btn').click();
      cy.openModal('job-modal');
      
      cy.fixture('test-data').then((testData) => {
        cy.fillJobForm(testData.formTestData.validJob);
      });
      
      cy.get('#job-modal').within(() => {
        cy.get('button').contains('Save').click();
      });
      
      // Verify statistics updated
      cy.get('[data-stat="total-jobs"]').should('contain.text', '2');
      cy.takeNamedScreenshot('global-store-state-updates');
    });
  });

  describe('Modal System', () => {
    it('should handle multiple modals', () => {
      // Open job modal
      cy.get('#add-job-btn').click();
      cy.openModal('job-modal');
      cy.takeNamedScreenshot('modal-system-job-modal');
      
      cy.closeModal('job-modal');
      
      // Open import job modal
      cy.get('#import-job-btn').click();
      cy.openModal('import-job-modal');
      cy.takeNamedScreenshot('modal-system-import-modal');
      
      cy.closeModal('import-job-modal');
    });

    it('should handle modal overlays properly', () => {
      cy.get('#add-job-btn').click();
      cy.openModal('job-modal');
      
      // Check overlay behavior
      cy.get('.modal-overlay').should('be.visible');
      cy.get('.modal-overlay').click({ force: true });
      
      // Modal should close when clicking overlay
      cy.get('#job-modal').should('have.class', 'hidden');
      cy.takeNamedScreenshot('modal-system-overlay-close');
    });
  });
});