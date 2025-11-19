<?php
/**
 * Test script for feed-proxy.php
 * Run from command line: php test-feed-proxy.php
 */

echo "Testing feed-proxy.php...\n\n";

// Test 1: Valid HN RSS URL
echo "Test 1: Fetching HN Jobs feed\n";
$testUrl = 'https://hnrss.org/whoishiring/jobs.jsonfeed?count=5';
$proxyUrl = 'http://localhost/job-tool/feed-proxy.php?url=' . urlencode($testUrl);

echo "URL: $testUrl\n";
echo "Proxy URL: $proxyUrl\n";

$ch = curl_init($proxyUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";

if ($response) {
    $data = json_decode($response, true);
    if ($data && $data['success']) {
        echo "✓ SUCCESS: Retrieved feed data\n";
        echo "  Cached: " . ($data['cached'] ? 'yes' : 'no') . "\n";
        if (isset($data['data']['items'])) {
            echo "  Items: " . count($data['data']['items']) . "\n";
            echo "  First item title: " . ($data['data']['items'][0]['title'] ?? 'N/A') . "\n";
        }
    } else {
        echo "✗ FAILED: " . ($data['error'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "✗ FAILED: No response\n";
}

echo "\n";

// Test 2: Invalid URL (should be blocked)
echo "Test 2: Testing security (blocked host)\n";
$testUrl = 'https://evil.com/malicious';
$proxyUrl = 'http://localhost/job-tool/feed-proxy.php?url=' . urlencode($testUrl);

$ch = curl_init($proxyUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";

if ($response) {
    $data = json_decode($response, true);
    if ($data && !$data['success'] && $httpCode === 403) {
        echo "✓ SUCCESS: Blocked unauthorized host\n";
        echo "  Error: " . ($data['error'] ?? 'N/A') . "\n";
    } else {
        echo "✗ FAILED: Should have blocked this request\n";
    }
} else {
    echo "✗ FAILED: No response\n";
}

echo "\n";

// Test 3: Cache test (second request should be cached)
echo "Test 3: Testing cache\n";
$testUrl = 'https://hnrss.org/whoishiring/jobs.jsonfeed?count=1';
$proxyUrl = 'http://localhost/job-tool/feed-proxy.php?url=' . urlencode($testUrl);

echo "First request (should be live):\n";
$ch = curl_init($proxyUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response1 = curl_exec($ch);
curl_close($ch);

$data1 = json_decode($response1, true);
echo "  Cached: " . ($data1['cached'] ? 'yes' : 'no') . "\n";

echo "Second request (should be cached):\n";
$ch = curl_init($proxyUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$response2 = curl_exec($ch);
curl_close($ch);

$data2 = json_decode($response2, true);
echo "  Cached: " . ($data2['cached'] ? 'yes' : 'no') . "\n";

if ($data2 && $data2['cached']) {
    echo "✓ SUCCESS: Cache is working\n";
} else {
    echo "✗ FAILED: Cache not working\n";
}

echo "\n";
echo "All tests completed!\n";
