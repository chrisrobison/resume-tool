describe('Component Functionality Tests', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
  });

  describe('Job Manager Component', () => {
    it('should create a new job successfully', () => {
      // Use generic Add button (migrated UI)
      cy.get('#add-item-text').should('contain.text', 'Add Job');
      cy.get('#add-item-btn').should('be.visible').click();
      cy.openModal('form-modal');

      // Fill job form using form field names
      cy.fixture('test-data').then((testData) => {
        const job = testData.formTestData.validJob;
        cy.get('#form-modal').within(() => {
          cy.get('form [name="company"]').clear().type(job.company);
          cy.get('form [name="position"]').clear().type(job.position);
          cy.get('form [name="location"]').clear().type(job.location);
          cy.get('form [name="description"]').clear().type(job.description || '');
          cy.get('form [name="url"]').clear().type(job.url || '');
        });
      });

      cy.takeNamedScreenshot('job-manager-create-job');

      // Save job (generic form save)
      cy.get('#form-save').click();

      // Verify job appears in list (card renderer uses .item-card)
      cy.get('.item-card').should('contain.text', 'Test Company');
      cy.takeNamedScreenshot('job-manager-job-created');
    });

    it('should update job status', () => {
      // Seed test data first
      cy.fixture('test-data').then((testData) => {
        cy.seedJobData([testData.testJobs[0]]);
      });
      
      cy.visitJobsApp('new');
      cy.waitForStore();
      
      // Click on job to open details (cards are .item-card)
      cy.get('.item-card').first().click();

      // Change status using migrated control id
      cy.get('#job-status').select('interviewing');
      cy.takeNamedScreenshot('job-manager-status-change');

      // Verify status updated in select and on card badges
      cy.get('#job-status').should('have.value', 'interviewing');
      cy.get('.status-badge').should('contain.text', 'interviewing');
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
      // Use migrated UI: navigate to resumes and click generic Add button
      cy.get('#add-item-text').should('contain.text', 'Add Resume');
      cy.get('#add-item-btn').should('be.visible').click();

      // Wait for resume editor component to initialize (or the generic form)
      cy.waitForComponent('resume-editor-migrated');

      // Fill basic information (resume editor uses #name, #email, #phone, #summary)
      cy.get('#name').clear().type('Test User');
      cy.get('#email').clear().type('test@example.com');
      cy.get('#phone').clear().type('555-0123');
      cy.get('#summary').clear().type('Experienced software developer');

      cy.takeNamedScreenshot('resume-editor-basic-info');

      // Save resume using generic form save if present, otherwise click component save
      cy.get('body').then(($body) => {
        if ($body.find('#form-save').length) {
          cy.get('#form-save').click();
        } else if ($body.find('.save-profile').length) {
          cy.get('.save-profile').click();
        }
      });

      // Verify resume was saved (card renderer .item-card used for resumes)
      cy.get('.item-card').should('contain.text', 'Test User');
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
      cy.get('.item-card').first().click();
      cy.waitForComponent('resume-editor-migrated');

      // Click the Add Work Experience button (data-modal="work-modal")
      cy.get('button[data-modal="work-modal"]').first().click();

      // Fill the work modal inputs
      cy.get('#work-name').type('New Company');
      cy.get('#work-position').type('Senior Developer');
      cy.get('#work-startDate').type('2023-01-01');

      // Save work entry
      cy.get('.save-work').click();

      cy.takeNamedScreenshot('resume-editor-add-work');
    });
  });

  describe('Settings Manager Component', () => {
    beforeEach(() => {
      cy.navigateToSection('settings');
    });

    it('should configure API keys', () => {
      cy.waitForComponent('settings-manager-migrated');

      // The settings manager is a web component, interact via its shadow root
      cy.get('settings-manager-migrated').shadow().within(() => {
        // Set API keys
        cy.fixture('test-data').then((testData) => {
          cy.get('#claude-api-key').clear().type(testData.testAPIKeys.claude);
          cy.get('#openai-api-key').clear().type(testData.testAPIKeys.openai);
        });

        cy.takeNamedScreenshot('settings-manager-api-keys');

        // Test API connection for Claude
        cy.get('[data-test-provider="claude"]').click();
        cy.get('#claude-test-result').should('exist');
      });

      cy.takeNamedScreenshot('settings-manager-api-test');
    });

    it('should change theme settings', () => {
      cy.waitForComponent('settings-manager-migrated');
      
      // Change theme via shadow DOM
      cy.get('settings-manager-migrated').shadow().within(() => {
        cy.get('#theme-select').select('dark');
        cy.takeNamedScreenshot('settings-manager-theme-dark');

        cy.get('#theme-select').select('modern');
        cy.takeNamedScreenshot('settings-manager-theme-modern');
      });
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
