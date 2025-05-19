// modals.js - Modal dialog functionality
import { $, $$, showToast } from './utils.js';
import { createSectionItem } from './ui.js';

// Initialize all modal event handlers
export function setupModals(app) {
    setupModalCloseHandlers();
    setupProfileModal(app);
    setupWorkModal(app);
    setupEducationModal(app);
    setupSkillsModal(app);
    setupProjectsModal(app);
    setupImportModal(app);
    setupExportModal(app);
    setupSaveLoadModals(app);
    setupJobsModal(app);
    setupSettingsModal(app);
}

// Set up general modal close handlers
function setupModalCloseHandlers() {
    // Modal close buttons
    $$('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-backdrop').classList.add('hidden');
        });
    });
    
    // Modal cancel buttons
    $$('.modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-backdrop').classList.add('hidden');
        });
    });
    
    // Close modal when clicking outside
    $$('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

// Show modal by ID
export function showModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.remove('hidden');
        
        // Focus the first input field if present
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

// Hide modal by ID
export function hideModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Clear modal form fields
export function clearModalFields(modalId) {
    const modal = $(`#${modalId}`);
    if (!modal) return;
    
    modal.querySelectorAll('input, textarea').forEach(input => {
        input.value = '';
    });
}

// Profile modal functionality
function setupProfileModal(app) {
    const addProfileBtn = $('#add-profile');
    const saveProfileBtn = $('#save-profile');
    
    // Add profile button
    if (addProfileBtn) {
        addProfileBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('profile-modal');
            showModal('profile-modal');
        });
    }
    
    // Save profile button
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const network = $('#profile-network').value.trim();
            const username = $('#profile-username').value.trim();
            const url = $('#profile-url').value.trim();
            
            if (!network) {
                showToast('Network name is required', 'error');
                return;
            }
            
            const profileData = {
                network,
                username,
                url
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing profile
                app.data.basics.profiles[app.state.currentEditIndex] = profileData;
            } else {
                // Add new profile
                app.data.basics.profiles.push(profileData);
            }
            
            renderProfiles(app);
            hideModal('profile-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit profile button event delegation
    $('#profiles-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.basics.profiles.length) return;
            
            const profile = app.data.basics.profiles[index];
            
            $('#profile-network').value = profile.network || '';
            $('#profile-username').value = profile.username || '';
            $('#profile-url').value = profile.url || '';
            
            app.state.currentEditIndex = index;
            showModal('profile-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.basics.profiles.length) return;
            
            if (confirm('Are you sure you want to delete this profile?')) {
                app.data.basics.profiles.splice(index, 1);
                renderProfiles(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render profiles list
export function renderProfiles(app) {
    const container = $('#profiles-container');
    const emptyState = $('#profiles-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Show or hide empty state
    if (app.data.basics.profiles.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add profiles to the container
    app.data.basics.profiles.forEach((profile, index) => {
        const item = createSectionItem(profile, index, 'profiles');
        container.appendChild(item);
    });
}

// Work experience modal functionality
function setupWorkModal(app) {
    const addWorkBtn = $('#add-work');
    const saveWorkBtn = $('#save-work');
    
    // Add work button
    if (addWorkBtn) {
        addWorkBtn.addEventListener('click', () => {
            app.state.currentEditIndex = -1;
            clearModalFields('work-modal');
            showModal('work-modal');
        });
    }
    
    // Save work button
    if (saveWorkBtn) {
        saveWorkBtn.addEventListener('click', () => {
            const name = $('#work-name').value.trim();
            const position = $('#work-position').value.trim();
            const startDate = $('#work-startDate').value.trim();
            const endDate = $('#work-endDate').value.trim();
            const url = $('#work-url').value.trim();
            const location = $('#work-location').value.trim();
            const summary = $('#work-summary').value.trim();
            const highlightsText = $('#work-highlights').value.trim();
            
            if (!name || !position) {
                showToast('Company name and position are required', 'error');
                return;
            }
            
            // Process highlights as array of strings
            const highlights = highlightsText 
                ? highlightsText.split('\n')
                    .map(h => h.trim())
                    .filter(h => h.length > 0)
                    .map(h => h.startsWith('• ') ? h.substring(2) : h)
                : [];
            
            const workData = {
                name,
                position,
                startDate,
                endDate,
                url,
                location,
                summary,
                highlights
            };
            
            if (app.state.currentEditIndex >= 0) {
                // Edit existing work
                app.data.work[app.state.currentEditIndex] = workData;
            } else {
                // Add new work
                app.data.work.push(workData);
            }
            
            renderWork(app);
            hideModal('work-modal');
            app.updateMetaLastModified();
        });
    }
    
    // Edit/delete work event delegation
    $('#work-container').addEventListener('click', (e) => {
        if (e.target.closest('.edit-item')) {
            const button = e.target.closest('.edit-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.work.length) return;
            
            const work = app.data.work[index];
            
            $('#work-name').value = work.name || '';
            $('#work-position').value = work.position || '';
            $('#work-startDate').value = work.startDate || '';
            $('#work-endDate').value = work.endDate || '';
            $('#work-url').value = work.url || '';
            $('#work-location').value = work.location || '';
            $('#work-summary').value = work.summary || '';
            $('#work-highlights').value = work.highlights ? work.highlights.map(h => `• ${h}`).join('\n') : '';
            
            app.state.currentEditIndex = index;
            showModal('work-modal');
        } else if (e.target.closest('.delete-item')) {
            const button = e.target.closest('.delete-item');
            const index = parseInt(button.dataset.index);
            
            if (isNaN(index) || index < 0 || index >= app.data.work.length) return;
            
            if (confirm('Are you sure you want to delete this work experience?')) {
                app.data.work.splice(index, 1);
                renderWork(app);
                app.updateMetaLastModified();
            }
        }
    });
}

// Render work experience list
export function renderWork(app) {
    const container = $('#work-container');
    const emptyState = $('#work-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Show or hide empty state
    if (app.data.work.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Add work experiences to the container
    app.data.work.forEach((work, index) => {
        const item = createSectionItem(work, index, 'work');
        container.appendChild(item);
    });
}

// Setup for other modals (education, skills, projects) follows the same pattern
// Similar functions for setupEducationModal, setupSkillsModal, setupProjectsModal, etc.
// Not included here for brevity, but would follow the same pattern

function setupEducationModal(app) {
    // Education modal implementation (similar to work modal)
}

function setupSkillsModal(app) {
    // Skills modal implementation
}

function setupProjectsModal(app) {
    // Projects modal implementation
}

function setupImportModal(app) {
    // Import modal implementation
}

function setupExportModal(app) {
    // Export modal implementation
}

function setupSaveLoadModals(app) {
    // Save/Load modals implementation
}

function setupJobsModal(app) {
    // Jobs modal implementation
}

function setupSettingsModal(app) {
    // Settings modal implementation
}