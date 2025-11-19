# AI Integration Diagnostics

## Issues Identified

### 1. Claude/Anthropic Proxy Authentication Errors

**Problem**: The ai-proxy.php is receiving "invalid x-api-key" errors when making calls to Anthropic's API.

**Root Causes**:
- API keys stored in Settings may be invalid or expired
- API keys may not be properly configured in the Settings tab
- The .env file has API keys configured, but they're only used as fallback when no key is provided in the request

**Evidence from logs**:
```json
{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

### 2. Browser LLM Not Working

**Problem**: The local browser LLM (MLC WebLLM) may not be loading properly.

**Root Causes**:
- CDN script not loading: `https://unpkg.com/@mlc-ai/web-llm@0.2.79/lib/index.js`
- Local vendor script missing: `/vendor/web-llm/worker-llm.js`
- WebGPU or WebAssembly not supported in browser

**File**: `workers/browser-llm.js` attempts to load MLC WebLLM runtime

---

## Diagnostic Tests

### Test 1: Check API Key Configuration

Open browser console (F12) and run:

```javascript
(async function testApiKeys() {
    console.log('🔍 Testing API Key Configuration...\n');

    // Check localStorage (legacy)
    const legacyKey = localStorage.getItem('api_key');
    const legacyType = localStorage.getItem('api_type');
    console.log('📦 Legacy localStorage:');
    console.log(`  API Key: ${legacyKey ? '✅ Present (' + legacyKey.substring(0, 10) + '...)' : '❌ Not set'}`);
    console.log(`  API Type: ${legacyType || 'Not set'}`);

    // Check global store settings
    const store = document.querySelector('global-store');
    if (!store) {
        console.error('❌ Global store not found');
        return;
    }

    const settings = store.state?.settings;
    if (!settings) {
        console.error('❌ Settings not found in store');
        return;
    }

    console.log('\n⚙️  Current Settings:');
    const providers = settings.apiProviders || {};

    ['claude', 'openai', 'browser'].forEach(provider => {
        const config = providers[provider] || {};
        console.log(`\n  ${provider.toUpperCase()}:`);
        console.log(`    Enabled: ${config.enabled ? '✅' : '❌'}`);
        console.log(`    API Key: ${config.apiKey ? '✅ Present (' + config.apiKey.substring(0, 10) + '...)' : '❌ Not set'}`);
        console.log(`    Model: ${config.model || 'default'}`);
        console.log(`    Route: ${config.route || 'auto'}`);
    });

    // Test getApiConfig
    const aiAssistant = document.querySelector('ai-assistant-worker');
    if (aiAssistant && typeof aiAssistant.getApiConfig === 'function') {
        console.log('\n\n🔧 Testing AI Assistant getApiConfig():');
        try {
            const providerList = aiAssistant.getApiConfig();
            console.log(`✅ Provider list generated: ${providerList.length} provider(s)`);
            providerList.forEach((p, i) => {
                console.log(`\n  Provider ${i + 1}:`);
                console.log(`    Type: ${p.provider}`);
                console.log(`    Model: ${p.model}`);
                console.log(`    Route: ${p.route}`);
                console.log(`    API Key: ${p.apiKey ? '✅ Present' : '❌ Missing'}`);
            });
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    console.log('\n\n✅ Diagnostic complete!');
})();
```

### Test 2: Validate API Keys with Anthropic

To test if your Claude API key is valid, run this in browser console:

```javascript
(async function testAnthropicKey() {
    const store = document.querySelector('global-store');
    const settings = store?.state?.settings;
    const claudeKey = settings?.apiProviders?.claude?.apiKey;

    if (!claudeKey) {
        console.error('❌ No Claude API key configured');
        return;
    }

    console.log('🧪 Testing Claude API key with Anthropic...');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'test' }]
            })
        });

        if (response.ok) {
            console.log('✅ Claude API key is VALID');
            const data = await response.json();
            console.log('Response:', data);
        } else {
            const error = await response.json();
            console.error('❌ Claude API key is INVALID or has issues:');
            console.error(error);
        }
    } catch (error) {
        console.error('❌ Failed to test Claude API key:', error.message);
    }
})();
```

### Test 3: Check ai-proxy.php Endpoint

```javascript
(async function testAiProxy() {
    console.log('🧪 Testing ai-proxy.php endpoint...');

    const store = document.querySelector('global-store');
    const settings = store?.state?.settings;
    const claudeKey = settings?.apiProviders?.claude?.apiKey;

    if (!claudeKey) {
        console.error('❌ No Claude API key configured');
        return;
    }

    try {
        const response = await fetch('/job-tool/ai-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiType: 'claude',
                apiKey: claudeKey,
                prompt: 'Say "test successful" and nothing else.',
                model: 'claude-3-5-sonnet-20241022'
            })
        });

        if (response.ok) {
            console.log('✅ ai-proxy.php is working');
            const data = await response.json();
            console.log('Response:', data);
        } else {
            const errorText = await response.text();
            console.error('❌ ai-proxy.php error:');
            console.error(errorText);
        }
    } catch (error) {
        console.error('❌ Failed to test ai-proxy.php:', error.message);
    }
})();
```

### Test 4: Check Browser LLM Availability

