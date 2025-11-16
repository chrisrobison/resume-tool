# Testing AI Connection Route Settings

## Issue Fixed
The AI settings were not respecting the "Connection Route" dropdown selection (Direct/Auto/Proxy). The settings are now auto-saved when changed, and the route is properly passed to the AI worker.

## Changes Made

### 1. Auto-save for Route Changes (`components/settings-manager.js`)
**Problem**: Route changes were only saved when clicking "Save Settings" button
**Fix**: Route, model, and apiKey fields now auto-save immediately upon change

### 2. Legacy localStorage Route Support (`components/ai-assistant-worker.js`)
**Problem**: Legacy localStorage API keys were hardcoded to use 'auto' route
**Fix**: Now checks settings for route preference even with legacy keys

### 3. Enhanced Logging
**Added**: Detailed console logging to trace route selection through the system

---

## How to Test

### Quick Browser Console Test

1. **Open the application**:
   ```
   https://cdr2.com/job-tool/jobs-new.html
   ```

2. **Open browser console** (F12 → Console)

3. **Run this test script**:
   ```javascript
   (async function testRouteSettings() {
       console.log('🧪 Testing AI Route Settings...\n');

       // Get global store
       const store = document.querySelector('global-store');
       if (!store) {
           console.error('❌ Global store not found');
           return;
       }

       // Get current settings
       const state = store.state || {};
       const settings = state.settings || {};
       const apiProviders = settings.apiProviders || {};

       console.log('📋 Current Settings:');
       console.log('-------------------');

       // Check each provider
       ['claude', 'openai'].forEach(provider => {
           const config = apiProviders[provider] || {};
           console.log(`\n${provider.toUpperCase()}:`);
           console.log(`  Enabled: ${config.enabled ? '✅' : '❌'}`);
           console.log(`  API Key: ${config.apiKey ? '✅ Set' : '❌ Not set'}`);
           console.log(`  Model: ${config.model || 'default'}`);
           console.log(`  Route: ${config.route || 'auto'} ${
               config.route === 'direct' ? '(Direct from browser)' :
               config.route === 'proxy' ? '(Server proxy)' :
               '(Auto: try direct, fallback proxy)'
           }`);
       });

       // Test getApiConfig if AI assistant is available
       console.log('\n\n🔍 Testing AI Assistant Config:');
       console.log('-------------------------------');

       const aiAssistant = document.querySelector('ai-assistant-worker');
       if (aiAssistant && typeof aiAssistant.getApiConfig === 'function') {
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
               console.error('❌ Error getting API config:', error.message);
           }
       } else {
           console.log('⚠️  AI Assistant component not found or not ready');
       }

       console.log('\n\n✅ Test complete!');
       console.log('\nTo change route settings:');
       console.log('1. Click Settings tab');
       console.log('2. Find your provider (Claude/OpenAI)');
       console.log('3. Change "Connection Route" dropdown');
       console.log('4. Setting auto-saves immediately (no "Save" button needed)');
       console.log('5. Re-run this test to verify\n');
   })();
   ```

### Manual Test Steps

#### Test 1: Route Selection Persistence

1. Open **Settings** tab
2. Find **Claude** provider settings
3. Change **Connection Route** to **"Direct (connect from browser)"**
4. Watch browser console - should see: `SettingsManager: Auto-saved route for claude`
5. Reload the page
6. Open **Settings** tab again
7. ✅ **Verify**: Route should still be "Direct"

#### Test 2: Route Respected in AI Calls

1. Set Claude route to **"Direct"**
2. Go to **AI Assistant** tab
3. Select a job and resume
4. Click **"Tailor Resume"**
5. Watch browser console during processing
6. ✅ **Verify**: Should see logs like:
   ```
   AIAssistantWorker getApiConfig - Added provider to list: claude, route: direct, model: claude-3-5-sonnet-20241022
   ```

#### Test 3: Fallback Behavior (Auto Route)

1. Set route to **"Auto"**
2. If direct connection fails, should see:
   ```
   Direct connection failed, trying server proxy...
   ```
3. ✅ **Verify**: System falls back to proxy automatically

#### Test 4: Force Proxy

1. Set route to **"Server Proxy"**
2. Trigger AI operation
3. ✅ **Verify**: Should skip direct connection and go straight to proxy

---

## Expected Console Logs

When route settings are working correctly, you should see:

### On Route Change:
```
SettingsManager: Auto-saved route for claude
Settings saved successfully
```

### On AI Operation:
```
AIAssistantWorker getApiConfig - Using route: direct for claude
AIAssistantWorker getApiConfig - Added provider to list: claude, route: direct, model: claude-3-5-sonnet-20241022
```

### In AI Worker:
```
Worker handleTailorResume - Received data: {route: "direct", ...}
```

---

## Troubleshooting

### Issue: Route not saving
**Check**: Open console and watch for "Auto-saved route" message when changing dropdown
**Fix**: Hard refresh page (Ctrl+Shift+R)

### Issue: Still using wrong route
**Check**: Run the browser console test script to see current settings
**Fix**: Clear localStorage: `localStorage.clear()` and reload

### Issue: Direct connection fails
**Check**: CORS errors in console
**Expected**: Should automatically fallback to proxy if route is "auto"

---

## What Changed

### File: `components/settings-manager.js`
- **Line 739-742**: Added auto-save logic for route, model, apiKey fields
- **Line 771-774**: Auto-save executes immediately on change

### File: `components/ai-assistant-worker.js`
- **Line 1143-1156**: Legacy localStorage now checks settings for route
- **Line 1185-1193**: Enhanced logging for route selection
- **Line 1208-1216**: Enhanced logging for fallback providers

---

## API Route Options

| Route    | Behavior | Use Case |
|----------|----------|----------|
| **auto** | Try direct from browser first, fallback to server proxy if CORS fails | **Recommended default** - Best reliability |
| **direct** | Force direct connection from browser, fail if CORS blocked | Testing, or if you know your API supports CORS |
| **proxy** | Always use server-side ai-proxy.php | Required for URL parsing, or if browser blocks API |

---

## Verification Checklist

- [ ] Route dropdown changes auto-save (no "Save" button needed)
- [ ] Route persists after page reload
- [ ] Console logs show correct route being used
- [ ] AI operations respect the selected route
- [ ] Auto fallback works (direct → proxy)
- [ ] Proxy-only mode works
- [ ] Direct-only mode works (or fails appropriately)

---

## Success Criteria

✅ **Settings auto-save**: Route changes save immediately
✅ **Route persistence**: Settings survive page reload
✅ **Route respected**: AI worker uses selected route
✅ **Fallback works**: Auto mode tries direct then proxy
✅ **Logging clear**: Console shows route selection

All criteria should now be met! 🎉
