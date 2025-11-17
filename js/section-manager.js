// section-manager.js - Handle section switching and UI state
// Extracted from jobs.html embedded JavaScript

/**
 * Section configuration
 */
const SECTIONS = {
    jobs: {
        title: 'Jobs',
        icon: 'briefcase',
        showAddButton: true,
        showImportJob: true,
        showImportResume: false
    },
    resumes: {
        title: 'Resumes',
        icon: 'file-alt', 
        showAddButton: true,
        showImportJob: false,
        showImportResume: true
    },
    letters: {
        title: 'Cover Letters',
        icon: 'envelope',
        showAddButton: true,
        showImportJob: false,
        showImportResume: false
    },
    'job-search': {
        title: 'Job Search',
        icon: 'search',
        showAddButton: false,
        showImportJob: false,
        showImportResume: false,
        isPanel: true
    },
    ai: {
        title: 'AI Interactions',
        icon: 'robot',
        showAddButton: false,
        showImportJob: false,
        showImportResume: false
    },
    'ai-assistant': {
        title: 'AI Assistant',
        icon: 'magic',
        showAddButton: false,
        showImportJob: false,
        showImportResume: false,
        isPanel: true
    },
    settings: {
        title: 'Settings',
        icon: 'cog',
        showAddButton: false,
        showImportJob: false,
        showImportResume: false,
        isPanel: true
    },
    help: {
        title: 'Help',
        icon: 'question-circle',
        showAddButton: false,
        showImportJob: false,
        showImportResume: false,
        isPanel: true
    }
};

/**
 * Switch between application sections
 * @param {string} section - The section to switch to
 */
export function switchSection(section) {
    try {
        const config = SECTIONS[section];
        if (!config) {
            console.error(`SectionManager: Unknown section: ${section}`);
            return false;
        }

        updateNavigation(section);
        updateHeader(section, config);
        updatePanelVisibility(section, config);
        updateButtonVisibility(config);

        console.log(`SectionManager: Switched to section: ${section}`);
        return true;
        
    } catch (error) {
        console.error(`SectionManager: Failed to switch to section ${section}:`, error);
        return false;
    }
}

/**
 * Update navigation active state
 * @param {string} section - Active section
 */
function updateNavigation(section) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${section}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

/**
 * Update header title and text
 * @param {string} section - Current section
 * @param {object} config - Section configuration
 */
function updateHeader(section, config) {
    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        sectionTitle.textContent = config.title;
    }

    const itemsHeader = document.getElementById('items-header');
    if (itemsHeader) {
        itemsHeader.textContent = config.title;
    }

    const addItemText = document.getElementById('add-item-text');
    if (addItemText && config.showAddButton) {
        const itemType = section.endsWith('s') ? section.slice(0, -1) : section;
        addItemText.textContent = `Add ${itemType}`;
    }
}

/**
 * Update panel visibility based on section type
 * @param {string} section - Current section
 * @param {object} config - Section configuration
 */
function updatePanelVisibility(section, config) {
    // Get all panels
    const itemsPanel = document.getElementById('items-panel');
    const detailsPanel = document.getElementById('details-panel');
    const helpPanel = document.getElementById('help-panel');
    const settingsPanel = document.getElementById('settings-panel');
    const aiAssistantPanel = document.getElementById('ai-assistant-panel');
    const jobSearchPanel = document.getElementById('job-search-panel');

    // Hide all special panels first
    if (helpPanel) helpPanel.style.display = 'none';
    if (settingsPanel) settingsPanel.style.display = 'none';
    if (aiAssistantPanel) aiAssistantPanel.style.display = 'none';
    if (jobSearchPanel) jobSearchPanel.style.display = 'none';

    if (config.isPanel) {
        // Hide main panels, show special panel
        if (itemsPanel) itemsPanel.style.display = 'none';
        if (detailsPanel) detailsPanel.style.display = 'none';

        switch (section) {
            case 'settings':
                if (settingsPanel) settingsPanel.style.display = 'block';
                break;
            case 'ai-assistant':
                if (aiAssistantPanel) aiAssistantPanel.style.display = 'block';
                break;
            case 'job-search':
                if (jobSearchPanel) jobSearchPanel.style.display = 'block';
                break;
            case 'help':
                if (helpPanel) helpPanel.style.display = 'block';
                break;
        }
    } else {
        // Show main panels
        if (itemsPanel) itemsPanel.style.display = '';
        if (detailsPanel) detailsPanel.style.display = '';
    }
}

/**
 * Update button visibility based on section
 * @param {object} config - Section configuration
 */
function updateButtonVisibility(config) {
    const addBtn = document.getElementById('add-item-btn');
    const importJobBtn = document.getElementById('import-job-btn');
    const importResumeBtn = document.getElementById('import-resume-btn');

    if (addBtn) {
        addBtn.style.display = config.showAddButton ? 'flex' : 'none';
    }

    if (importJobBtn) {
        importJobBtn.style.display = config.showImportJob ? 'flex' : 'none';
    }

    if (importResumeBtn) {
        importResumeBtn.style.display = config.showImportResume ? 'flex' : 'none';
    }
}

/**
 * Get section configuration
 * @param {string} section - Section name
 * @returns {object|null} Section configuration
 */
export function getSectionConfig(section) {
    return SECTIONS[section] || null;
}

/**
 * Get all available sections
 * @returns {string[]} Array of section names
 */
export function getAllSections() {
    return Object.keys(SECTIONS);
}

/**
 * Check if section exists
 * @param {string} section - Section name to check
 * @returns {boolean} True if section exists
 */
export function isValidSection(section) {
    return section in SECTIONS;
}