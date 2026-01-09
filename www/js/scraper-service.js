// scraper-service.js - Client-side job scraping service
// Interface for triggering and managing job board scraping

import { getAuthClient } from './sync/auth-client.js';
import { getDataService } from './data-service.js';
import { getSyncManager } from './sync/sync-manager.js';

const POLL_INTERVAL = 2000; // Poll every 2 seconds

class ScraperService {
  constructor() {
    this.authClient = null;
    this.activeJobs = new Map();
    this.listeners = [];
  }

  /**
   * Initialize scraper service
   */
  async initialize() {
    this.authClient = await getAuthClient();
    return this;
  }

  /**
   * Get supported scraping sources
   */
  async getSources() {
    try {
      const response = await fetch('/api/scraper/sources');

      if (!response.ok) {
        throw new Error('Failed to get sources');
      }

      const data = await response.json();
      return data.sources;

    } catch (error) {
      console.error('Get sources error:', error);
      throw error;
    }
  }

  /**
   * Start a new scraping job
   */
  async startScraping(source, url, options = {}) {
    if (!this.authClient) {
      await this.initialize();
    }

    if (!this.authClient.isAuthenticated()) {
      throw new Error('Authentication required to scrape jobs');
    }

    try {
      const response = await this.authClient.request('/scraper/start', {
        method: 'POST',
        body: JSON.stringify({
          source,
          url,
          options
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start scraping');
      }

      const data = await response.json();

      // Start polling for status
      this.startPolling(data.jobId);

      this.notifyListeners('started', {
        jobId: data.jobId,
        source,
        url
      });

      return data;

    } catch (error) {
      console.error('Start scraping error:', error);
      throw error;
    }
  }

  /**
   * Get status of a scraping job
   */
  async getStatus(jobId) {
    if (!this.authClient) {
      await this.initialize();
    }

    if (!this.authClient.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    try {
      const response = await this.authClient.request(`/scraper/status/${jobId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get status');
      }

      const data = await response.json();
      return data.job;

    } catch (error) {
      console.error('Get status error:', error);
      throw error;
    }
  }

  /**
   * Get results of a completed scraping job
   */
  async getResults(jobId) {
    if (!this.authClient) {
      await this.initialize();
    }

    if (!this.authClient.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    try {
      const response = await this.authClient.request(`/scraper/results/${jobId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get results');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Get results error:', error);
      throw error;
    }
  }

  /**
   * Import scraped jobs into job-tool
   */
  async importJobs(jobId, selectedJobs = null) {
    try {
      // Get results
      const results = await this.getResults(jobId);
      const jobsToImport = selectedJobs || results.jobs;

      if (!jobsToImport || jobsToImport.length === 0) {
        throw new Error('No jobs to import');
      }

      const dataService = await getDataService();
      const syncManager = await getSyncManager();

      const imported = [];
      const skipped = [];
      const errors = [];

      for (const job of jobsToImport) {
        try {
          // Check if job already exists (by URL or title+company)
          const existing = await this.checkDuplicate(job);

          if (existing) {
            skipped.push({
              job,
              reason: 'duplicate',
              existingId: existing.id
            });
            continue;
          }

          // Generate new job ID if needed
          if (!job.id || !job.id.startsWith('job_')) {
            job.id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          // Ensure required fields
          job.status = job.status || 'saved';
          job.dateCreated = job.dateCreated || new Date().toISOString();
          job.dateUpdated = job.dateUpdated || new Date().toISOString();
          job.statusHistory = job.statusHistory || [];
          job.logs = job.logs || [];

          // Save to IndexedDB
          await dataService.saveJob(job);

          // Queue for sync
          await syncManager.queueChange('job', job.id, 'create', job);

          imported.push(job);

        } catch (error) {
          console.error(`Error importing job ${job.title}:`, error);
          errors.push({
            job,
            error: error.message
          });
        }
      }

      this.notifyListeners('imported', {
        jobId,
        total: jobsToImport.length,
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length
      });

      return {
        success: true,
        imported,
        skipped,
        errors,
        stats: {
          total: jobsToImport.length,
          imported: imported.length,
          skipped: skipped.length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('Import jobs error:', error);
      throw error;
    }
  }

  /**
   * Check if job already exists (duplicate detection)
   */
  async checkDuplicate(job) {
    const dataService = await getDataService();

    // Get all jobs
    const allJobs = await dataService.getAllJobs();

    if (!allJobs || allJobs.length === 0) {
      return null;
    }

    // Check by URL
    if (job.url) {
      const byUrl = allJobs.find(existing => existing.url === job.url);
      if (byUrl) return byUrl;
    }

    // Check by title + company
    if (job.title && job.company) {
      const byTitleCompany = allJobs.find(existing =>
        existing.title === job.title && existing.company === job.company
      );
      if (byTitleCompany) return byTitleCompany;
    }

    return null;
  }

  /**
   * Delete a scraping job
   */
  async deleteJob(jobId) {
    if (!this.authClient) {
      await this.initialize();
    }

    if (!this.authClient.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    try {
      // Stop polling if active
      this.stopPolling(jobId);

      const response = await this.authClient.request(`/scraper/job/${jobId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete job');
      }

      return await response.json();

    } catch (error) {
      console.error('Delete job error:', error);
      throw error;
    }
  }

  /**
   * Get all active scraping jobs
   */
  async getActiveJobs() {
    if (!this.authClient) {
      await this.initialize();
    }

    if (!this.authClient.isAuthenticated()) {
      return [];
    }

    try {
      const response = await this.authClient.request('/scraper/active', {
        method: 'GET'
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.jobs;

    } catch (error) {
      console.error('Get active jobs error:', error);
      return [];
    }
  }

  /**
   * Start polling for job status
   */
  startPolling(jobId) {
    if (this.activeJobs.has(jobId)) {
      return; // Already polling
    }

    const pollJob = async () => {
      try {
        const status = await this.getStatus(jobId);

        this.notifyListeners('statusUpdate', {
          jobId,
          status: status.status,
          progress: status.progress,
          stats: status.stats
        });

        // Stop polling if completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          this.stopPolling(jobId);

          this.notifyListeners(status.status, {
            jobId,
            jobs: status.jobs,
            stats: status.stats,
            error: status.error
          });
        }

      } catch (error) {
        console.error(`Polling error for job ${jobId}:`, error);
        this.stopPolling(jobId);

        this.notifyListeners('error', {
          jobId,
          error: error.message
        });
      }
    };

    // Start polling
    const intervalId = setInterval(pollJob, POLL_INTERVAL);
    this.activeJobs.set(jobId, intervalId);

    // Initial poll
    pollJob();
  }

  /**
   * Stop polling for job status
   */
  stopPolling(jobId) {
    const intervalId = this.activeJobs.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling() {
    for (const intervalId of this.activeJobs.values()) {
      clearInterval(intervalId);
    }
    this.activeJobs.clear();
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of scraper events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({
          event,
          timestamp: new Date().toISOString(),
          ...data
        });
      } catch (error) {
        console.error('Error in scraper listener:', error);
      }
    });
  }
}

// Export singleton instance
let scraperServiceInstance = null;

export async function getScraperService() {
  if (!scraperServiceInstance) {
    scraperServiceInstance = new ScraperService();
    await scraperServiceInstance.initialize();
  }
  return scraperServiceInstance;
}

export default ScraperService;
