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

$apiType = $input['apiType'] ?? '';
$apiKey = $input['apiKey'] ?? '';
$prompt = $input['prompt'] ?? '';
$resume = $input['resume'] ?? null;
$operation = $input['operation'] ?? null;

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
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$response, $status, $err];
}

if ($apiType === 'claude') {
    $model = $_ENV['CLAUDE_MODEL'] ?? 'claude-3-5-sonnet-20241022';
    $url = 'https://api.anthropic.com/v1/messages';
    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        'anthropic-dangerous-direct-browser-access: true'
    ];
    $body = [
        'model' => $model,
        'max_tokens' => 4000,
        'temperature' => 0.3,
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ];
    if ($operation) $body['system'] = $operation;
} elseif ($apiType === 'openai') {
    $model = $_ENV['OPENAI_MODEL'] ?? 'gpt-4o';
    $url = 'https://api.openai.com/v1/chat/completions';
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];
    $body = [
        'model' => $model,
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ],
        'max_tokens' => 4000,
        'temperature' => 0.3
    ];
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

http_response_code($status);
echo $response;
