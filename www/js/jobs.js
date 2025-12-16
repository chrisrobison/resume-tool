// jobs.js - Job management functionality
import { $, $$, showToast } from './utils.js';
import { showModal, hideModal } from './modals.js';

// Job status options
export const JOB_STATUSES = [
    'saved',        // Job saved but no action taken yet
    'applied',      // Resume sent to employer
    'interviewing', // In interview process
    'offered',      // Received job offer
    'rejected',     // Application rejected
    'accepted',     // Offer accepted
    'declined'      // Offer declined
];

// Default job object structure
export const createDefaultJob = () => ({
    id: `job_${Date.now()}`,
    company: '',
    title: '',
    location: '',
    description: '',
    url: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    status: 'saved',
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
    dateApplied: null,
    statusHistory: [],
    resumeId: null, // ID of the associated tailored resume
    logs: [] // History of interactions and API calls
});

// Save jobs to localStorage
export function saveJobs(jobs) {
    localStorage.setItem('saved_jobs', JSON.stringify(jobs));
}

// Load jobs from localStorage
export function loadJobs() {
    const jobsData = localStorage.getItem('saved_jobs');
    return jobsData ? JSON.parse(jobsData) : {};
}

// Save a single job
export function saveJob(job) {
    const jobs = loadJobs();
    jobs[job.id] = job;
    saveJobs(jobs);
    return job;
}

// Delete a job
export function deleteJob(jobId) {
    const jobs = loadJobs();
    if (jobs[jobId]) {
        delete jobs[jobId];
        saveJobs(jobs);
        return true;
    }
    return false;
}

// Update job status with history tracking
export function updateJobStatus(jobId, newStatus, notes = '') {
    const jobs = loadJobs();
    if (!jobs[jobId]) return false;
    
    const job = jobs[jobId];
    const oldStatus = job.status;
    
    // Update status
    job.status = newStatus;
    job.dateUpdated = new Date().toISOString();
    
    // Record status change in history
    job.statusHistory.push({
        from: oldStatus,
        to: newStatus,
        date: new Date().toISOString(),
        notes
    });
    
    // Special handling for applied status
    if (newStatus === 'applied' && !job.dateApplied) {
        job.dateApplied = new Date().toISOString();
    }
    
    // Save updated job
    jobs[jobId] = job;
    saveJobs(jobs);
    
    return true;
}

// Associate a tailored resume with a job
export function associateResumeWithJob(jobId, resumeId) {
    const jobs = loadJobs();
    if (!jobs[jobId]) return false;
    
    jobs[jobId].resumeId = resumeId;
    jobs[jobId].dateUpdated = new Date().toISOString();
    
    saveJobs(jobs);
    return true;
}

// Add a log entry to a job
export function addJobLog(jobId, action, details = {}) {
    const jobs = loadJobs();
    if (!jobs[jobId]) return false;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        details
    };
    
    jobs[jobId].logs.push(logEntry);
    jobs[jobId].dateUpdated = new Date().toISOString();
    
    saveJobs(jobs);
    return true;
}

