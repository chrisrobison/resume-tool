const { randomUUID } = require('crypto');

const sources = {
    hackernews: {
        id: 'hackernews',
        name: "Hacker News – Who's Hiring",
        description: 'Monthly community thread of open roles shared on Hacker News.',
        supportsKeywords: true,
        cadence: 'monthly'
    },
    linkedin: {
        id: 'linkedin',
        name: 'LinkedIn Job Search',
        description: 'Keyword based search of LinkedIn job postings.',
        supportsKeywords: true,
        cadence: 'hourly'
    },
    indeed: {
        id: 'indeed',
        name: 'Indeed',
        description: 'Programmatic search against Indeed listings.',
        supportsKeywords: true,
        cadence: 'hourly'
    }
};

const fetchQueue = [];
const completedFetches = [];

function listSources() {
    return Object.values(sources);
}

function enqueueFetch({ sourceId, keywords = [], filters = {} }) {
    if (!sources[sourceId]) {
        throw new Error(`Unknown job feed source: ${sourceId}`);
    }

    const id = typeof randomUUID === 'function'
        ? randomUUID()
        : `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const task = {
        id,
        sourceId,
        keywords,
        filters,
        status: 'queued',
        createdAt: new Date().toISOString()
    };

    fetchQueue.push(task);
    return task;
}

function getQueue() {
    return fetchQueue;
}

function recordResults(taskId, items = []) {
    const task = fetchQueue.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.resultCount = Array.isArray(items) ? items.length : 0;

    completedFetches.unshift({
        taskId,
        sourceId: task.sourceId,
        recordedAt: new Date().toISOString(),
        resultCount: task.resultCount,
        preview: items.slice(0, 5)
    });

    // Prevent unbounded growth
    if (completedFetches.length > 50) {
        completedFetches.length = 50;
    }

    return task;
}

function getRecentResults(limit = 10) {
    return completedFetches.slice(0, limit);
}

module.exports = {
    listSources,
    enqueueFetch,
    getQueue,
    recordResults,
    getRecentResults
};

