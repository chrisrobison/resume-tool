// card-renderer.js - Item card generation for list views
// Extracted from jobs.html embedded JavaScript

/**
 * Utility function to escape HTML content
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Render items list in container
 * @param {HTMLElement} container - Container element
 * @param {Array} items - Array of items to render
 * @param {string} section - Current section
 * @param {Function} onItemClick - Click handler for items
 */
export function renderItemsList(container, items, section, onItemClick) {
    try {
        container.innerHTML = '';

        if (items.length === 0) {
            renderEmptyList(container, section);
            return;
        }

        items.forEach(item => {
            const card = createItemCard(item, section, onItemClick);
            container.appendChild(card);
        });
        
        console.log(`CardRenderer: Rendered ${items.length} items for ${section}`);
        
    } catch (error) {
        console.error('CardRenderer: Failed to render items list:', error);
        container.innerHTML = '<div class="error-state">Failed to load items</div>';
    }
}

/**
 * Render empty list state
 * @param {HTMLElement} container - Container element
 * @param {string} section - Current section
 */
function renderEmptyList(container, section) {
    const sectionDisplayName = section.charAt(0).toUpperCase() + section.slice(1);
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #7f8c8d;">
            <i class="fas fa-inbox" style="font-size: 24px; margin-bottom: 10px; opacity: 0.5;"></i>
            <div>No ${sectionDisplayName} yet</div>
        </div>
    `;
}

/**
 * Create item card element
 * @param {object} item - Item data
 * @param {string} section - Current section
 * @param {Function} onItemClick - Click handler
 * @returns {HTMLElement} Card element
 */
function createItemCard(item, section, onItemClick) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.itemId = item.id;

    const cardData = getCardData(item, section);
    card.innerHTML = generateCardHTML(cardData);

    // Add click event listener
    card.addEventListener('click', (e) => {
        // Prevent event if clicking on action buttons
        if (e.target.closest('.card-actions')) {
            return;
        }
        
        if (onItemClick) {
            onItemClick(item);
        }
    });

    return card;
}

/**
 * Get card display data based on section
 * @param {object} item - Item data
 * @param {string} section - Current section
 * @returns {object} Card display data
 */
function getCardData(item, section) {
    let title, subtitle, meta, status = '', extras = [];

    switch (section) {
        case 'jobs':
            title = item.position || 'Untitled Position';
            subtitle = item.company || 'Unknown Company';
            meta = item.location || 'No location';
            
            if (item.status) {
                status = `<span class="status-badge status-${item.status}">${item.status}</span>`;
            }
            
            // Add extra info for jobs
            if (item.dateApplied) {
                extras.push(`Applied: ${new Date(item.dateApplied).toLocaleDateString()}`);
            }
            if (item.resumeId) {
                extras.push('📄 Has tailored resume');
            }
            if (item.url) {
                extras.push('🔗 Has job URL');
            }
            break;

        case 'resumes':
            title = item.name || 'Untitled Resume';
            subtitle = item.dateModified ? 
                `Modified: ${new Date(item.dateModified).toLocaleDateString()}` : 
                'Not modified';
            meta = item.dateCreated ? 
                `Created: ${new Date(item.dateCreated).toLocaleDateString()}` : 
                '';
            
            // Add resume stats if content exists
            if (item.content) {
                const content = typeof item.content === 'string' ? 
                    JSON.parse(item.content) : item.content;
                    
                if (content.work?.length) {
                    extras.push(`${content.work.length} work entries`);
                }
                if (content.skills?.length) {
                    extras.push(`${content.skills.length} skills`);
                }
                if (content.education?.length) {
                    extras.push(`${content.education.length} education`);
                }
            }
            break;

        case 'letters':
            title = item.name || 'Untitled Letter';
            subtitle = item.type ? 
                item.type.replace('_', ' ').toUpperCase() : 
                'Letter';
            meta = item.dateCreated ? 
                new Date(item.dateCreated).toLocaleDateString() : 
                '';
            
            if (item.jobId) {
                extras.push('📋 Associated with job');
            }
            break;

        case 'ai':
            title = item.type || 'AI Interaction';
            subtitle = item.service || 'Unknown Service';
            meta = item.timestamp ? 
                new Date(item.timestamp).toLocaleDateString() : 
                '';
            
            if (item.jobId) {
                extras.push('📋 Related to job');
            }
            if (item.response) {
                const responseLength = item.response.length;
                extras.push(`${responseLength} chars response`);
            }
            break;

        default:
            title = item.name || item.title || 'Untitled Item';
            subtitle = 'Unknown Type';
            meta = '';
    }

    return { title, subtitle, meta, status, extras };
}

/**
 * Generate card HTML content
 * @param {object} cardData - Card display data
 * @returns {string} HTML string
 */
function generateCardHTML(cardData) {
    const { title, subtitle, meta, status, extras } = cardData;
    
    let html = `
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="item-subtitle">${escapeHtml(subtitle)}</div>
        <div class="item-meta">
            <span>${escapeHtml(meta)}</span>
            ${status}
        </div>
    `;
    
    // Add extras if they exist
    if (extras.length > 0) {
        html += `
            <div class="item-extras">
                ${extras.map(extra => `<span class="extra-tag">${escapeHtml(extra)}</span>`).join('')}
            </div>
        `;
    }
    
    // Add action buttons
    html += `
        <div class="card-actions">
            <button class="card-action-btn" title="Edit" onclick="window.cardRenderer?.handleEdit(event)">
                <i class="fas fa-edit"></i>
            </button>
            <button class="card-action-btn" title="Delete" onclick="window.cardRenderer?.handleDelete(event)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return html;
}

