describe('Basic UI Functionality', () => {
  beforeEach(() => {
    cy.clearAPIKeys();
    cy.visitJobsApp('new');
    cy.waitForStore();
    cy.checkConsoleErrors();
  });

  it('should load the application successfully', () => {
    cy.get('body').should('be.visible');
    cy.get('global-store-migrated').should('exist');
    cy.get('#main-nav').should('be.visible');
    
    // Take screenshot of initial load
    cy.takeNamedScreenshot('app-initial-load');
    
    // Measure page load performance
    cy.measurePageLoad('Jobs Application');
  });

  it('should navigate between sections', () => {
    const sections = ['jobs', 'resumes', 'settings', 'logs'];
    
    sections.forEach((section) => {
      cy.navigateToSection(section);
      cy.takeNamedScreenshot(`section-${section}`);
      cy.wait(500); // Allow section to fully load
    });
  });

  it('should display job statistics correctly', () => {
    // Seed some test data first
    cy.fixture('test-data').then((testData) => {
      cy.seedJobData(testData.testJobs);
      cy.seedResumeData(testData.testResumes);
    });
    
    cy.visitJobsApp('new');
    cy.waitForStore();
    
    // Check job statistics display
    cy.get('.stats-container').should('be.visible');
    cy.get('[data-stat="total-jobs"]').should('contain.text', '3');
    cy.get('[data-stat="applied-jobs"]').should('contain.text', '1');
    cy.get('[data-stat="interviewing-jobs"]').should('contain.text', '1');
    
    cy.takeNamedScreenshot('job-statistics-display');
  });

  it('should handle empty state properly', () => {
    cy.get('#jobs-container').should('be.visible');
    cy.get('.empty-state').should('contain.text', 'No jobs found');
    
    cy.takeNamedScreenshot('empty-state');
  });

  it('should display recent activity in logs section', () => {
    cy.navigateToSection('logs');
    cy.get('#logs-container').should('be.visible');
    
    cy.takeNamedScreenshot('logs-section');
  });

  it('should be responsive on different viewports', () => {
    const viewports = [
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    viewports.forEach((viewport) => {
      cy.viewport(viewport.width, viewport.height);
      cy.wait(500);
      cy.takeNamedScreenshot(`responsive-${viewport.name}`);
      
      // Check that key elements are still visible and accessible
      cy.get('#main-nav').should('be.visible');
      cy.get('#section-title').should('be.visible');
    });
  });

  it('should handle localStorage persistence', () => {
    // Add some test data
    cy.fixture('test-data').then((testData) => {
      cy.seedJobData([testData.testJobs[0]]);
      
      // Reload the page
      cy.reload();
      cy.waitForStore();
      
      // Check that data persists
      cy.get('.job-card').should('have.length', 1);
      cy.get('.job-card').should('contain.text', 'TechCorp Inc');
      
      cy.takeNamedScreenshot('data-persistence-test');
    });
  });

  it('should perform basic accessibility checks', () => {
    cy.checkA11y();
    cy.takeNamedScreenshot('accessibility-check');
  });
});