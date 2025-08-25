// ***********************************************************
// Custom Cypress commands for Job Hunt Manager testing
// ***********************************************************

// Job Hunt Manager specific commands
Cypress.Commands.add('visitJobsApp', (version = 'new') => {
  const url = version === 'new' ? '/jobs-new.html' : '/jobs.html';
  cy.visit(url);
  cy.wait(1000); // Wait for app initialization
  cy.get('body').should('be.visible');
});

// Navigation commands
Cypress.Commands.add('navigateToSection', (section) => {
  cy.get(`[data-section="${section}"]`).click();
  cy.get(`[data-section="${section}"]`).should('have.class', 'active');
  cy.get('#section-title').should('contain.text', section.charAt(0).toUpperCase() + section.slice(1));
});

// Modal commands
Cypress.Commands.add('openModal', (modalId) => {
  cy.get(`#${modalId}`).should('exist').and('not.have.class', 'hidden');
});

Cypress.Commands.add('closeModal', (modalId) => {
  cy.get(`#${modalId} .modal-close`).click();
  cy.get(`#${modalId}`).should('have.class', 'hidden');
});

// Form commands
Cypress.Commands.add('fillJobForm', (jobData) => {
  if (jobData.company) cy.get('#job-company').clear().type(jobData.company);
  if (jobData.position) cy.get('#job-position').clear().type(jobData.position);
  if (jobData.location) cy.get('#job-location').clear().type(jobData.location);
  if (jobData.description) cy.get('#job-description').clear().type(jobData.description);
  if (jobData.url) cy.get('#job-url').clear().type(jobData.url);
});

// API and Settings commands
Cypress.Commands.add('setAPIKey', (provider, key) => {
  cy.window().then((win) => {
    const keyName = provider === 'claude' ? 'claude_api_key' : 'openai_api_key';
    win.localStorage.setItem(keyName, key);
  });
});

Cypress.Commands.add('clearAPIKeys', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('claude_api_key');
    win.localStorage.removeItem('openai_api_key');
    win.localStorage.removeItem('api_key'); // Legacy key
  });
});

// Data seeding commands
Cypress.Commands.add('seedJobData', (jobs = []) => {
  cy.window().then((win) => {
    const existingData = JSON.parse(win.localStorage.getItem('jobHuntData') || '{}');
    const updatedData = { ...existingData, jobs };
    win.localStorage.setItem('jobHuntData', JSON.stringify(updatedData));
    
    // Try to update global store directly
    const store = win.document.querySelector('global-store-migrated');
    if (store && typeof store.setState === 'function') {
      store.setState({ jobs: jobs });
    }
    
    // Also trigger storage event
    win.dispatchEvent(new win.StorageEvent('storage', {
      key: 'jobHuntData',
      newValue: JSON.stringify(updatedData),
      oldValue: JSON.stringify(existingData)
    }));
  });
});

Cypress.Commands.add('seedResumeData', (resumes = []) => {
  cy.window().then((win) => {
    const existingData = JSON.parse(win.localStorage.getItem('jobHuntData') || '{}');
    const updatedData = { ...existingData, resumes };
    win.localStorage.setItem('jobHuntData', JSON.stringify(updatedData));
    
    // Trigger storage event to notify components
    win.dispatchEvent(new win.StorageEvent('storage', {
      key: 'jobHuntData',
      newValue: JSON.stringify(updatedData),
      oldValue: JSON.stringify(existingData)
    }));
  });
});

// Component interaction commands
Cypress.Commands.add('waitForComponent', (componentSelector, timeout = 5000) => {
  // Support both migrated and legacy component tag names.
  const selectors = [componentSelector];
  if (componentSelector.includes('-migrated')) {
    const alt = componentSelector.replace('-migrated', '');
    selectors.push(alt);
  } else {
    selectors.push(`${componentSelector}-migrated`);
  }

  cy.get(selectors.join(','), { timeout }).should('exist').and('be.visible');
  // Wait briefly for component internals to initialize
  cy.wait(500);
});

Cypress.Commands.add('waitForStore', () => {
  cy.get('global-store-migrated', { timeout: 10000 }).should('exist');
  cy.wait(1000); // Give the store time to initialize
});

// Screenshot commands with consistent naming
Cypress.Commands.add('takeNamedScreenshot', (name, options = {}) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotName = `${name}-${timestamp}`;
  cy.screenshot(screenshotName, {
    capture: 'viewport',
    overwrite: true,
    ...options
  });
});

// Utility commands
Cypress.Commands.add('checkConsoleErrors', () => {
  cy.window().then((win) => {
    // Check for JavaScript errors in console
    win.addEventListener('error', (e) => {
      throw new Error(`Console error: ${e.error.message}`);
    });
    
    win.addEventListener('unhandledrejection', (e) => {
      throw new Error(`Unhandled promise rejection: ${e.reason}`);
    });
  });
});

// Performance testing commands
Cypress.Commands.add('measurePageLoad', (pageName) => {
  cy.window().its('performance').then((perf) => {
    const loadTime = perf.timing.loadEventEnd - perf.timing.navigationStart;
    cy.log(`${pageName} load time: ${loadTime}ms`);
    
    // Fail test if load time is too slow
    expect(loadTime).to.be.lessThan(5000, `${pageName} should load in under 5 seconds`);
  });
});

// Accessibility commands
Cypress.Commands.add('checkA11y', () => {
  // Basic accessibility checks
  cy.get('body').should('be.visible'); // Basic check that page loads
  cy.get('h1, h2, h3, h4, h5, h6').should('exist'); // Check for headings
  cy.get('button').should('exist'); // Check for interactive elements
});
