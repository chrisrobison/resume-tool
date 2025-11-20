// scraper.js - Job scraping endpoints
// Trigger and manage job board scraping operations

const express = require('express');
const { scrapeHiringCafe } = require('../../scrapers/scrape-hiring-cafe');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// In-memory storage for scraping jobs (could be moved to database later)
const scrapingJobs = new Map();

/**
 * POST /api/scraper/start
 * Start a new scraping job
 *
 * Request body:
 * {
 *   source: 'hiring.cafe',
 *   url: 'https://hiring.cafe/?searchState=...',
 *   options: {
 *     waitTime: 5000,
 *     maxScrolls: 5
 *   }
 * }
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { source, url, options = {} } = req.body;

    if (!source || !url) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'source and url are required'
      });
    }

    // Validate source
    const supportedSources = ['hiring.cafe'];
    if (!supportedSources.includes(source)) {
      return res.status(400).json({
        error: 'Unsupported source',
        message: `Supported sources: ${supportedSources.join(', ')}`
      });
    }

    // Generate job ID
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create scraping job record
    const scrapingJob = {
      id: jobId,
      userId,
      source,
      url,
      options,
      status: 'queued', // queued, running, completed, failed
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      jobs: [],
      error: null,
      stats: {
        total: 0,
        imported: 0
      }
    };

    scrapingJobs.set(jobId, scrapingJob);

    // Start scraping in background (don't await)
    runScraper(jobId, source, url, options).catch(error => {
      console.error(`Scraping job ${jobId} failed:`, error);

      const job = scrapingJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
      }
    });

    res.json({
      success: true,
      jobId,
      message: 'Scraping job started',
      status: scrapingJob.status
    });

  } catch (error) {
    console.error('Start scraper error:', error);
    res.status(500).json({
      error: 'Failed to start scraper',
      message: error.message
    });
  }
});

/**
 * GET /api/scraper/status/:jobId
 * Get status of a scraping job
 */
router.get('/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    const scrapingJob = scrapingJobs.get(jobId);

    if (!scrapingJob) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Scraping job does not exist or has been cleaned up'
      });
    }

    // Verify ownership
    if (scrapingJob.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this scraping job'
      });
    }

    res.json({
      success: true,
      job: {
        id: scrapingJob.id,
        source: scrapingJob.source,
        status: scrapingJob.status,
        progress: scrapingJob.progress,
        startedAt: scrapingJob.startedAt,
        completedAt: scrapingJob.completedAt,
        stats: scrapingJob.stats,
        error: scrapingJob.error,
        // Only include jobs if completed
        jobs: scrapingJob.status === 'completed' ? scrapingJob.jobs : undefined
      }
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
});

/**
 * GET /api/scraper/results/:jobId
 * Get results of a completed scraping job
 */
router.get('/results/:jobId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    const scrapingJob = scrapingJobs.get(jobId);

    if (!scrapingJob) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Scraping job does not exist or has been cleaned up'
      });
    }

    // Verify ownership
    if (scrapingJob.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this scraping job'
      });
    }

    if (scrapingJob.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed',
        message: `Job is currently ${scrapingJob.status}`
      });
    }

    res.json({
      success: true,
      jobId,
      jobs: scrapingJob.jobs,
      stats: scrapingJob.stats
    });

  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({
      error: 'Failed to get results',
      message: error.message
    });
  }
});

/**
 * DELETE /api/scraper/job/:jobId
 * Cancel or clean up a scraping job
 */
router.delete('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;

    const scrapingJob = scrapingJobs.get(jobId);

    if (!scrapingJob) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Scraping job does not exist'
      });
    }

    // Verify ownership
    if (scrapingJob.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this scraping job'
      });
    }

    // Remove from memory
    scrapingJobs.delete(jobId);

    res.json({
      success: true,
      message: 'Scraping job deleted'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete job',
      message: error.message
    });
  }
});

/**
 * GET /api/scraper/sources
 * Get list of supported scraping sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = [
      {
        id: 'hiring.cafe',
        name: 'Hiring Cafe',
        description: 'Tech job board aggregator',
        url: 'https://hiring.cafe',
        supported: true,
        requiresUrl: true,
        urlExample: 'https://hiring.cafe/?searchState=%7B%22searchQuery%22%3A%22software+engineer%22%7D'
      }
      // Add more sources here in the future
    ];

    res.json({
      success: true,
      sources
    });

  } catch (error) {
    console.error('Sources error:', error);
    res.status(500).json({
      error: 'Failed to get sources',
      message: error.message
    });
  }
});

/**
 * GET /api/scraper/active
 * Get all active scraping jobs for current user
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const activeJobs = Array.from(scrapingJobs.values())
      .filter(job => job.userId === userId)
      .map(job => ({
        id: job.id,
        source: job.source,
        status: job.status,
        progress: job.progress,
        startedAt: job.startedAt,
        stats: job.stats
      }));

    res.json({
      success: true,
      jobs: activeJobs,
      count: activeJobs.length
    });

  } catch (error) {
    console.error('Active jobs error:', error);
    res.status(500).json({
      error: 'Failed to get active jobs',
      message: error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Run scraper in background
 */
async function runScraper(jobId, source, url, options) {
  const scrapingJob = scrapingJobs.get(jobId);
  if (!scrapingJob) return;

  try {
    scrapingJob.status = 'running';
    scrapingJob.progress = 10;

    let jobs = [];

    if (source === 'hiring.cafe') {
      // Run hiring.cafe scraper
      jobs = await scrapeHiringCafe(url, {
        ...options,
        outputPath: null // Don't save to file
      });
    }

    scrapingJob.progress = 90;
    scrapingJob.jobs = jobs;
    scrapingJob.stats.total = jobs.length;
    scrapingJob.progress = 100;
    scrapingJob.status = 'completed';
    scrapingJob.completedAt = new Date().toISOString();

    console.log(`✅ Scraping job ${jobId} completed: ${jobs.length} jobs found`);

  } catch (error) {
    console.error(`❌ Scraping job ${jobId} failed:`, error);
    scrapingJob.status = 'failed';
    scrapingJob.error = error.message;
    scrapingJob.completedAt = new Date().toISOString();
    throw error;
  }
}

/**
 * Cleanup old scraping jobs (run periodically)
 */
function cleanupOldJobs() {
  const maxAge = 60 * 60 * 1000; // 1 hour
  const now = Date.now();

  for (const [jobId, job] of scrapingJobs.entries()) {
    const age = now - new Date(job.startedAt).getTime();

    if (age > maxAge && (job.status === 'completed' || job.status === 'failed')) {
      scrapingJobs.delete(jobId);
      console.log(`Cleaned up old scraping job: ${jobId}`);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldJobs, 30 * 60 * 1000);

module.exports = router;
