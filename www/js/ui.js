// ui.js - UI-related utilities and event listeners
import { $, $$, createElement, showToast } from './utils.js';

// Setup UI event listeners
export function setupUIEventListeners(app) {
    // Sidebar navigation
    $$('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            if (viewId) {
                switchView(viewId);
            }
        });
    });
    
    // Hamburger menu toggle
    $('.hamburger-menu').addEventListener('click', () => {
        $('.sidebar').classList.toggle('active');
        $('.menu-backdrop').classList.toggle('active');
    });
    
    // Menu backdrop click to close sidebar on mobile
    $('.menu-backdrop').addEventListener('click', () => {
        $('.sidebar').classList.remove('active');
        $('.menu-backdrop').classList.remove('active');
    });
    
    // Tab navigation
    $$('.tab')?.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            if (tabId) {
                switchTab(tabId);
                // On mobile, scroll to the top of the panel when switching tabs
                if (window.innerWidth <= 768) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else if (tab.dataset.modalTab) {
                switchModalTab(tab.dataset.modalTab);
            }
        });
    });
    
    // Setup touch swipe for mobile tab navigation
    setupSwipeNavigation();

    // Basic form inputs - set up event listeners for all inputs
    setupBasicFormListeners(app);
}

// Switch between main views (resume view, jobs view)
export function switchView(viewId) {
    // Hide all views
    $$('.view-container').forEach(view => view.classList.remove('active'));
    
    // Show selected view
    $(`#${viewId}-view`).classList.add('active');
    
    // Update sidebar active state
    $$('.sidebar-nav-item').forEach(item => {
        if (item.dataset.view === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // On mobile, close the sidebar when a view is selected
    if (window.innerWidth <= 768) {
        $('.sidebar').classList.remove('active');
        $('.menu-backdrop').classList.remove('active');
    }
}

// Switch between tabs in the resume view
export function switchTab(tabId) {
    // Hide all panels
    $$('.panel').forEach(panel => panel.classList.remove('active'));
    
    // Show selected panel
    $(`#${tabId}-panel`).classList.add('active');
    
    // Update tab active state
    $$('.tab').forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
        } else {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        }
    });
}

// Switch between tabs in modals
export function switchModalTab(tabId) {
    const modal = event.target.closest('.modal');
    if (!modal) return;
    
    // Update tab active state
    modal.querySelectorAll('.tab').forEach(tab => {
        if (tab.dataset.modalTab === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Hide all panels
    modal.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    
    // Show selected panel
    modal.querySelector(`#${tabId}-panel`).classList.add('active');
}

// Set up touch swipe navigation for mobile
export function setupSwipeNavigation() {
    const container = $('.tabs');
    if (!container) return;
    
    container.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        window.touchStartX = touch.clientX;
    }, { passive: true });
    
    container.addEventListener('touchend', e => {
        if (!window.touchStartX) return;
        
        const touch = e.changedTouches[0];
        const touchEndX = touch.clientX;
        const difference = window.touchStartX - touchEndX;
        
        // Minimum swipe distance (px)
        const minSwipeDistance = 50;
        
        if (Math.abs(difference) < minSwipeDistance) return;
        
        const activeTab = $('.tab.active');
        const tabs = Array.from($$('.tab'));
        const currentIndex = tabs.indexOf(activeTab);
        
        if (difference > 0) {
            // Swipe left, go to next tab
            const nextTab = tabs[currentIndex + 1];
            if (nextTab) {
                switchTab(nextTab.dataset.tab);
            }
        } else {
            // Swipe right, go to previous tab
            const prevTab = tabs[currentIndex - 1];
            if (prevTab) {
                switchTab(prevTab.dataset.tab);
            }
        }
        
        window.touchStartX = null;
    }, { passive: true });
}

// Setup listeners for all inputs in the basics panel
export function setupBasicFormListeners(app) {
    // Setup basic information fields
    const basicFields = ['name', 'label', 'email', 'phone', 'website', 'summary'];
    
    basicFields.forEach(field => {
        const element = $(`#${field}`);
        if (element) {
            element.addEventListener('input', e => {
                app.data.basics[field] = e.target.value;
                app.updateMetaLastModified();
            });
        }
    });
    
    // Setup location fields
    const locationFields = ['address', 'postalCode', 'city', 'countryCode', 'region'];
    
    locationFields.forEach(field => {
        const element = $(`#${field}`);
        if (element) {
            element.addEventListener('input', e => {
                app.data.basics.location[field] = e.target.value;
                app.updateMetaLastModified();
            });
        }
    });
    
    // Setup meta fields
    const metaFields = ['theme', 'language'];
    
    metaFields.forEach(field => {
        const element = $(`#${field}`);
        if (element) {
            element.addEventListener('input', e => {
                app.data.meta[field] = e.target.value;
                app.updateMetaLastModified();
            });
        }
    });
    
    // Setup picture preview
    const pictureInput = $('#picture');
    const pictureImg = $('#pictureImg');
    
    if (pictureInput && pictureImg) {
        pictureInput.addEventListener('input', e => {
            app.data.basics.picture = e.target.value;
            
            if (e.target.value) {
                pictureImg.src = e.target.value;
                pictureImg.classList.remove('hidden');
                
                // Handle load errors
                pictureImg.onerror = () => {
                    pictureImg.classList.add('hidden');
                };
            } else {
                pictureImg.classList.add('hidden');
            }
            
            app.updateMetaLastModified();
        });
    }
}

// Create a list item for resume sections (work, education, skills, projects)
export function createSectionItem(data, index, type) {
    const item = createElement('div', { className: 'resume-item' });
    
    let title, subtitle;
    
    switch (type) {
        case 'work':
            title = data.position || 'Untitled Position';
            subtitle = data.name || 'Unnamed Company';
            break;
        case 'education':
            title = data.studyType || 'Untitled Degree';
            subtitle = data.institution || 'Unnamed Institution';
            break;
        case 'skills':
            title = data.name || 'Unnamed Skill';
            subtitle = data.level || '';
            break;
        case 'projects':
            title = data.name || 'Untitled Project';
            subtitle = data.description ? data.description.substring(0, 40) + '...' : '';
            break;
        case 'profiles':
            title = data.network || 'Unnamed Network';
            subtitle = data.username || '';
            break;
    }
    
    const header = createElement('div', { className: 'resume-item-header' });
    header.appendChild(createElement('div', { className: 'resume-item-title', textContent: title }));
    header.appendChild(createElement('div', { className: 'resume-item-subtitle', textContent: subtitle }));
    item.appendChild(header);
    
    const btnContainer = createElement('div', { className: 'resume-item-buttons' });
    
    const editBtn = createElement('button', { className: 'icon-button edit-item', title: 'Edit' });
    editBtn.appendChild(createElement('i', { className: 'fa-solid fa-pen-to-square' }));
    editBtn.dataset.index = index;
    editBtn.dataset.type = type;
    
    const deleteBtn = createElement('button', { className: 'icon-button delete-item', title: 'Delete' });
    deleteBtn.appendChild(createElement('i', { className: 'fa-solid fa-trash-can' }));
    deleteBtn.dataset.index = index;
    deleteBtn.dataset.type = type;
    
    btnContainer.appendChild(editBtn);
    btnContainer.appendChild(deleteBtn);
    header.appendChild(btnContainer);
    
    return item;
}