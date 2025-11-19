<?php
// ai-proxy.php with dotenv support

// Load .env if present
function load_env($path = '.env') {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (!strpos($line, '=')) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
        }
    }
}

load_env(__DIR__ . '/.env');

header('Content-Type: application/json');
$allowed_origins = $_ENV['ALLOWED_ORIGINS'] ?? '*';
header('Access-Control-Allow-Origin: ' . $allowed_origins);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Read and decode JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}
file_put_contents("ai.log", "input:\n".json_encode($input)."\n--\n", FILE_APPEND);

$apiType = $input['apiType'] ?? '';
$apiKey = $input['apiKey'] ?? '';
$prompt = $input['prompt'] ?? '';
$resume = $input['resume'] ?? null;
$operation = $input['operation'] ?? null;
$requestedModel = $input['model'] ?? null;
$targetUrl = $input['targetUrl'] ?? null;
$instructions = $input['instructions'] ?? null;
$jobFilters = $input['jobFilters'] ?? null;

// If operation requests server-side fetch + parse, fetch the target URL and embed content
if (($operation === 'parse-job' || $operation === 'parse-job-list') && $targetUrl) {
    // Fetch the target URL content server-side
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Increased timeout for page fetch
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    $page = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || !$page) {
        // leave prompt as-is; downstream will handle
        $pageText = '';
    } else {
        // Strip scripts/styles and tags, collapse whitespace, limit size
        $pageText = preg_replace('#<script(.*?)>(.*?)</script>#is', ' ', $page);
        $pageText = preg_replace('#<style(.*?)>(.*?)</style>#is', ' ', $pageText);
        $pageText = strip_tags($pageText);
        $pageText = preg_replace('/\s+/', ' ', $pageText);
        $pageText = trim($pageText);
        if (strlen($pageText) > 20000) {
            $pageText = substr($pageText, 0, 20000);
        }
    }

    // Build a focused parsing prompt for the AI
    if ($operation === 'parse-job') {
        $parsePrompt = "You are an expert at extracting structured data from job postings. Return ONLY a single JSON object (no commentary) with the following keys if available: title, company, location, description, requirements, skills, seniority, employmentType, postedDate, applyUrl, rawText. Use null for missing values.\n\n";
        if ($instructions) {
            $parsePrompt .= "Additional instructions: " . $instructions . "\n\n";
        }
        $parsePrompt .= "Page content (server-fetched):\n" . $pageText . "\n\nRespond with the JSON object only.";
        // Override prompt with the parse prompt
        $prompt = $parsePrompt;
    } else {
        $maxJobs = 20;
        if (is_array($jobFilters) && isset($jobFilters['maxJobs'])) {
            $maxJobs = (int)$jobFilters['maxJobs'];
        }
        if ($maxJobs < 1) $maxJobs = 1;
        if ($maxJobs > 50) $maxJobs = 50;

        $keywordInstruction = '';
        if (is_array($jobFilters) && isset($jobFilters['keywords'])) {
            $keywordList = $jobFilters['keywords'];
            if (!is_array($keywordList)) {
                $keywordList = [$keywordList];
            }
            $keywordList = array_filter(array_map('trim', $keywordList));
            if (!empty($keywordList)) {
                $keywordInstruction = "Focus on roles that align with these keywords: " . implode(', ', $keywordList) . ". Add a matchedKeywords array per job noting which of these keywords appear.\n";
            }
        }

        $parsePrompt = "You are an expert at extracting structured data from a collection of job postings. Return ONLY a JSON array (no commentary) of job objects. Each object should include, when available: id, title, company, location, remote (boolean), summary, description, requirements (array), responsibilities (array), skills (array), tags (array), matchedKeywords (array), jobType, postedDate, compensation, applyUrl, sourceUrl, rawText.\n";
        $parsePrompt .= "Limit the list to at most {$maxJobs} distinct positions. Normalize text fields and keep descriptions under 4000 characters.\n";
        if ($keywordInstruction) {
            $parsePrompt .= $keywordInstruction;
        }
        if ($instructions) {
            $parsePrompt .= "Additional instructions: " . $instructions . "\n";
        }
        $parsePrompt .= "Server-fetched page content:\n" . $pageText . "\n\nRespond with the JSON array only.";
        $prompt = $parsePrompt;
    }
}

// Use .env API key if not provided in request
if (!$apiKey) {
    if ($apiType === 'claude') {
        $apiKey = $_ENV['ANTHROPIC_API_KEY'] ?? '';
    } elseif ($apiType === 'openai') {
        $apiKey = $_ENV['OPENAI_API_KEY'] ?? '';
    }
}

// Validate required fields
if (!$apiType || !$apiKey || !$prompt) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

function post_json($url, $headers, $body) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_TIMEOUT, 300); // Increased to 5 minutes for AI processing
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30); // Separate connection timeout
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$response, $status, $err];
}

if ($apiType === 'claude') {
    $model = $requestedModel ?: ($_ENV['CLAUDE_MODEL'] ?? 'claude-3-7-sonnet-20250219');
    $url = 'https://api.anthropic.com/v1/messages';
    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        'anthropic-dangerous-direct-browser-access: true'
    ];
    $body = [
        'model' => $model,
        'max_tokens' => 10000,
        'temperature' => 0.3,
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ];
    if ($operation) $body['system'] = $operation;
} elseif ($apiType === 'openai') {
    $model = $requestedModel ?: ($_ENV['OPENAI_MODEL'] ?? 'gpt-4o');
    $useResponses = stripos($model, 'o1') === 0;
    $url = $useResponses ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions';
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];
    if ($useResponses) {
        $body = [
            'model' => $model,
            'input' => $prompt,
            'max_output_tokens' => 10000
        ];
    } else {
        $body = [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'max_tokens' => 10000,
            'temperature' => 0.3
        ];
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid apiType']);
    exit;
}

list($response, $status, $err) = post_json($url, $headers, $body);

if ($err) {
    http_response_code(500);
    echo json_encode(['error' => 'Curl error: ' . $err]);
    exit;
}

file_put_contents("ai.log", json_encode($response), FILE_APPEND);
http_response_code($status);
echo $response;
