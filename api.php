<?php
/**
 * Central API for Job Tool Application
 *
 * Endpoints:
 *   - ?x=search : Job search using jobsearch.py
 *   - ?x=tailor : Resume tailoring using AI
 *   - ?x=letter : Cover letter generation using AI
 *
 * All endpoints expect JSON in the request body
 */

// Enable CORS for local development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

$in = $_REQUEST;
$out = [];
$data = json_decode(file_get_contents('php://input'), true);

// Handle JSON decode errors
if (json_last_error() !== JSON_ERROR_NONE && !empty(file_get_contents('php://input'))) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON in request body: ' . json_last_error_msg()]);
    exit();
}

if (isset($in['x'])) {
    try {
        switch ($in['x']) {
            case "search":
                $out = doSearch($data);
                break;
            case "tailor":
                $out = doTailor($data);
                break;
            case "letter":
                $out = doLetter($data);
                break;
            default:
                http_response_code(400);
                $out = ['error' => 'Invalid endpoint. Use x=search, x=tailor, or x=letter'];
        }
    } catch (Exception $e) {
        http_response_code(500);
        $out = [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ];
    }
} else {
    http_response_code(400);
    $out = ['error' => 'Missing parameter x. Use x=search, x=tailor, or x=letter'];
}

header("Content-Type: application/json");
echo json_encode($out);

/**
 * Execute job search using jobsearch.py
 *
 * @param array $data Search parameters
 *   - searchTerm: Job search term (e.g., "software engineer")
 *   - location: Job location (e.g., "San Francisco, CA")
 *   - sites: Array of sites to search ["indeed", "linkedin", "zip_recruiter", "google"]
 *   - results: Number of results wanted (default: 20)
 *   - hoursOld: Filter jobs by hours since posted (default: 72)
 *   - country: Country for Indeed searches (default: USA)
 *   - outputFormat: "json" or "csv" (default: json)
 *   - remoteOnly: Filter for remote jobs only (default: false)
 *
 * @return array Search results or error
 */
function doSearch($data) {
    // Validate required parameters
    if (empty($data['searchTerm'])) {
        throw new Exception('Missing required parameter: searchTerm');
    }

    // Get script path
    $scriptPath = __DIR__ . '/jobsearch.py';

    if (!file_exists($scriptPath)) {
        throw new Exception('jobsearch.py not found at: ' . $scriptPath);
    }

    // Ensure script is executable
    if (!is_executable($scriptPath)) {
        chmod($scriptPath, 0755);
    }

    // Prepare JSON input for jobsearch.py
    $searchConfig = [
        'searchTerm' => $data['searchTerm'] ?? 'software engineer',
        'location' => $data['location'] ?? 'San Francisco, CA',
        'sites' => $data['sites'] ?? ['indeed', 'linkedin', 'zip_recruiter', 'google'],
        'results' => intval($data['results'] ?? 20),
        'hoursOld' => intval($data['hoursOld'] ?? 72),
        'country' => $data['country'] ?? 'USA',
        'outputFormat' => 'json', // Always use JSON for API
        'remoteOnly' => !empty($data['remoteOnly'])
    ];

    $jsonInput = json_encode($searchConfig);

    // Execute Python script with JSON input via stdin
    $command = "echo " . escapeshellarg($jsonInput) . " | python3 " . escapeshellarg($scriptPath) . " --json 2>&1";

    $output = shell_exec($command);

    if ($output === null) {
        throw new Exception('Failed to execute jobsearch.py');
    }

    // Parse JSON output
    $result = json_decode($output, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON from jobsearch.py: ' . $output);
    }

    return $result;
}

/**
 * Tailor resume to job description using AI
 *
 * @param array $data Tailoring parameters
 *   - resume: Resume object in JSON Resume format
 *   - jobDescription: Job description text
 *   - provider: AI provider ("claude" or "openai")
 *   - apiKey: API key for the provider
 *   - model: Model to use (optional)
 *   - includeAnalysis: Include match analysis (default: false)
 *
 * @return array Tailored resume and analysis
 */
