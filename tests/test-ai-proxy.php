<?php
// test-ai-proxy.php - Command line test for ai-proxy.php

function test_ai_proxy($apiType, $prompt, $apiKey = null) {
    $url = 'http://localhost:8000/ai-proxy.php'; // Adjust URL as needed
    
    $data = [
        'apiType' => $apiType,
        'prompt' => $prompt
    ];
    
    if ($apiKey) {
        $data['apiKey'] = $apiKey;
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    echo "=== Testing $apiType ===\n";
    echo "Prompt: $prompt\n";
    echo "Status: $status\n";
    
    if ($error) {
        echo "Curl Error: $error\n";
        return false;
    }
    
    if ($status === 200) {
        $json = json_decode($response, true);
        if ($json) {
            // Extract actual AI response content
            if ($apiType === 'openai' && isset($json['choices'][0]['message']['content'])) {
                echo "Response: " . $json['choices'][0]['message']['content'] . "\n";
            } elseif ($apiType === 'claude' && isset($json['content'][0]['text'])) {
                echo "Response: " . $json['content'][0]['text'] . "\n";
            } else {
                echo "Raw Response: $response\n";
            }
        } else {
            echo "Raw Response: $response\n";
        }
    } else {
        echo "Error Response: $response\n";
    }
    
    echo "\n";
    return $status === 200;
}

// Test both providers
echo "AI Proxy Test Script\n";
echo "====================\n\n";

$test_prompt = "Hello! Please respond with a brief greeting and tell me what AI model you are.";

// Test OpenAI
$openai_success = test_ai_proxy('openai', $test_prompt);

// Test Claude
$claude_success = test_ai_proxy('claude', $test_prompt);

// Summary
echo "=== Test Summary ===\n";
echo "OpenAI: " . ($openai_success ? "SUCCESS" : "FAILED") . "\n";
echo "Claude: " . ($claude_success ? "SUCCESS" : "FAILED") . "\n";

if ($openai_success || $claude_success) {
    echo "\nAt least one provider is working correctly!\n";
} else {
    echo "\nBoth providers failed. Check:\n";
    echo "1. Server is running (php -S localhost:8000)\n";
    echo "2. API keys are set in .env file\n";
    echo "3. Network connectivity\n";
}