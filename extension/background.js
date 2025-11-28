// background.js - Background Service Worker for Job Hunt Manager Extension
// Handles context menus, commands, and storage operations

/**
 * Extension state
 */
let savedJobsCount = 0;

/**
 * Initialize extension
 */
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Job Hunt Manager Extension installed');

    // Create context menu
    chrome.contextMenus.create({
        id: 'save-job',
        title: 'Save to Job Hunt Manager',
        contexts: ['page', 'selection'],
        documentUrlPatterns: [
            'https://www.linkedin.com/jobs/*',
            'https://www.indeed.com/viewjob*',
            'https://www.glassdoor.com/job-listing/*',
            'https://www.glassdoor.ca/job-listing/*'
        ]
    });

    // Load saved jobs count
    await updateBadge();
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-job') {
        extractAndSaveJob(tab);
    }
});

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener((command) => {
    if (command === 'save-job') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                extractAndSaveJob(tabs[0]);
            }
        });
    }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'extractJob':
            handleExtractJob(request, sender, sendResponse);
            return true; // Keep channel open for async response

        case 'saveJob':
            handleSaveJob(request, sender, sendResponse);
            return true;

        case 'getJobs':
            handleGetJobs(sendResponse);
            return true;

        case 'deleteJob':
            handleDeleteJob(request, sendResponse);
            return true;

        case 'updateJobStatus':
            handleUpdateJobStatus(request, sendResponse);
            return true;

        case 'getBadgeCount':
            sendResponse({ count: savedJobsCount });
            break;

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

/**
 * Extract and save job from current tab
 */
async function extractAndSaveJob(tab) {
    try {
        // Inject content script if not already present
        await ensureContentScript(tab.id);

        // Request job extraction
        chrome.tabs.sendMessage(tab.id, { action: 'extractJob' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Extraction error:', chrome.runtime.lastError);
                showNotification('Error', 'Failed to extract job details');
                return;
            }

            if (response && response.success) {
                saveJobData(response.job)
                    .then(() => {
                        showNotification('Job Saved!', `${response.job.title} at ${response.job.company}`);
                        updateBadge();
                    })
                    .catch((error) => {
                        console.error('Save error:', error);
                        showNotification('Save Failed', error.message);
                    });
            } else {
                showNotification('Extraction Failed', response?.error || 'Unknown error');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error', error.message);
    }
}

/**
 * Ensure content script is injected
 */
async function ensureContentScript(tabId) {
    try {
        // Check if content script is already loaded
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        if (response && response.pong) {
            return true;
        }
    } catch (error) {
        // Content script not loaded, inject it
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content-script.js']
            });
            return true;
        } catch (injectError) {
            console.error('Failed to inject content script:', injectError);
            throw injectError;
        }
    }
}

/**
 * Handle extract job message
 */
async function handleExtractJob(request, sender, sendResponse) {
    // Content script will handle extraction
    sendResponse({ success: true });
}

/**
 * Handle save job message
 */
async function handleSaveJob(request, sender, sendResponse) {
    try {
        await saveJobData(request.job);
        await updateBadge();
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle get jobs message
 */
async function handleGetJobs(sendResponse) {
    try {
        const jobs = await getJobsFromStorage();
        sendResponse({ success: true, jobs });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle delete job message
 */
async function handleDeleteJob(request, sendResponse) {
    try {
        await deleteJobFromStorage(request.jobId);
        await updateBadge();
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle update job status message
 */
async function handleUpdateJobStatus(request, sendResponse) {
    try {
        await updateJobStatusInStorage(request.jobId, request.status);
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Save job data to storage
 */
async function saveJobData(job) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['jobs'], (result) => {
            const jobs = result.jobs || [];

            // Check for duplicates (by URL or title+company)
            const isDuplicate = jobs.some(existingJob =>
                (job.url && existingJob.url === job.url) ||
                (existingJob.title === job.title && existingJob.company === job.company)
            );

            if (isDuplicate) {
                reject(new Error('Job already saved'));
                return;
            }

            // Add metadata
            job.id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            job.createdAt = new Date().toISOString();
            job.status = job.status || 'wishlist';
            job.source = 'extension';

            // Add to jobs array
            jobs.unshift(job); // Add to beginning

            // Save back to storage
            chrome.storage.local.set({ jobs }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(job);
                }
            });
        });
    });
}

/**
 * Get jobs from storage
 */
async function getJobsFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['jobs'], (result) => {
            resolve(result.jobs || []);
        });
    });
}

/**
 * Delete job from storage
 */
async function deleteJobFromStorage(jobId) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['jobs'], (result) => {
            const jobs = result.jobs || [];
            const filteredJobs = jobs.filter(j => j.id !== jobId);

            chrome.storage.local.set({ jobs: filteredJobs }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    });
}

/**
 * Update job status in storage
 */
async function updateJobStatusInStorage(jobId, newStatus) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['jobs'], (result) => {
            const jobs = result.jobs || [];
            const job = jobs.find(j => j.id === jobId);

            if (!job) {
                reject(new Error('Job not found'));
                return;
            }

            // Update status
            job.status = newStatus;
            job.updatedAt = new Date().toISOString();

            // Add to status history
            if (!job.statusHistory) {
                job.statusHistory = [];
            }
            job.statusHistory.push({
                status: newStatus,
                date: new Date().toISOString()
            });

            // Save back
            chrome.storage.local.set({ jobs }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(job);
                }
            });
        });
    });
}

/**
 * Update badge with job count
 */
async function updateBadge() {
    const jobs = await getJobsFromStorage();
    savedJobsCount = jobs.length;

    // Update badge
    if (savedJobsCount > 0) {
        chrome.action.setBadgeText({ text: savedJobsCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#3498db' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

/**
 * Show notification
 */
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 1
    });
}

/**
 * Listen for storage changes (to sync between tabs)
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.jobs) {
        updateBadge();
    }
});

// Initialize on startup
updateBadge();