function doTailor($data) {
    // Validate required parameters
    if (empty($data['resume'])) {
        throw new Exception('Missing required parameter: resume');
    }
    if (empty($data['jobDescription'])) {
        throw new Exception('Missing required parameter: jobDescription');
    }
    if (empty($data['provider'])) {
        throw new Exception('Missing required parameter: provider');
    }
    if (empty($data['apiKey'])) {
        throw new Exception('Missing required parameter: apiKey');
    }

    $provider = strtolower($data['provider']);
    $apiKey = $data['apiKey'];
    $resume = $data['resume'];
    $jobDescription = $data['jobDescription'];
    $model = $data['model'] ?? null;
    $includeAnalysis = !empty($data['includeAnalysis']);

    // Build prompt
    $resumeJson = json_encode($resume, JSON_PRETTY_PRINT);
    $analysisSection = $includeAnalysis ? ',
  "analysis": {
    "matchScore": 85,
    "strengths": [],
    "improvements": [],
    "missingSkills": []
  }' : '';

    $prompt = "You are an expert resume writer. Please tailor the following resume to match the job description provided.

JOB DESCRIPTION:
{$jobDescription}

CURRENT RESUME:
{$resumeJson}

Please provide your response as a JSON object with this exact structure:
{
  \"tailoredResume\": {
    // The complete tailored resume in JSON Resume format
  },
  \"changes\": [
    // Array of strings describing what changes were made
  ]{$analysisSection}
}

Focus on:
1. Highlighting relevant experience and skills
2. Using keywords from the job description
3. Quantifying achievements where possible
4. Maintaining truthfulness - only emphasize existing experience
" . ($includeAnalysis ? "5. Providing detailed match analysis and recommendations" : "");

    // Call appropriate AI provider
    if ($provider === 'claude') {
        return callClaudeAPI($apiKey, $prompt, $model);
    } elseif ($provider === 'openai') {
        return callOpenAIAPI($apiKey, $prompt, $model);
    } else {
        throw new Exception('Invalid provider. Use "claude" or "openai"');
    }
}

/**
 * Generate cover letter using AI
 *
 * @param array $data Cover letter parameters
 *   - resume: Resume object in JSON Resume format
 *   - jobDescription: Job description text
 *   - jobInfo: Object with job details (title, company, location)
 *   - provider: AI provider ("claude" or "openai")
 *   - apiKey: API key for the provider
 *   - model: Model to use (optional)
 *   - includeAnalysis: Include match analysis (default: true)
 *
 * @return array Cover letter and analysis
 */
function doLetter($data) {
    // Validate required parameters
    if (empty($data['resume'])) {
        throw new Exception('Missing required parameter: resume');
    }
    if (empty($data['jobDescription'])) {
        throw new Exception('Missing required parameter: jobDescription');
    }
    if (empty($data['provider'])) {
        throw new Exception('Missing required parameter: provider');
    }
    if (empty($data['apiKey'])) {
        throw new Exception('Missing required parameter: apiKey');
    }

    $provider = strtolower($data['provider']);
    $apiKey = $data['apiKey'];
    $resume = $data['resume'];
    $jobDescription = $data['jobDescription'];
    $jobInfo = $data['jobInfo'] ?? [];
    $model = $data['model'] ?? null;
    $includeAnalysis = isset($data['includeAnalysis']) ? $data['includeAnalysis'] : true;

    // Build prompt
    $resumeJson = json_encode($resume, JSON_PRETTY_PRINT);
    $company = $jobInfo['company'] ?? 'N/A';
    $title = $jobInfo['title'] ?? 'N/A';
    $location = $jobInfo['location'] ?? 'N/A';

    $analysisSection = $includeAnalysis ? ',
  "analysis": {
    "matchScore": 85,
    "alignedSkills": [],
    "uniqueValue": "",
    "recommendations": []
  }' : '';

    $prompt = "You are an expert cover letter writer. Please generate a compelling cover letter based on the resume and job information provided.

JOB INFORMATION:
Company: {$company}
Position: {$title}
Location: {$location}

JOB DESCRIPTION:
{$jobDescription}

RESUME:
{$resumeJson}

Please provide your response as a JSON object with this exact structure:
{
  \"coverLetter\": \"The complete cover letter text here...\",
  \"keyPoints\": [
    // Array of key selling points highlighted in the letter
  ]{$analysisSection}
}

Requirements:
1. Professional tone appropriate for the industry
2. Highlight relevant experience from the resume
3. Address the specific job requirements
4. Show enthusiasm and knowledge about the company
5. Include a strong opening and closing
" . ($includeAnalysis ? "6. Provide detailed analysis of job-candidate fit" : "");

    // Call appropriate AI provider
    if ($provider === 'claude') {
        return callClaudeAPI($apiKey, $prompt, $model);
    } elseif ($provider === 'openai') {
        return callOpenAIAPI($apiKey, $prompt, $model);
    } else {
        throw new Exception('Invalid provider. Use "claude" or "openai"');
    }
}