// Render the list of jobs in the Jobs view
export function renderJobs(app) {
    const container = $('#jobs-container');
    const emptyState = $('#jobs-empty');
    
    if (!container) return;
    
    // Clear existing items except empty state
    Array.from(container.children).forEach(child => {
        if (child !== emptyState) {
            container.removeChild(child);
        }
    });
    
    // Get saved jobs
    const jobs = loadJobs();
    const jobsList = Object.values(jobs);
    
    // Show or hide empty state
    if (jobsList.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    
    // Sort jobs by date updated (newest first)
    jobsList.sort((a, b) => new Date(b.dateUpdated) - new Date(a.dateUpdated));
    
    // Add jobs to the container
    jobsList.forEach(job => {
        const item = createJobCard(job);
        container.appendChild(item);
    });
}

// Create a job card element for the job list
function createJobCard(job) {
    const item = document.createElement('div');
    item.className = 'job-card';
    item.dataset.jobId = job.id;
    
    // Format dates
    const dateCreated = new Date(job.dateCreated).toLocaleDateString();
    const dateUpdated = new Date(job.dateUpdated).toLocaleDateString();
    
    // Get status class
    const statusClass = getStatusClass(job.status);
    
    item.innerHTML = `
        <div class="job-card-header">
            <div class="job-card-title">${job.title || 'Untitled Position'}</div>
            <div class="job-card-company">${job.company || 'Unnamed Company'}</div>
            <div class="job-card-status ${statusClass}">${job.status}</div>
        </div>
        <div class="job-card-details">
            <div class="job-card-dates">
                <span>Created: ${dateCreated}</span>
                <span>Updated: ${dateUpdated}</span>
                ${job.dateApplied ? `<span>Applied: ${new Date(job.dateApplied).toLocaleDateString()}</span>` : ''}
            </div>
            ${job.location ? `<div class="job-card-location"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>` : ''}
            ${job.resumeId ? `<div class="job-card-resume"><i class="fa-solid fa-file-lines"></i> Has tailored resume</div>` : ''}
        </div>
        <div class="job-card-buttons">
            <button class="small-button view-job" title="View Job"><i class="fa-solid fa-eye"></i></button>
            <button class="small-button edit-job" title="Edit Job"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="small-button update-status-job" title="Update Status"><i class="fa-solid fa-arrow-right"></i></button>
            <button class="small-button delete-job" title="Delete Job"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;
    
    return item;
}

// Get CSS class for job status
function getStatusClass(status) {
    switch (status) {
        case 'applied': return 'status-applied';
        case 'interviewing': return 'status-interviewing';
        case 'offered': return 'status-offered';
        case 'rejected': return 'status-rejected';
        case 'accepted': return 'status-accepted';
        case 'declined': return 'status-declined';
        default: return 'status-saved';
    }
}

// Setup event listeners for job view actions
export function setupJobEventListeners(app) {
    // Event delegation for job card buttons
    $('#jobs-container')?.addEventListener('click', e => {
        const jobCard = e.target.closest('.job-card');
        if (!jobCard) return;
        
        const jobId = jobCard.dataset.jobId;
        const jobs = loadJobs();
        const job = jobs[jobId];
        
        if (!job) return;
        
        // View job button
        if (e.target.closest('.view-job')) {
            viewJobDetails(job, app);
        }
        // Edit job button
        else if (e.target.closest('.edit-job')) {
            editJob(job, app);
        }
        // Update status button
        else if (e.target.closest('.update-status-job')) {
            showUpdateStatusModal(job, app);
        }
        // Delete job button
        else if (e.target.closest('.delete-job')) {
            if (confirm(`Are you sure you want to delete the job "${job.title}" at "${job.company}"?`)) {
                deleteJob(jobId);
                renderJobs(app);
                showToast('Job deleted successfully', 'success');
            }
        }
    });
}

// Log an API call
export function logApiCall(apiType, prompt, response, error = null) {
    const logEntry = {
        type: 'api_call',
        timestamp: new Date().toISOString(),
        apiType,
        prompt,
        response: error ? null : response,
        error: error ? error.message || String(error) : null,
        success: !error
    };
    
    // Get existing logs
    const logsData = localStorage.getItem('api_logs');
    const logs = logsData ? JSON.parse(logsData) : [];
    
    // Add new log
    logs.push(logEntry);
    
    // Save logs (keep only the last 100 entries to avoid localStorage limits)
    localStorage.setItem('api_logs', JSON.stringify(logs.slice(-100)));
    
    return logEntry;
}

// Get API logs
export function getApiLogs() {
    const logsData = localStorage.getItem('api_logs');
    return logsData ? JSON.parse(logsData) : [];
}

// Setup functions to be called from modals.js
function viewJobDetails(job, app) {
    // Populate the job detail modal fields
    $('#job-detail-title').textContent = job.title || 'Untitled Position';
    $('#job-detail-company').textContent = job.company || 'Unnamed Company';
    $('#job-detail-status').textContent = job.status;
    $('#job-detail-status').className = `job-status ${getStatusClass(job.status)}`;
    $('#job-detail-date-created').textContent = new Date(job.dateCreated).toLocaleDateString();
    $('#job-detail-date-updated').textContent = new Date(job.dateUpdated).toLocaleDateString();
    
    // Store the current job ID for edit/update operations
    app.state.currentEditJob = job.id;
    
    if (job.dateApplied) {
        $('#job-detail-date-applied').textContent = new Date(job.dateApplied).toLocaleDateString();
        $('#job-detail-date-applied-container').classList.remove('hidden');
    } else {
        $('#job-detail-date-applied-container').classList.add('hidden');
    }
    
    $('#job-detail-location').textContent = job.location || 'No location specified';
    $('#job-detail-url').textContent = job.url || 'No URL specified';
    if (job.url) {
        $('#job-detail-url').href = job.url;
        $('#job-detail-url').setAttribute('target', '_blank');
    } else {
        $('#job-detail-url').removeAttribute('href');
        $('#job-detail-url').removeAttribute('target');
    }
    
    $('#job-detail-contact-name').textContent = job.contactName || 'None specified';
    $('#job-detail-contact-email').textContent = job.contactEmail || 'None specified';
    $('#job-detail-contact-phone').textContent = job.contactPhone || 'None specified';
    
    $('#job-detail-description').textContent = job.description || 'No description provided';
    $('#job-detail-notes').textContent = job.notes || 'No notes added';
    
    // Handle associated resume
    if (job.resumeId) {
        $('#job-detail-resume').textContent = 'View Tailored Resume';
        $('#job-detail-resume').classList.remove('hidden');
        $('#job-detail-resume').onclick = () => {
            // Load and display the tailored resume
            app.loadNamedResume(job.resumeId);
            hideModal('job-detail-modal');
        };
    } else {
        $('#job-detail-resume').classList.add('hidden');
    }
    
    // Render status history
    const historyContainer = $('#job-detail-status-history');
    historyContainer.innerHTML = '';
    
    if (job.statusHistory && job.statusHistory.length > 0) {
        job.statusHistory.forEach(statusChange => {
            const historyItem = document.createElement('div');
            historyItem.className = 'status-history-item';
            const date = new Date(statusChange.date).toLocaleString();
            historyItem.innerHTML = `
                <div><strong>${date}</strong></div>
                <div><span class="${getStatusClass(statusChange.from)}">${statusChange.from}</span> → <span class="${getStatusClass(statusChange.to)}">${statusChange.to}</span></div>
                ${statusChange.notes ? `<div class="status-notes">${statusChange.notes}</div>` : ''}
            `;
            historyContainer.appendChild(historyItem);
        });
    } else {
        historyContainer.innerHTML = '<div class="empty-text">No status changes recorded</div>';
    }
    
    // Show the modal
    showModal('job-detail-modal');
}

// Export the editJob function
export function editJob(job, app) {
    if (!app) {
        console.error('App instance is required for editJob');
        return;
    }
    
    // Set current edit job ID
    app.state.currentEditJob = job.id;
    
    // Populate the job edit form
    $('#edit-job-title').value = job.title || '';
    $('#edit-job-company').value = job.company || '';
    $('#edit-job-location').value = job.location || '';
    $('#edit-job-url').value = job.url || '';
    $('#edit-job-contact-name').value = job.contactName || '';
    $('#edit-job-contact-email').value = job.contactEmail || '';
    $('#edit-job-contact-phone').value = job.contactPhone || '';
    $('#edit-job-description').value = job.description || '';
    $('#edit-job-notes').value = job.notes || '';
    
    // Set status dropdown
    const statusSelect = $('#edit-job-status');
    if (statusSelect) {
        statusSelect.innerHTML = JOB_STATUSES.map(status => 
            `<option value="${status}" ${job.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');
    }
    
    // Show the modal
    showModal('job-edit-modal');
}

function showUpdateStatusModal(job, app) {
    // Set current job ID
    app.state.currentStatusJob = job.id;
    
    // Set job title and company in the modal
    $('#status-update-job-title').textContent = job.title || 'Untitled Position';
    $('#status-update-job-company').textContent = job.company || 'Unnamed Company';
    
    // Populate the status dropdown
    const statusSelect = $('#job-status-update');
    if (statusSelect) {
        statusSelect.innerHTML = JOB_STATUSES.map(status => 
            `<option value="${status}" ${job.status === status ? 'selected' : ''}>${status}</option>`
        ).join('');
    }
    
    // Clear notes field
    $('#job-status-notes').value = '';
    
    // Show the modal
    showModal('job-status-modal');
}