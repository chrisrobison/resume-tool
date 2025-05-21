// logs.js - Logging system functionality
import { $, $$ } from './utils.js';

// Log types
export const LOG_TYPES = {
    API_CALL: 'api_call',
    JOB_ACTION: 'job_action',
    RESUME_ACTION: 'resume_action',
    SYSTEM: 'system'
};

// Maximum number of logs to keep in localStorage
const MAX_LOGS = 100;

// Add a log entry
export function addLog(type, action, details = {}) {
    const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type,
        action,
        timestamp: new Date().toISOString(),
        details
    };
    
    // Get current logs
    const logs = getLogs();
    
    // Add new log at the beginning
    logs.unshift(logEntry);
    
    // Keep only the most recent logs
    const trimmedLogs = logs.slice(0, MAX_LOGS);
    
    // Save logs
    localStorage.setItem('activity_logs', JSON.stringify(trimmedLogs));
    
    return logEntry;
}

// Get all logs
export function getLogs() {
    const logsData = localStorage.getItem('activity_logs');
    return logsData ? JSON.parse(logsData) : [];
}

// Get logs filtered by type
export function getLogsByType(type) {
    const logs = getLogs();
    return logs.filter(log => log.type === type);
}

// Log an API call
export function logApiCall(apiType, prompt, response, jobId = null, error = null) {
    return addLog(LOG_TYPES.API_CALL, 'api_request', {
        apiType,
        prompt,
        response: error ? null : response,
        error: error ? (error.message || String(error)) : null,
        success: !error,
        jobId
    });
}

// Log a job action
export function logJobAction(action, jobId, details = {}) {
    return addLog(LOG_TYPES.JOB_ACTION, action, {
        jobId,
        ...details
    });
}

// Log a resume action
export function logResumeAction(action, resumeId, details = {}) {
    return addLog(LOG_TYPES.RESUME_ACTION, action, {
        resumeId,
        ...details
    });
}

// Render logs in the history view
export function renderLogs(container, filters = {}) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Get logs
    let logs = getLogs();
    
    // Apply filters if any
    if (filters.type) {
        logs = logs.filter(log => log.type === filters.type);
    }
    
    if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        logs = logs.filter(log => {
            const logString = JSON.stringify(log).toLowerCase();
            return logString.includes(searchTerm);
        });
    }
    
    // If no logs after filtering
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clock-rotate-left fa-2x"></i>
                <p>No logs found matching your criteria.</p>
            </div>
        `;
        return;
    }
    
    // Render logs
    logs.forEach(log => {
        const logItem = createLogItem(log);
        container.appendChild(logItem);
    });
}

// Create a log item element
function createLogItem(log) {
    const item = document.createElement('div');
    item.className = `log-item log-type-${log.type}`;
    item.dataset.logId = log.id;
    
    // Format date
    const date = new Date(log.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    
    // Get icon based on type
    let icon = '';
    switch (log.type) {
        case LOG_TYPES.API_CALL:
            icon = 'fa-solid fa-robot';
            break;
        case LOG_TYPES.JOB_ACTION:
            icon = 'fa-solid fa-briefcase';
            break;
        case LOG_TYPES.RESUME_ACTION:
            icon = 'fa-solid fa-file-lines';
            break;
        case LOG_TYPES.SYSTEM:
            icon = 'fa-solid fa-gear';
            break;
        default:
            icon = 'fa-solid fa-circle-info';
    }
    
    // Format title based on type and action
    let title = '';
    switch (log.type) {
        case LOG_TYPES.API_CALL:
            title = `${log.details.apiType} API Call - ${log.details.success ? 'Success' : 'Failed'}`;
            break;
        case LOG_TYPES.JOB_ACTION:
            title = `Job Action: ${formatAction(log.action)}`;
            break;
        case LOG_TYPES.RESUME_ACTION:
            title = `Resume Action: ${formatAction(log.action)}`;
            break;
        case LOG_TYPES.SYSTEM:
            title = `System: ${formatAction(log.action)}`;
            break;
        default:
            title = formatAction(log.action);
    }
    
    // Build HTML
    item.innerHTML = `
        <div class="log-header">
            <div class="log-icon"><i class="${icon}"></i></div>
            <div class="log-title">${title}</div>
            <div class="log-timestamp">${formattedDate} ${formattedTime}</div>
        </div>
        <div class="log-details hidden">
            <pre>${JSON.stringify(log.details, null, 2)}</pre>
        </div>
        <div class="log-expand"><i class="fa-solid fa-chevron-down"></i></div>
    `;
    
    // Add expand/collapse functionality
    const expandButton = item.querySelector('.log-expand');
    expandButton.addEventListener('click', () => {
        const details = item.querySelector('.log-details');
        const icon = expandButton.querySelector('i');
        
        if (details.classList.contains('hidden')) {
            details.classList.remove('hidden');
            icon.className = 'fa-solid fa-chevron-up';
        } else {
            details.classList.add('hidden');
            icon.className = 'fa-solid fa-chevron-down';
        }
    });
    
    return item;
}

// Format action string to title case
function formatAction(action) {
    return action
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Setup event listeners for the history view
export function setupLogFilters(container, filtersForm) {
    if (!filtersForm) return;
    
    // Apply filters on form submit
    filtersForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const filters = {
            type: filtersForm.querySelector('#log-filter-type').value || null,
            startDate: filtersForm.querySelector('#log-filter-start-date').value || null,
            endDate: filtersForm.querySelector('#log-filter-end-date').value || null,
            search: filtersForm.querySelector('#log-filter-search').value || null
        };
        
        renderLogs(container, filters);
    });
    
    // Reset filters
    filtersForm.querySelector('#log-filter-reset')?.addEventListener('click', () => {
        filtersForm.reset();
        renderLogs(container);
    });
}