/**
 * Call Claude API
 *
 * @param string $apiKey Claude API key
 * @param string $prompt Prompt to send
 * @param string $model Model to use (optional)
 * @return array Parsed response
 */
function callClaudeAPI($apiKey, $prompt, $model = null) {
    $url = 'https://api.anthropic.com/v1/messages';
    $model = $model ?: 'claude-3-5-sonnet-20241022';

    $payload = [
        'model' => $model,
        'max_tokens' => 4000,
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ]
    ];

    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new Exception('Claude API request failed: ' . $error);
    }

    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('Claude API error (' . $httpCode . '): ' . $response);
    }

    $data = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON from Claude API: ' . json_last_error_msg());
    }

    // Extract text from Claude response
    if (empty($data['content'][0]['text'])) {
        throw new Exception('Invalid response format from Claude API');
    }

    $text = $data['content'][0]['text'];

    // Parse JSON from response
    return parseAIResponse($text);
}

/**
 * Call OpenAI API
 *
 * @param string $apiKey OpenAI API key
 * @param string $prompt Prompt to send
 * @param string $model Model to use (optional)
 * @return array Parsed response
 */
function callOpenAIAPI($apiKey, $prompt, $model = null) {
    $model = $model ?: 'gpt-4o';

    // Determine if we should use Responses API or Chat Completions
    $useResponses = (strpos(strtolower($model), 'gpt-5') === 0) ||
                    (strpos(strtolower($model), 'o1') === 0);

    $url = $useResponses ?
        'https://api.openai.com/v1/responses' :
        'https://api.openai.com/v1/chat/completions';

    $payload = $useResponses ? [
        'model' => $model,
        'input' => $prompt,
        'max_output_tokens' => 4000
    ] : [
        'model' => $model,
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 4000,
        'temperature' => 0.7
    ];

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new Exception('OpenAI API request failed: ' . $error);
    }

    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('OpenAI API error (' . $httpCode . '): ' . $response);
    }

    $data = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON from OpenAI API: ' . json_last_error_msg());
    }

    // Extract text from OpenAI response
    $text = null;

    if ($useResponses) {
        // Responses API format
        if (!empty($data['output_text'])) {
            $text = $data['output_text'];
        } elseif (!empty($data['output'])) {
            foreach ($data['output'] as $block) {
                if ($block['type'] === 'message' && !empty($block['content'])) {
                    foreach ($block['content'] as $content) {
                        if (in_array($content['type'], ['output_text', 'text']) && !empty($content['text'])) {
                            $text = $content['text'];
                            break 2;
                        }
                    }
                }
            }
        }
        // Fallback to choices if available
        if (!$text && !empty($data['choices'][0]['message']['content'])) {
            $text = $data['choices'][0]['message']['content'];
        }
    } else {
        // Chat Completions format
        if (empty($data['choices'][0]['message']['content'])) {
            throw new Exception('Invalid response format from OpenAI API');
        }
        $text = $data['choices'][0]['message']['content'];
    }

    if (!$text) {
        throw new Exception('Could not extract text from OpenAI API response');
    }

    // Parse JSON from response
    return parseAIResponse($text);
}

/**
 * Parse AI response text to extract JSON
 *
 * @param string $text Response text from AI
 * @return array Parsed JSON object
 */
function parseAIResponse($text) {
    // Try to extract JSON from markdown code blocks
    if (preg_match('/```json\s*([\s\S]*?)\s*```/i', $text, $matches)) {
        $jsonText = $matches[1];
    } elseif (preg_match('/```\s*([\s\S]*?)\s*```/i', $text, $matches)) {
        $jsonText = $matches[1];
    } elseif (preg_match('/(\{[\s\S]*\})/i', $text, $matches)) {
        $jsonText = $matches[1];
    } else {
        $jsonText = $text;
    }

    // Clean the JSON text
    $jsonText = trim($jsonText);

    $result = json_decode($jsonText, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Failed to parse JSON from AI response: ' . json_last_error_msg() . "\nResponse preview: " . substr($text, 0, 500));
    }

    return $result;
}
