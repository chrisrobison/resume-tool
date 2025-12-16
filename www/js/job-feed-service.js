// Job Feed Service - client-side helper to interact with job feed automation endpoints

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json'
};

async function handleResponse(response) {
    if (!response.ok) {
        let errorText = `Request failed with status ${response.status}`;
        try {
            const data = await response.json();
            errorText = data.error || errorText;
        } catch (err) {
            // ignore parse error, fall back to default text
        }
        throw new Error(errorText);
    }
    return response.json();
}

export async function fetchJobFeedSources() {
    const response = await fetch('/api/job-feeds/sources');
    const data = await handleResponse(response);
    return data.sources || [];
}

export async function fetchJobFeedQueue() {
    const response = await fetch('/api/job-feeds/queue');
    const data = await handleResponse(response);
    return {
        queue: data.queue || [],
        recent: data.recent || []
    };
}

export async function queueJobFeedFetch(task) {
    const response = await fetch('/api/job-feeds/queue', {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(task)
    });
    const data = await handleResponse(response);
    return data.task;
}

export async function reportJobFeedResults(taskId, items) {
    const response = await fetch('/api/job-feeds/results', {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ taskId, items })
    });
    const data = await handleResponse(response);
    return data.task;
}