```javascript
(async function testBrowserLLM() {
    console.log('🧪 Testing Browser LLM availability...\n');

    // Check WebGPU support
    console.log('🔍 Checking browser capabilities:');
    console.log(`  WebGPU: ${navigator.gpu ? '✅ Supported' : '❌ Not supported'}`);
    console.log(`  WebAssembly: ${typeof WebAssembly !== 'undefined' ? '✅ Supported' : '❌ Not supported'}`);
    console.log(`  Worker: ${typeof Worker !== 'undefined' ? '✅ Supported' : '❌ Not supported'}`);

    if (!navigator.gpu) {
        console.warn('⚠️  WebGPU is required for browser LLM. Your browser may not support it.');
        console.log('   Try Chrome/Edge 113+ or check chrome://flags/#enable-unsafe-webgpu');
        return;
    }

    // Test CDN availability
    console.log('\n🌐 Testing MLC WebLLM CDN:');
    try {
        const cdnTest = await fetch('https://unpkg.com/@mlc-ai/web-llm@0.2.79/lib/index.js', {
            method: 'HEAD'
        });
        console.log(`  CDN: ${cdnTest.ok ? '✅ Accessible' : '❌ Not accessible'}`);
    } catch (error) {
        console.error('  CDN: ❌ Not accessible -', error.message);
    }

    // Test local vendor path
    console.log('\n📁 Testing local vendor path:');
    try {
        const localTest = await fetch('/vendor/web-llm/worker-llm.js', {
            method: 'HEAD'
        });
        console.log(`  Local vendor: ${localTest.ok ? '✅ Available' : '❌ Not found'}`);
    } catch (error) {
        console.error('  Local vendor: ❌ Not found -', error.message);
    }

    console.log('\n✅ Browser LLM diagnostic complete!');
})();
```

---

## Solutions

### Fix 1: Configure Valid API Keys

1. **Get a valid API key**:
   - Claude: https://console.anthropic.com/settings/keys
   - OpenAI: https://platform.openai.com/api-keys

2. **Configure in Settings**:
   - Go to the **Settings** tab in the application
   - Find the Claude or OpenAI provider section
   - Check the "Enabled" checkbox
   - Paste your API key
   - Select your preferred model
   - Choose connection route (recommend "Auto")
   - Settings auto-save immediately

3. **Verify**:
   - Run Test 1 and Test 2 from above
   - Check that API key shows as "Present"
   - Test with Anthropic API should return success

### Fix 2: Troubleshoot ai-proxy.php

If the proxy is receiving "invalid-key", check:

1. **API Key in Request**:
   ```bash
   tail -20 /home/cdr/domains/cdr2.com/www/job-tool/ai.log
   ```
   Look for `"apiKey":"invalid-key"` or similar

2. **Check .env fallback keys**:
   ```bash
   # Keys in .env are ONLY used when no key is provided in request
   cat /home/cdr/domains/cdr2.com/www/job-tool/.env | grep ANTHROPIC_API_KEY
   ```

3. **Test proxy directly**:
   Run Test 3 from above

### Fix 3: Enable Browser LLM

**Option A: Use CDN (Recommended)**

The worker automatically tries to load from CDN. Just ensure:
- You have a modern browser (Chrome/Edge 113+)
- WebGPU is enabled: `chrome://flags/#enable-unsafe-webgpu`
- No firewall/ad-blocker blocking `unpkg.com`

**Option B: Install Local Vendor**

1. Create vendor directory:
   ```bash
   mkdir -p /home/cdr/domains/cdr2.com/www/job-tool/vendor/web-llm
   ```

2. Download MLC WebLLM:
   ```bash
   cd /home/cdr/domains/cdr2.com/www/job-tool/vendor/web-llm
   wget https://unpkg.com/@mlc-ai/web-llm@0.2.79/lib/index.js -O worker-llm.js
   ```

3. Test with Test 4 from above

**Option C: Disable Browser LLM**

If you don't need local LLM:
1. Go to Settings tab
2. Find "Browser" provider
3. Uncheck "Enabled"
4. Only Claude/OpenAI will be used

---

## Common Issues

### Issue: "No valid API providers configured"

**Cause**: No API keys set in Settings
**Fix**: Follow Fix 1 above

### Issue: "invalid x-api-key" in ai.log

**Cause**: API key is expired, invalid, or not properly copied
**Fix**:
1. Get a fresh API key from provider console
2. Copy entire key (including `sk-ant-` prefix for Claude)
3. Re-paste in Settings tab
4. Verify with Test 2

### Issue: "Browser LLM runtime unavailable"

**Cause**: WebGPU not supported or CDN/vendor files not loading
**Fix**: Follow Fix 3 above

### Issue: API calls work sometimes but not others

**Cause**: Using "Auto" route with intermittent CORS issues
**Fix**:
1. Change route to "Server Proxy" in Settings
2. This forces all requests through ai-proxy.php
3. Bypasses CORS restrictions

---

## Log Monitoring

Watch live logs:
```bash
tail -f /home/cdr/domains/cdr2.com/www/job-tool/ai.log
```

Clear logs:
```bash
> /home/cdr/domains/cdr2.com/www/job-tool/ai.log
```

---

## Quick Verification Checklist

- [ ] Claude/OpenAI API key configured in Settings
- [ ] API key starts with correct prefix (`sk-ant-` for Claude, `sk-` for OpenAI)
- [ ] Provider is "Enabled" in Settings
- [ ] Test 1 shows API key as "Present"
- [ ] Test 2 validates key with provider
- [ ] Test 3 confirms proxy works
- [ ] For Browser LLM: Test 4 shows WebGPU support
- [ ] Console shows no CORS errors
- [ ] ai.log shows no "invalid x-api-key" errors

---

## Need Help?

1. Run all diagnostic tests above
2. Copy console output
3. Check ai.log for recent errors
4. Report issue with diagnostic results
