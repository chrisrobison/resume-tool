<?php
/**
 * feed-proxy.php - Simple CORS proxy for RSS/JSON job feeds
 *
 * Handles requests to job feed sources that don't support CORS
 * or have strict referrer policies (e.g., hnrss.org)
 */

// ========= CONFIGURATION =========

// Allowed origins (your frontend domains)
const ALLOWED_ORIGINS = [
    'https://cdr2.com',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
];

// Whitelist of allowed feed sources (security: prevent SSRF attacks)
const ALLOWED_HOSTS = [
    'hnrss.org',           // Hacker News RSS
    'news.ycombinator.com', // Hacker News direct
    'api.github.com',      // GitHub Jobs (if we add this)
    'feeds.feedburner.com', // Generic RSS feeds
    'rss.app',             // RSS aggregator
];

// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 30;
const REQUEST_TIMEOUT = 15; // seconds
const CACHE_DURATION = 300; // 5 minutes

// ========= CORS HEADERS =========

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 600');
    }
    http_response_code(204);
    exit;
}

// Set CORS headers for actual requests
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

header('Content-Type: application/json; charset=utf-8');

// ========= HELPER FUNCTIONS =========

/**
 * Send error response
 */
function sendError($code, $message) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'code' => $code
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Check rate limiting (simple IP-based)
 */
function checkRateLimit() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = 'ratelimit_' . md5($ip);
    $file = sys_get_temp_dir() . '/' . $key;

    $now = time();
    $requests = [];

    if (file_exists($file)) {
        $requests = json_decode(file_get_contents($file), true) ?: [];
        $requests = array_filter($requests, function($timestamp) use ($now) {
            return ($now - $timestamp) < 60;
        });
    }

    if (count($requests) >= MAX_REQUESTS_PER_MINUTE) {
        sendError(429, 'Rate limit exceeded. Please try again later.');
    }

    $requests[] = $now;
    file_put_contents($file, json_encode($requests));
}

/**
 * Validate and parse target URL
 */
function validateUrl($url) {
    if (empty($url)) {
        sendError(400, 'URL parameter is required');
    }

    $parsed = parse_url($url);

    if (!$parsed || empty($parsed['host'])) {
        sendError(400, 'Invalid URL format');
    }

    // Check if host is whitelisted
    $host = strtolower($parsed['host']);
    $allowed = false;

    foreach (ALLOWED_HOSTS as $allowedHost) {
        if ($host === $allowedHost || str_ends_with($host, '.' . $allowedHost)) {
            $allowed = true;
            break;
        }
    }

    if (!$allowed) {
        sendError(403, 'Access to this host is not allowed: ' . $host);
    }

    // Prevent SSRF to private IPs
    $ip = gethostbyname($host);
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        sendError(403, 'Access to private IP ranges is not allowed');
    }

    return $url;
}

/**
 * Get cache key for URL
 */
function getCacheKey($url) {
    return sys_get_temp_dir() . '/feed_cache_' . md5($url);
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse($url) {
    $cacheFile = getCacheKey($url);

    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);

        if ($cacheData && (time() - $cacheData['timestamp']) < CACHE_DURATION) {
            return $cacheData['data'];
        }
    }

    return null;
}

/**
 * Cache response
 */
function cacheResponse($url, $data) {
    $cacheFile = getCacheKey($url);
    $cacheData = [
        'timestamp' => time(),
        'data' => $data
    ];
    file_put_contents($cacheFile, json_encode($cacheData));
}

/**
 * Fetch URL via cURL
 */
function fetchUrl($url) {
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => REQUEST_TIMEOUT,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'JobHuntManager/1.0 (Feed Aggregator)',
        CURLOPT_HTTPHEADER => [
            'Accept: application/json, application/feed+json, application/rss+xml, application/atom+xml, text/xml, */*',
            'Accept-Language: en-US,en;q=0.9',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = curl_error($ch);

    curl_close($ch);

    if ($error) {
        sendError(502, 'Failed to fetch feed: ' . $error);
    }

    if ($httpCode !== 200) {
        sendError($httpCode, 'Feed returned HTTP ' . $httpCode);
    }

    return [
        'data' => $response,
        'contentType' => $contentType
    ];
}

// ========= MAIN LOGIC =========

// Check rate limiting
checkRateLimit();

// Get URL from query parameter or POST body
$url = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $url = $_GET['url'] ?? null;
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $url = $input['url'] ?? null;
} else {
    sendError(405, 'Method not allowed');
}

// Validate URL
$url = validateUrl($url);

// Check cache
$cached = getCachedResponse($url);
if ($cached !== null) {
    echo json_encode([
        'success' => true,
        'data' => $cached,
        'cached' => true,
        'source' => 'cache'
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Fetch from source
$result = fetchUrl($url);

// Try to parse as JSON
$jsonData = json_decode($result['data'], true);

if (json_last_error() === JSON_ERROR_NONE) {
    // Valid JSON
    $responseData = $jsonData;
} else {
    // Not JSON (probably XML/RSS), return as string
    $responseData = $result['data'];
}

// Cache the response
cacheResponse($url, $responseData);

// Return response
echo json_encode([
    'success' => true,
    'data' => $responseData,
    'cached' => false,
    'source' => 'live',
    'contentType' => $result['contentType']
], JSON_UNESCAPED_SLASHES);
