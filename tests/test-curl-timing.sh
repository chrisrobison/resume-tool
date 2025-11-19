#!/bin/bash

# AI Proxy Timing Test Script
# Tests both direct API calls and proxy calls to measure timing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 AI Proxy Timing Test"
echo "======================="
echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not set in environment${NC}"
    echo "Please enter your Claude API key (or press Enter to skip direct test):"
    read -s ANTHROPIC_API_KEY
    echo ""
fi

# Test prompt sizes
TINY_PROMPT='test'
MEDIUM_PROMPT='You are an expert resume writer. Please tailor the following resume:
{
  "basics": { "name": "Test User", "email": "test@example.com" },
  "work": [{ "company": "Tech Co", "position": "Engineer", "highlights": ["Built systems", "Led team"] }],
  "skills": [{ "name": "Languages", "keywords": ["Python", "JavaScript"] }]
}

Job: Senior Engineer with Python/JavaScript. Respond with JSON: {"tailoredResume": {...}, "changes": [...]}'

echo "Test 1: Direct API Call (Claude)"
echo "================================="
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Testing with medium-sized prompt (${#MEDIUM_PROMPT} chars)..."
    echo ""

    START_TIME=$(date +%s%N)

    RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        -X POST https://api.anthropic.com/v1/messages \
        -H "Content-Type: application/json" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "anthropic-dangerous-direct-browser-access: true" \
        -d "{
            \"model\": \"claude-3-5-sonnet-20241022\",
            \"max_tokens\": 4000,
            \"messages\": [{
                \"role\": \"user\",
                \"content\": \"$MEDIUM_PROMPT\"
            }]
        }")

    END_TIME=$(date +%s%N)
    DURATION=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
    CURL_TIME=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -2)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Direct API call succeeded${NC}"
        echo -e "${BLUE}⏱️  Wall time: ${DURATION}s${NC}"
        echo -e "${BLUE}⏱️  Curl time: ${CURL_TIME}s${NC}"
        echo ""
        echo "Response preview:"
        echo "$BODY" | jq -r '.content[0].text' 2>/dev/null | head -c 300 || echo "$BODY" | head -c 300
        echo "..."
    else
        echo -e "${RED}❌ Direct API call failed (HTTP $HTTP_CODE)${NC}"
        echo -e "${BLUE}⏱️  Failed after: ${DURATION}s${NC}"
        echo ""
        echo "Error:"
        echo "$BODY" | head -c 500
    fi
else
    echo -e "${YELLOW}⏩ Skipped (no API key)${NC}"
fi

echo ""
echo ""
echo "Test 2: Proxy API Call (via ai-proxy.php)"
echo "=========================================="

# Check if we should use the API key or rely on .env
if [ -n "$ANTHROPIC_API_KEY" ]; then
    API_KEY_JSON="\"apiKey\": \"$ANTHROPIC_API_KEY\","
    echo "Testing with provided API key..."
else
    API_KEY_JSON=""
    echo "Testing with server .env API key..."
fi

echo "Testing with medium-sized prompt (${#MEDIUM_PROMPT} chars)..."
echo ""

START_TIME=$(date +%s%N)

RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" \
    -X POST https://cdr2.com/job-tool/ai-proxy.php \
    -H "Content-Type: application/json" \
    -d "{
        \"apiType\": \"claude\",
        $API_KEY_JSON
        \"prompt\": \"$MEDIUM_PROMPT\",
        \"operation\": \"test-timing\"
    }")

END_TIME=$(date +%s%N)
DURATION=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
CURL_TIME=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -2)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Proxy API call succeeded${NC}"
    echo -e "${BLUE}⏱️  Wall time: ${DURATION}s${NC}"
    echo -e "${BLUE}⏱️  Curl time: ${CURL_TIME}s${NC}"
    echo ""
    echo "Response preview:"
    echo "$BODY" | jq -r '.content[0].text' 2>/dev/null | head -c 300 || echo "$BODY" | head -c 300
    echo "..."
elif [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
    echo -e "${RED}❌ Proxy API call failed (connection error or timeout)${NC}"
    echo -e "${BLUE}⏱️  Failed after: ${DURATION}s${NC}"

    if (( $(echo "$DURATION >= 60" | bc -l) )); then
        echo ""
        echo -e "${YELLOW}⚠️  This looks like a TIMEOUT issue!${NC}"
        echo "The request failed after ~60 seconds, suggesting the curl timeout in ai-proxy.php is too short."
        echo ""
        echo "The timeout has been updated to 300s. Check that the change is in effect:"
        echo "  grep -n CURLOPT_TIMEOUT /home/cdr/domains/cdr2.com/www/job-tool/ai-proxy.php"
    fi

    echo ""
    echo "Error:"
    echo "$BODY" | head -c 500
else
    echo -e "${RED}❌ Proxy API call failed (HTTP $HTTP_CODE)${NC}"
    echo -e "${BLUE}⏱️  Failed after: ${DURATION}s${NC}"
    echo ""
    echo "Error:"
    echo "$BODY" | head -c 500
fi

echo ""
echo ""
echo "💡 Analysis"
echo "==========="

# Additional diagnostics
echo "Checking PHP timeout settings..."
PHP_MAX_EXEC=$(php -r 'echo ini_get("max_execution_time");' 2>/dev/null)
if [ -n "$PHP_MAX_EXEC" ]; then
    echo -e "PHP max_execution_time: ${BLUE}${PHP_MAX_EXEC}s${NC}"
    if [ "$PHP_MAX_EXEC" -lt "300" ] && [ "$PHP_MAX_EXEC" != "0" ]; then
        echo -e "${YELLOW}⚠️  PHP max_execution_time is less than 300s. Consider increasing it.${NC}"
    fi
else
    echo "Unable to check PHP settings (php command not found)"
fi

echo ""
echo "Checking ai-proxy.php curl timeout..."
CURL_TIMEOUT=$(grep -A 1 'CURLOPT_TIMEOUT' /home/cdr/domains/cdr2.com/www/job-tool/ai-proxy.php | grep -oP '\d+' | head -1)
if [ -n "$CURL_TIMEOUT" ]; then
    echo -e "PHP curl timeout: ${BLUE}${CURL_TIMEOUT}s${NC}"
    if [ "$CURL_TIMEOUT" -lt "300" ]; then
        echo -e "${YELLOW}⚠️  Curl timeout is less than 300s. This may cause timeouts for large requests.${NC}"
    else
        echo -e "${GREEN}✅ Curl timeout looks good (${CURL_TIMEOUT}s)${NC}"
    fi
fi

echo ""
echo "📋 Recommendations:"
echo "  1. For browser testing, open: https://cdr2.com/job-tool/test-ai-timing.html"
echo "  2. Check live logs: tail -f /home/cdr/domains/cdr2.com/www/job-tool/ai.log"
echo "  3. If proxy still times out, check PHP-FPM/Apache timeout settings"
echo ""
