// Job Manager Web Component
import { JOB_STATUSES, createDefaultJob, saveJob, deleteJob, updateJobStatus, associateResumeWithJob, addJobLog, editJob } from '../js/jobs.js';

class JobManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._jobs = {};
        this._selectedJob = null;
        this._autoSaveTimeout = null;
        this._isAutoSaving = false;
    }

    connectedCallback() {
        this.loadJobs();
        this.render();
        this.setupEventListeners();
    }

    loadJobs() {
        const jobsData = localStorage.getItem('saved_jobs');
        this._jobs = jobsData ? JSON.parse(jobsData) : {};
    }

    render() {
        const styles = `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #333;
            }
            
            * {
                box-sizing: border-box;
            }
            
            .job-manager {
                display: flex;
                height: 100%;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .job-list {
                width: 300px;
                background: #f8f9fa;
                border-right: 1px solid #e0e0e0;
                display: flex;
                flex-direction: column;
            }
            
            .job-list-header {
                padding: 1rem;
                background: #f1f3f5;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .job-list-content {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }
            
            .job-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1rem;
                margin-bottom: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .job-card:hover {
                border-color: #007bff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .job-card.selected {
                border-color: #007bff;
                background: #e7f5ff;
            }
            
            .job-card-header {
                margin-bottom: 0.5rem;
            }
            
            .job-card-title {
                font-weight: 600;
                color: #212529;
            }
            
            .job-card-company {
                color: #6c757d;
                font-size: 0.9rem;
            }
            
            .job-card-status {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.8rem;
                margin-top: 0.5rem;
            }
            
            .status-saved { background: #e9ecef; color: #495057; }
            .status-applied { background: #e7f5ff; color: #1971c2; }
            .status-interviewing { background: #fff3bf; color: #e67700; }
            .status-offered { background: #d3f9d8; color: #2b8a3e; }
            .status-rejected { background: #ffe3e3; color: #c92a2a; }
            .status-accepted { background: #d3f9d8; color: #2b8a3e; }
            .status-declined { background: #ffe3e3; color: #c92a2a; }
            
            .job-detail {
                flex: 1;
                padding: 1rem;
                overflow-y: auto;
            }
            
            .job-detail-header {
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .job-detail-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }
            
            .job-detail-company {
                font-size: 1.2rem;
                color: #6c757d;
            }
            
            .job-detail-content {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 1rem;
            }
            
            .job-detail-main {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1rem;
            }
            
            .job-detail-sidebar {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .job-detail-section {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1rem;
            }
            
            .job-detail-section h3 {
                margin: 0 0 1rem 0;
                font-size: 1.1rem;
                color: #495057;
            }
            
            .btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover {
                background: #0056b3;
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #545b62;
            }
            
            .btn-danger {
                background: #dc3545;
                color: white;
            }
            
            .btn-danger:hover {
                background: #c82333;
            }
            
            .form-group {
                margin-bottom: 1rem;
            }
            
            label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
                color: #495057;
            }
            
            input, textarea, select {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 0.9rem;
            }
            
            textarea {
                min-height: 100px;
                resize: vertical;
            }
            
            .empty-state {
                text-align: center;
                padding: 2rem;
                color: #6c757d;
            }
            
            .empty-state i {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: #adb5bd;
            }

            .status-history {
                margin-top: 1rem;
            }

            .status-history-item {
                padding: 0.5rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .status-history-item:last-child {
                border-bottom: none;
            }

            .status-notes {
                font-size: 0.9rem;
                color: #6c757d;
                margin-top: 0.25rem;
            }

            .job-logs {
                margin-top: 1rem;
            }

            .log-entry {
                padding: 0.5rem;
                border-bottom: 1px solid #e0e0e0;
                font-size: 0.9rem;
            }

            .log-entry:last-child {
                border-bottom: none;
            }

            .log-timestamp {
                color: #6c757d;
                font-size: 0.8rem;
            }

            .log-action {
                font-weight: 500;
                color: #495057;
            }

            .log-details {
                color: #6c757d;
                margin-top: 0.25rem;
            }

            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
            }

            .modal-header {
                margin-bottom: 1rem;
            }

            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
            }

            .modal-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                justify-content: flex-end;
            }

            .resume-list {
                margin-top: 1rem;
                max-height: 400px;
                overflow-y: auto;
            }

            .resume-item {
                padding: 1rem;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                margin-bottom: 0.5rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .resume-item:hover {
                border-color: #007bff;
                background: #f8f9fa;
            }

            .resume-item-info {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .resume-item-name {
                font-weight: 600;
                color: #212529;
            }

            .resume-item-details {
                display: flex;
                gap: 1rem;
                color: #6c757d;
                font-size: 0.9rem;
            }

            .resume-item-date {
                color: #6c757d;
                font-size: 0.8rem;
            }

            .tabs {
                display: flex;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 1rem;
            }

            .tab {
                padding: 0.75rem 1rem;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                font-size: 0.9rem;
                color: #6c757d;
                transition: all 0.2s;
            }

            .tab:hover {
                color: #007bff;
                background: #f8f9fa;
            }

            .tab.active {
                color: #007bff;
                border-bottom-color: #007bff;
                background: #f8f9fa;
            }

            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            .tab-section {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1rem;
                margin-bottom: 1rem;
            }

            .auto-save-status {
                font-size: 0.8rem;
                margin-left: 0.5rem;
                color: #6c757d;
                font-style: italic;
            }

            .auto-save-status.saving {
                color: #ffc107;
            }

            .auto-save-status.saved {
                color: #28a745;
            }

            .job-detail-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .header-content {
                flex: 1;
            }

            .header-actions {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }

            .header-actions .btn {
                font-size: 0.8rem;
                padding: 0.4rem 0.8rem;
            }

            .resume-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .resume-meta {
                display: flex;
                align-items: center;
                gap: 1rem;
                font-size: 0.9rem;
                color: #6c757d;
            }

            .btn-sm {
                font-size: 0.8rem;
                padding: 0.25rem 0.5rem;
            }

            .resume-content {
                max-height: 600px;
                overflow-y: auto;
            }

            .resume-section {
                margin-bottom: 1.5rem;
            }

            .resume-section h4 {
                margin: 0 0 1rem 0;
                color: #495057;
                font-size: 1.1rem;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 0.5rem;
            }

            .resume-section-content {
                padding-left: 1rem;
            }

            .resume-item {
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .resume-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .resume-dates {
                font-size: 0.9rem;
                color: #6c757d;
                font-style: italic;
            }

            .resume-company {
                color: #6c757d;
                margin-bottom: 0.5rem;
            }

            .resume-text {
                margin-top: 0.5rem;
                color: #495057;
                line-height: 1.5;
            }

            .resume-field {
                margin-bottom: 0.5rem;
                padding: 0.5rem;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .resume-highlights {
                margin: 0.5rem 0 0 1rem;
                color: #495057;
            }

            .resume-highlights li {
                margin-bottom: 0.25rem;
            }

            .skill-level {
                color: #6c757d;
                font-size: 0.9rem;
                margin-left: 0.5rem;
            }

            .skill-keywords {
                margin-top: 0.5rem;
            }

            .skill-tag {
                display: inline-block;
                background: #e9ecef;
                color: #495057;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.8rem;
                margin: 0.25rem 0.25rem 0 0;
            }

            .resume-selection h3 {
                margin: 0 0 0.5rem 0;
                color: #495057;
            }

            .resume-selection p {
                margin: 0 0 1.5rem 0;
                color: #6c757d;
            }

            .resume-list {
                margin: 1rem 0;
                max-height: 400px;
                overflow-y: auto;
            }

            .resume-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                margin-bottom: 0.5rem;
                background: white;
                transition: all 0.2s;
                cursor: pointer;
            }

            .resume-card:hover {
                border-color: #007bff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .resume-card-content {
                flex: 1;
            }

            .resume-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .resume-card-header h4 {
                margin: 0;
                color: #495057;
                font-size: 1rem;
            }

            .resume-date {
                font-size: 0.8rem;
                color: #6c757d;
            }

            .resume-basics {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                margin-bottom: 0.5rem;
            }

            .resume-basics strong {
                color: #212529;
            }

            .resume-basics span {
                color: #6c757d;
                font-size: 0.9rem;
            }

            .resume-stats {
                font-size: 0.8rem;
                color: #6c757d;
            }

            .resume-card-actions {
                display: flex;
                gap: 0.5rem;
                margin-left: 1rem;
            }

            .resume-actions {
                margin-top: 1.5rem;
                padding-top: 1rem;
                border-top: 1px solid #e0e0e0;
                text-align: center;
            }

            .resume-controls {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .template-selector {
                padding: 0.25rem 0.5rem;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 0.8rem;
            }

            .resume-viewer-container {
                max-height: 600px;
                overflow-y: auto;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background: white;
            }
        `;

        const html = `
            <div class="job-manager">
                <div class="job-list">
                    <div class="job-list-header">
                        <h2>Jobs</h2>
                        <button class="btn btn-primary" data-click="handleAddJob">Add Job</button>
                    </div>
                    <div class="job-list-content">
                        ${this.renderJobList()}
                    </div>
                </div>
                <div class="job-detail">
                    ${this.renderJobDetail()}
                </div>
            </div>
        `;

        this.shadowRoot.innerHTML = `<style>${styles}</style>${html}`;
        
        // Update resume viewer if present
        this.updateResumeViewer();
    }

    renderJobList() {
        const jobs = Object.values(this._jobs);
        
        if (jobs.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fa-solid fa-briefcase"></i>
                    <p>No jobs added yet</p>
                    <button class="btn btn-primary" data-click="handleAddJob">Add Your First Job</button>
                </div>
            `;
        }
        
        return jobs.map(job => `
            <div class="job-card ${this._selectedJob?.id === job.id ? 'selected' : ''}" 
                 data-job-id="${job.id}" 
                 data-click="handleSelectJob">
                <div class="job-card-header">
                    <div class="job-card-title">${job.title || 'Untitled Position'}</div>
                    <div class="job-card-company">${job.company || 'Unnamed Company'}</div>
                    <div class="job-card-status status-${job.status}">${job.status}</div>
                </div>
                <div class="job-card-details">
                    <div class="job-card-dates">
                        <span>Created: ${new Date(job.dateCreated).toLocaleDateString()}</span>
                        <span>Updated: ${new Date(job.dateUpdated).toLocaleDateString()}</span>
                        ${job.dateApplied ? `<span>Applied: ${new Date(job.dateApplied).toLocaleDateString()}</span>` : ''}
                    </div>
                    ${job.location ? `<div class="job-card-location"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>` : ''}
                    ${job.resumeId ? `<div class="job-card-resume"><i class="fa-solid fa-file-lines"></i> Has tailored resume</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderJobDetail() {
        if (!this._selectedJob) {
            return `
                <div class="empty-state">
                    <i class="fa-solid fa-hand-pointer"></i>
                    <p>Select a job to view details</p>
                </div>
            `;
        }

        const job = this._selectedJob;
        
        return `
            <div class="job-detail-header">
                <div class="header-content">
                    <div class="job-detail-title">${job.title || 'Untitled Position'}</div>
                    <div class="job-detail-company">${job.company || 'Unnamed Company'}</div>
                </div>
                <div class="header-actions">
                    <div class="auto-save-status"></div>
                    <button type="submit" class="btn btn-secondary">Save Now</button>
                    <button type="button" class="btn btn-secondary" data-click="handleUpdateStatus">Update Status</button>
                    ${job.resumeId ? `
                        <button type="button" class="btn btn-secondary" data-click="handleViewResume">View Resume</button>
                    ` : `
                        <button type="button" class="btn btn-secondary" data-click="handleAssociateResume">Associate Resume</button>
                    `}
                    <button type="button" class="btn btn-danger" data-click="handleDeleteJob">Delete Job</button>
                </div>
            </div>
            
            <form id="job-detail-form">
                <div class="tabs">
                    <button type="button" class="tab active" data-tab="job">Job</button>
                    <button type="button" class="tab" data-tab="details">Details</button>
                    <button type="button" class="tab" data-tab="contact">Contact</button>
                    <button type="button" class="tab" data-tab="resume">Resume</button>
                    <button type="button" class="tab" data-tab="history">History</button>
                </div>
                
                <div class="tab-content active" data-content="job">
                    ${this.renderJobTab(job)}
                </div>
                
                <div class="tab-content" data-content="details">
                    ${this.renderDetailsTab(job)}
                </div>
                
                <div class="tab-content" data-content="contact">
                    ${this.renderContactTab(job)}
                </div>
                
                <div class="tab-content" data-content="resume">
                    ${this.renderResumeTab(job)}
                </div>
                
                <div class="tab-content" data-content="history">
                    ${this.renderHistoryTab(job)}
                </div>
            </form>
        `;
    }

    renderJobTab(job) {
        return `
            <div class="tab-section">
                <div class="form-group">
                    <label>Job Title</label>
                    <input type="text" name="title" value="${job.title || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Company</label>
                    <input type="text" name="company" value="${job.company || ''}">
                </div>
                
                <div class="form-group">
                    <label>Post Date</label>
                    <input type="date" name="postDate" value="${job.postDate || ''}">
                </div>
                
                <div class="form-group">
                    <label>Short Description</label>
                    <textarea name="shortDescription" rows="3" placeholder="Brief summary of the position...">${job.shortDescription || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Notes</label>
                    <textarea name="notes" rows="4" placeholder="Your notes about this job...">${job.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    renderDetailsTab(job) {
        return `
            <div class="tab-section">
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" value="${job.location || ''}" placeholder="City, State or Remote">
                </div>
                
                <div class="form-group">
                    <label>Job URL</label>
                    <input type="url" name="url" value="${job.url || ''}" placeholder="Link to job posting">
                </div>
                
                <div class="form-group">
                    <label>Full Job Description</label>
                    <textarea name="description" rows="10" placeholder="Complete job description, requirements, responsibilities...">${job.description || ''}</textarea>
                </div>
            </div>
        `;
    }

    renderContactTab(job) {
        return `
            <div class="tab-section">
                <div class="form-group">
                    <label>Contact Name</label>
                    <input type="text" name="contactName" value="${job.contactName || ''}" placeholder="Recruiter or hiring manager name">
                </div>
                
                <div class="form-group">
                    <label>Contact Email</label>
                    <input type="email" name="contactEmail" value="${job.contactEmail || ''}" placeholder="Contact email address">
                </div>
                
                <div class="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" name="contactPhone" value="${job.contactPhone || ''}" placeholder="Contact phone number">
                </div>
                
                <div class="form-group">
                    <label>Contact Notes</label>
                    <textarea name="contactNotes" rows="3" placeholder="Additional contact information or notes...">${job.contactNotes || ''}</textarea>
                </div>
            </div>
        `;
    }

    renderHistoryTab(job) {
        return `
            <div class="tab-section">
                <h3>Status History</h3>
                <div class="status-history">
                    ${this.renderStatusHistory(job)}
                </div>
            </div>

            <div class="tab-section">
                <h3>Activity Log</h3>
                <div class="job-logs">
                    ${this.renderJobLogs(job)}
                </div>
            </div>
        `;
    }

    renderResumeTab(job) {
        if (!job.resumeId) {
            const availableResumes = this.getAvailableResumes();
            
            if (availableResumes.length === 0) {
                return `
                    <div class="tab-section">
                        <div class="empty-state">
                            <i class="fa-solid fa-file-lines"></i>
                            <h3>No Resumes Available</h3>
                            <p>You don't have any saved resumes yet. Create a resume first, then associate it with this job.</p>
                            <button type="button" class="btn btn-primary" data-click="handleCreateResume">
                                Create Resume
                            </button>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="tab-section">
                    <div class="resume-selection">
                        <h3>Select a Resume to Associate</h3>
                        <p>Choose from your available resumes or create a new tailored one for this job.</p>
                        
                        <div class="resume-list">
                            ${availableResumes.map(resume => `
                                <div class="resume-card" data-resume-id="${resume.id}" data-action="associate-resume">
                                    <div class="resume-card-content">
                                        <div class="resume-card-header">
                                            <h4>${resume.name || 'Unnamed Resume'}</h4>
                                            <span class="resume-date">${new Date(resume.savedDate).toLocaleDateString()}</span>
                                        </div>
                                        <div class="resume-card-details">
                                            <div class="resume-basics">
                                                <strong>${resume.resume?.basics?.name || 'No name'}</strong>
                                                <span>${resume.resume?.basics?.label || 'No title'}</span>
                                            </div>
                                            <div class="resume-stats">
                                                ${resume.resume?.work?.length || 0} jobs • 
                                                ${resume.resume?.skills?.length || 0} skills • 
                                                ${resume.resume?.education?.length || 0} education
                                            </div>
                                        </div>
                                    </div>
                                    <div class="resume-card-actions">
                                        <button type="button" class="btn btn-primary btn-sm" data-resume-id="${resume.id}" data-action="associate-resume">
                                            Associate
                                        </button>
                                        <button type="button" class="btn btn-secondary btn-sm" data-resume-id="${resume.id}" data-action="preview-resume">
                                            Preview
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="resume-actions">
                            <button type="button" class="btn btn-secondary" data-click="handleCreateTailoredResume">
                                Create Tailored Resume for This Job
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Get the resume data
        const resumeData = this.getResumeData(job.resumeId);
        
        if (!resumeData) {
            return `
                <div class="tab-section">
                    <div class="empty-state">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <h3>Resume Not Found</h3>
                        <p>The associated resume (ID: ${job.resumeId}) could not be loaded.</p>
                        <button type="button" class="btn btn-secondary" data-click="handleAssociateResume">
                            Associate Different Resume
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tab-section">
                <div class="resume-header">
                    <h3>${resumeData.name || 'Tailored Resume'}</h3>
                    <div class="resume-meta">
                        <span>Last modified: ${new Date(resumeData.savedDate).toLocaleString()}</span>
                        <div class="resume-controls">
                            <select class="template-selector" data-action="change-template">
                                <option value="basic">Basic Template</option>
                                <option value="modern">Modern Template</option>
                                <option value="compact">Compact Template</option>
                                <option value="elegant">Elegant Template</option>
                            </select>
                            <button type="button" class="btn btn-primary btn-sm" data-click="handleViewResume">
                                Open in Editor
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="resume-viewer-container">
                    <resume-json id="job-resume-viewer" template="basic"></resume-json>
                </div>
            </div>
        `;
    }

    updateResumeViewer() {
        const resumeViewer = this.shadowRoot.querySelector('#job-resume-viewer');
        if (resumeViewer && this._selectedJob?.resumeId) {
            const resumeData = this.getResumeData(this._selectedJob.resumeId);
            if (resumeData) {
                resumeViewer.resumeData = resumeData.resume || resumeData;
            }
        }
    }

    getAvailableResumes() {
        // Try to get resume data from the main app
        if (window.app && typeof window.app.getSavedResumes === 'function') {
            return window.app.getSavedResumes() || [];
        }
        
        // Fallback: try to get from localStorage directly
        try {
            return JSON.parse(localStorage.getItem('saved_resumes') || '[]');
        } catch (e) {
            console.error('Error loading saved resumes:', e);
            return [];
        }
    }

    getResumeData(resumeId) {
        // Try to get resume data from the main app
        if (window.app && typeof window.app.getSavedResumes === 'function') {
            const savedResumes = window.app.getSavedResumes();
            return savedResumes.find(resume => resume.id === resumeId);
        }
        
        // Fallback: try to get from localStorage directly
        try {
            const savedResumes = JSON.parse(localStorage.getItem('saved_resumes') || '[]');
            return savedResumes.find(resume => resume.id === resumeId);
        } catch (e) {
            console.error('Error loading resume data:', e);
            return null;
        }
    }


    renderStatusHistory(job) {
        if (!job.statusHistory || job.statusHistory.length === 0) {
            return '<div class="empty-text">No status changes recorded</div>';
        }

        return job.statusHistory.map(change => `
            <div class="status-history-item">
                <div>
                    <span class="status-${change.from}">${change.from}</span> → 
                    <span class="status-${change.to}">${change.to}</span>
                </div>
                <div class="log-timestamp">${new Date(change.date).toLocaleString()}</div>
                ${change.notes ? `<div class="status-notes">${change.notes}</div>` : ''}
            </div>
        `).join('');
    }

    renderJobLogs(job) {
        if (!job.logs || job.logs.length === 0) {
            return '<div class="empty-text">No activity recorded</div>';
        }

        return job.logs.map(log => `
            <div class="log-entry">
                <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="log-action">${log.action}</div>
                ${log.details ? `<div class="log-details">${JSON.stringify(log.details)}</div>` : ''}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Handle all clicks using event delegation
        this.shadowRoot.addEventListener('click', (e) => {
            const clickable = e.target.closest('[data-click]');
            if (clickable) {
                const action = clickable.dataset.click;
                if (typeof this[action] === 'function') {
                    this[action](e);
                }
            }
            
            // Handle tab clicks
            const tab = e.target.closest('[data-tab]');
            if (tab) {
                this.handleTabSwitch(tab.dataset.tab);
            }
            
            // Handle resume actions
            const resumeAction = e.target.closest('[data-action]');
            if (resumeAction) {
                this.handleResumeAction(resumeAction.dataset.action, resumeAction.dataset.resumeId);
            }
        });

        // Handle template selector changes
        this.shadowRoot.addEventListener('change', (e) => {
            if (e.target.classList.contains('template-selector')) {
                this.handleTemplateChange(e.target.value);
            }
        });

        // Handle form submissions
        this.shadowRoot.addEventListener('submit', (e) => {
            e.preventDefault();
            if (e.target.id === 'job-edit-modal-form') {
                this.handleSaveJob(e);
            } else if (e.target.id === 'job-detail-form') {
                this.handleSaveJobDetail(e);
            }
        });

        // Handle auto-save on form changes
        this.shadowRoot.addEventListener('input', (e) => {
            const form = e.target.closest('#job-detail-form');
            if (form && this._selectedJob) {
                this.debouncedAutoSave();
            }
        });

        this.shadowRoot.addEventListener('change', (e) => {
            const form = e.target.closest('#job-detail-form');
            if (form && this._selectedJob) {
                this.debouncedAutoSave();
            }
        });
    }

    handleTabSwitch(tabName) {
        // Remove active class from all tabs and content
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        const selectedTab = this.shadowRoot.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = this.shadowRoot.querySelector(`[data-content="${tabName}"]`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
        }
    }

    debouncedAutoSave() {
        // Clear existing timeout
        if (this._autoSaveTimeout) {
            clearTimeout(this._autoSaveTimeout);
        }
        
        // Set new timeout for auto-save
        this._autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, 1000); // Wait 1 second after user stops typing
    }

    performAutoSave() {
        if (!this._selectedJob || this._isAutoSaving) return;
        
        this._isAutoSaving = true;
        this.updateAutoSaveStatus('saving');
        
        const form = this.shadowRoot.querySelector('#job-detail-form');
        if (!form) {
            this._isAutoSaving = false;
            return;
        }
        
        const formData = new FormData(form);
        
        // Update the selected job with form data
        this._selectedJob.title = formData.get('title') || '';
        this._selectedJob.company = formData.get('company') || '';
        this._selectedJob.postDate = formData.get('postDate') || '';
        this._selectedJob.shortDescription = formData.get('shortDescription') || '';
        this._selectedJob.location = formData.get('location') || '';
        this._selectedJob.url = formData.get('url') || '';
        this._selectedJob.description = formData.get('description') || '';
        this._selectedJob.notes = formData.get('notes') || '';
        this._selectedJob.contactName = formData.get('contactName') || '';
        this._selectedJob.contactEmail = formData.get('contactEmail') || '';
        this._selectedJob.contactPhone = formData.get('contactPhone') || '';
        this._selectedJob.contactNotes = formData.get('contactNotes') || '';
        this._selectedJob.dateUpdated = new Date().toISOString();
        
        // Save to local storage and update jobs list
        this._jobs[this._selectedJob.id] = this._selectedJob;
        saveJob(this._selectedJob);
        addJobLog(this._selectedJob.id, 'Job auto-saved');
        
        this._isAutoSaving = false;
        this.updateAutoSaveStatus('saved');
        
        // Update job card in the sidebar without full re-render
        this.updateJobCard();
    }

    updateAutoSaveStatus(status) {
        const statusElement = this.shadowRoot.querySelector('.auto-save-status');
        if (!statusElement) return;
        
        switch (status) {
            case 'saving':
                statusElement.textContent = 'Saving...';
                statusElement.className = 'auto-save-status saving';
                break;
            case 'saved':
                statusElement.textContent = 'Saved';
                statusElement.className = 'auto-save-status saved';
                setTimeout(() => {
                    statusElement.textContent = '';
                    statusElement.className = 'auto-save-status';
                }, 2000);
                break;
            default:
                statusElement.textContent = '';
                statusElement.className = 'auto-save-status';
        }
    }

    updateJobCard() {
        // Update the job card title and company in the sidebar
        const selectedJobCard = this.shadowRoot.querySelector('.job-card.selected');
        if (selectedJobCard && this._selectedJob) {
            const titleElement = selectedJobCard.querySelector('.job-card-title');
            const companyElement = selectedJobCard.querySelector('.job-card-company');
            
            if (titleElement) {
                titleElement.textContent = this._selectedJob.title || 'Untitled Position';
            }
            if (companyElement) {
                companyElement.textContent = this._selectedJob.company || 'Unnamed Company';
            }
        }
        
        // Update the header
        const headerTitle = this.shadowRoot.querySelector('.job-detail-title');
        const headerCompany = this.shadowRoot.querySelector('.job-detail-company');
        
        if (headerTitle && this._selectedJob) {
            headerTitle.textContent = this._selectedJob.title || 'Untitled Position';
        }
        if (headerCompany && this._selectedJob) {
            headerCompany.textContent = this._selectedJob.company || 'Unnamed Company';
        }
    }

    handleResumeAction(action, resumeId) {
        switch (action) {
            case 'associate-resume':
                this.associateResumeWithJob(resumeId);
                break;
            case 'preview-resume':
                this.previewResume(resumeId);
                break;
            case 'change-template':
                // Handled by change event listener
                break;
        }
    }

    handleTemplateChange(template) {
        const resumeViewer = this.shadowRoot.querySelector('#job-resume-viewer');
        if (resumeViewer) {
            resumeViewer.setAttribute('template', template);
        }
    }

    associateResumeWithJob(resumeId) {
        if (!this._selectedJob || !resumeId) return;
        
        // Associate the resume with the job
        associateResumeWithJob(this._selectedJob.id, resumeId);
        addJobLog(this._selectedJob.id, 'Resume associated', { resumeId });
        
        // Update the local job data
        this._selectedJob.resumeId = resumeId;
        this._jobs[this._selectedJob.id] = this._selectedJob;
        
        // Re-render to show the resume
        this.render();
        this.setupEventListeners();
    }

    previewResume(resumeId) {
        const resumeData = this.getResumeData(resumeId);
        if (!resumeData) return;
        
        // Create a modal with the resume preview
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal" style="max-width: 90vw; max-height: 90vh; overflow: auto;">
                <div class="modal-header">
                    <h3 class="modal-title">Resume Preview: ${resumeData.name || 'Unnamed Resume'}</h3>
                    <button type="button" class="btn btn-secondary modal-close">Close</button>
                </div>
                <div style="padding: 1rem;">
                    <resume-json template="basic"></resume-json>
                </div>
            </div>
        `;
        
        const resumeViewer = modal.querySelector('resume-json');
        resumeViewer.resumeData = resumeData.resume || resumeData;
        
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
        document.body.appendChild(modal);
    }

    handleCreateResume() {
        // Navigate to resume creation
        if (window.app && typeof window.app.createNewResume === 'function') {
            window.app.createNewResume();
        } else {
            // Fallback: try to navigate to the main resume editor
            window.location.href = 'index.html';
        }
    }

    handleCreateTailoredResume() {
        if (!this._selectedJob) return;
        
        const jobInfo = {
            id: this._selectedJob.id,
            title: this._selectedJob.title,
            company: this._selectedJob.company,
            description: this._selectedJob.description
        };

        // Call the API to generate a tailored resume
        if (window.app && typeof window.app.generateTailoredResume === 'function') {
            window.app.generateTailoredResume(jobInfo);
        } else {
            // Fallback: create a new resume with job context
            this.handleCreateResume();
        }
    }

    showJobFormModal() {
        const job = createDefaultJob();
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Add Job</h3>
                </div>
                <form id="job-edit-modal-form">
                    <div class="form-group">
                        <label for="edit-job-title">Job Title</label>
                        <input type="text" id="edit-job-title" name="title" value="${job.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-job-company">Company</label>
                        <input type="text" id="edit-job-company" name="company" value="${job.company || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-job-location">Location</label>
                        <input type="text" id="edit-job-location" name="location" value="${job.location || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-job-url">URL</label>
                        <input type="url" id="edit-job-url" name="url" value="${job.url || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-job-description">Description</label>
                        <textarea id="edit-job-description" name="description">${job.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-job-notes">Notes</label>
                        <textarea id="edit-job-notes" name="notes">${job.notes || ''}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        // Cancel closes modal
        modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
        // Remove modal on outside click
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        // Save job on submit
        modal.querySelector('#job-edit-modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveJob(e, false);
            modal.remove();
        });
        document.body.appendChild(modal);
    }

    handleAddJob(e) {
        this._selectedJob = null;
        this.showJobFormModal();
        return true;
    }

    handleSelectJob(e) {
        const jobCard = e.target.closest('.job-card');
        if (!jobCard) return false;
        
        const jobId = jobCard.dataset.jobId;
        if (!jobId) return false;
        
        this._selectedJob = this._jobs[jobId];
        this.render();
        return true;
    }


    handleUpdateStatus(e) {
        if (!this._selectedJob) return false;
        
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Update Job Status</h3>
                </div>
                <div class="form-group">
                    <label for="status">New Status</label>
                    <select id="status">
                        ${JOB_STATUSES.map(status => 
                            `<option value="${status}" ${this._selectedJob.status === status ? 'selected' : ''}>${status}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea id="notes" placeholder="Optional notes about this status change"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-click="closeModal">Cancel</button>
                    <button class="btn btn-primary" data-click="saveStatusUpdate">Save</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        modal.querySelector('[data-click="closeModal"]').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('[data-click="saveStatusUpdate"]').addEventListener('click', () => {
            const newStatus = modal.querySelector('#status').value;
            const notes = modal.querySelector('#notes').value;
            
            updateJobStatus(this._selectedJob.id, newStatus, notes);
            addJobLog(this._selectedJob.id, 'Status updated', { from: this._selectedJob.status, to: newStatus, notes });
            
            this._selectedJob = this._jobs[this._selectedJob.id];
            modal.remove();
            this.render();
            this.setupEventListeners();
        });

        document.body.appendChild(modal);
        return false;
    }

    handleViewResume(e) {
        if (!this._selectedJob?.resumeId) return false;
        
        // Load and display the tailored resume
        window.app.loadNamedResume(this._selectedJob.resumeId);
        return false;
    }

    handleAssociateResume(e) {
        if (!this._selectedJob) return false;
        
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Associate Resume</h3>
                </div>
                <div class="form-group">
                    <label>Select an existing resume or create a new tailored one</label>
                    <div class="resume-list">
                        ${this.renderResumeList()}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-click="closeModal">Cancel</button>
                    <button class="btn btn-primary" data-click="createTailoredResume">Create Tailored Resume</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        modal.querySelector('[data-click="closeModal"]').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('[data-click="createTailoredResume"]').addEventListener('click', () => {
            // Create a new tailored resume for this job
            const jobInfo = {
                id: this._selectedJob.id,
                title: this._selectedJob.title,
                company: this._selectedJob.company,
                description: this._selectedJob.description
            };

            // Call the API to generate a tailored resume
            window.app.generateTailoredResume(jobInfo);
            modal.remove();
        });

        // Add event listeners for resume selection
        modal.querySelectorAll('.resume-item').forEach(item => {
            item.addEventListener('click', () => {
                const resumeId = item.dataset.id;
                associateResumeWithJob(this._selectedJob.id, resumeId);
                addJobLog(this._selectedJob.id, 'Resume associated', { resumeId });
                this._selectedJob = this._jobs[this._selectedJob.id];
                modal.remove();
                this.render();
                this.setupEventListeners();
            });
        });

        document.body.appendChild(modal);
        return false;
    }

    renderResumeList() {
        const savedResumes = window.app.getSavedResumes();
        
        if (!savedResumes || savedResumes.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fa-solid fa-file-lines"></i>
                    <p>No saved resumes found. Create a new tailored resume for this job.</p>
                </div>
            `;
        }

        return savedResumes.map(resume => `
            <div class="resume-item" data-id="${resume.id}">
                <div class="resume-item-info">
                    <div class="resume-item-name">${resume.name}</div>
                    <div class="resume-item-details">
                        <span>${resume.basics.name}</span>
                        <span>${resume.basics.label}</span>
                    </div>
                    <div class="resume-item-date">
                        Last modified: ${new Date(resume.savedDate).toLocaleString()}
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleDeleteJob(e) {
        if (!this._selectedJob) return false;
        if (confirm(`Are you sure you want to delete the job "${this._selectedJob.title}" at "${this._selectedJob.company}"?`)) {
            deleteJob(this._selectedJob.id);
            delete this._jobs[this._selectedJob.id];
            this._selectedJob = null;
            this.render();
            this.setupEventListeners();
            return true;
        }
        return false;
    }

    handleSaveJob(e, isEdit) {
        const form = e.target;
        const formData = new FormData(form);
        let job = isEdit && this._selectedJob ? this._selectedJob : createDefaultJob();
        job.title = formData.get('title') || '';
        job.company = formData.get('company') || '';
        job.location = formData.get('location') || '';
        job.url = formData.get('url') || '';
        job.description = formData.get('description') || '';
        job.notes = formData.get('notes') || '';
        job.dateUpdated = new Date().toISOString();
        this._jobs[job.id] = job;
        saveJob(job);
        addJobLog(job.id, isEdit ? 'Job updated' : 'Job created');
        this._selectedJob = job;
        this.render();
        this.setupEventListeners();
    }

    handleSaveJobDetail(e) {
        if (!this._selectedJob) return false;
        
        // Clear any pending auto-save
        if (this._autoSaveTimeout) {
            clearTimeout(this._autoSaveTimeout);
        }
        
        // Perform immediate save
        this.performManualSave();
        
        return true;
    }

    performManualSave() {
        if (!this._selectedJob) return;
        
        this.updateAutoSaveStatus('saving');
        
        const form = this.shadowRoot.querySelector('#job-detail-form');
        if (!form) return;
        
        const formData = new FormData(form);
        
        // Update the selected job with form data
        this._selectedJob.title = formData.get('title') || '';
        this._selectedJob.company = formData.get('company') || '';
        this._selectedJob.postDate = formData.get('postDate') || '';
        this._selectedJob.shortDescription = formData.get('shortDescription') || '';
        this._selectedJob.location = formData.get('location') || '';
        this._selectedJob.url = formData.get('url') || '';
        this._selectedJob.description = formData.get('description') || '';
        this._selectedJob.notes = formData.get('notes') || '';
        this._selectedJob.contactName = formData.get('contactName') || '';
        this._selectedJob.contactEmail = formData.get('contactEmail') || '';
        this._selectedJob.contactPhone = formData.get('contactPhone') || '';
        this._selectedJob.contactNotes = formData.get('contactNotes') || '';
        this._selectedJob.dateUpdated = new Date().toISOString();
        
        // Save to local storage and update jobs list
        this._jobs[this._selectedJob.id] = this._selectedJob;
        saveJob(this._selectedJob);
        addJobLog(this._selectedJob.id, 'Job manually saved');
        
        this.updateAutoSaveStatus('saved');
        this.updateJobCard();
    }
}

customElements.define('job-manager', JobManager); 