/**
 * Handle edit button click
 * @param {Event} event - Click event
 */
function handleEdit(event) {
    event.stopPropagation();
    
    const card = event.target.closest('.item-card');
    if (card && card.dataset.itemId) {
        console.log('CardRenderer: Edit requested for item:', card.dataset.itemId);
        
        // Emit custom event for app manager to handle
        card.dispatchEvent(new CustomEvent('item-edit', {
            detail: { itemId: card.dataset.itemId },
            bubbles: true
        }));
    }
}

/**
 * Handle delete button click
 * @param {Event} event - Click event
 */
function handleDelete(event) {
    event.stopPropagation();
    
    const card = event.target.closest('.item-card');
    if (card && card.dataset.itemId) {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to delete this item?');
        
        if (confirmed) {
            console.log('CardRenderer: Delete confirmed for item:', card.dataset.itemId);
            
            // Emit custom event for app manager to handle
            card.dispatchEvent(new CustomEvent('item-delete', {
                detail: { itemId: card.dataset.itemId },
                bubbles: true
            }));
        }
    }
}

/**
 * Update card in the list
 * @param {string} itemId - Item ID
 * @param {object} item - Updated item data
 * @param {string} section - Current section
 */
export function updateCard(itemId, item, section) {
    try {
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!card) return;

        const cardData = getCardData(item, section);
        card.innerHTML = generateCardHTML(cardData);
        
        console.log(`CardRenderer: Updated card for item: ${itemId}`);
        
    } catch (error) {
        console.error('CardRenderer: Failed to update card:', error);
    }
}

/**
 * Remove card from the list
 * @param {string} itemId - Item ID
 */
export function removeCard(itemId) {
    try {
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.remove();
            console.log(`CardRenderer: Removed card for item: ${itemId}`);
        }
        
    } catch (error) {
        console.error('CardRenderer: Failed to remove card:', error);
    }
}

/**
 * Highlight/select a card
 * @param {string} itemId - Item ID
 */
export function selectCard(itemId) {
    try {
        // Remove existing selection
        document.querySelectorAll('.item-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Add selection to specified card
        const card = document.querySelector(`[data-item-id="${itemId}"]`);
        if (card) {
            card.classList.add('active');
            
            // Scroll into view if needed
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
        
    } catch (error) {
        console.error('CardRenderer: Failed to select card:', error);
    }
}

/**
 * Get card element by item ID
 * @param {string} itemId - Item ID
 * @returns {HTMLElement|null} Card element
 */
export function getCardElement(itemId) {
    return document.querySelector(`[data-item-id="${itemId}"]`);
}

// Make handlers available globally for inline onclick handlers
window.cardRenderer = {
    handleEdit,
    handleDelete
};