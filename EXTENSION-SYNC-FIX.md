# Extension Sync Fix - CSP Issue Resolved

## Problem Identified

The console logs revealed a **Content Security Policy (CSP) violation**:

```
Executing inline script violates the following Content Security Policy directive
```

The bridge script was trying to inject inline JavaScript into the page, but Chrome's CSP blocked it. This prevented jobs saved in the extension from syncing to the web app.

---

## What Was Fixed

### 1. **bridge-script.js** - Complete Rewrite
**Location**: `extension/bridge-script.js`

**Changes**:
- ✅ Removed inline script injection (CSP violation)
- ✅ Rewrote to run entirely in content script context
- ✅ Still has full access to `chrome.storage.local`
- ✅ Still communicates with web app via `window.postMessage`
- ✅ Added automatic initial sync (1 second after load)
- ✅ Added periodic sync (every 30 seconds)
- ✅ Added real-time sync on storage changes
- ✅ Better logging for debugging

**How it works now**:
1. Bridge loads as content script on `localhost:3000`
2. Listens for `JHM_GET_JOBS` or `JHM_REQUEST_SYNC` messages from web app
3. Reads jobs from `chrome.storage.local`
4. Sends jobs to web app via `JHM_EXTENSION_DATA` message
5. Web app's extension-sync service receives and imports jobs

### 2. **extension-sync.js** - Improved Reliability
**Location**: `js/services/extension-sync.js`

**Changes**:
- ✅ Always sets up message listener (even if extension not detected initially)
- ✅ Triggers UI refresh immediately after importing jobs
- ✅ Dispatches custom `jhm-data-updated` event for global refresh
- ✅ Better logging

**Why this matters**:
- Previously, message listener only set up AFTER extension was detected
- If detection failed or was slow, messages from bridge were ignored
- Now listens from the start, catches all messages

---

## How to Test

### Step 1: Reload the Extension
**CRITICAL**: You must reload the extension for the fix to take effect!

1. Open `chrome://extensions`
2. Find "Job Hunt Manager - Job Saver"
3. Click the **Reload** button (🔄 circular arrow icon)
4. Keep the extension window open

### Step 2: Reload the Web App
1. Go to `http://localhost:3000/app-responsive.html`
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
3. Open browser console (F12)

### Step 3: Verify Bridge is Working
Look for these console messages:

```
JHM Bridge: Content script loaded
JHM Bridge: Initial sync - X jobs available
JHM Bridge: Ready (CSP-safe mode)
```

If you see these, the bridge is working! ✅

### Step 4: Check Extension Sync Service
Look for:

```
ExtensionSync: Initializing...
ExtensionSync: Extension detected, requesting initial sync
ExtensionSync: Received X jobs from extension
ExtensionSync: Importing X jobs...
ExtensionSync: Import complete - X imported, X skipped, X failed
```

### Step 5: Save a Test Job
1. Go to LinkedIn, Indeed, or Glassdoor job page
2. Click the blue "Save Job" button (bottom right)
3. Wait for "✓ Saved!" message
4. Switch back to `localhost:3000`
5. **Job should appear automatically within 1-30 seconds!**

You should see:
```
JHM Bridge: Extension storage changed, syncing...
JHM Bridge: Sending X jobs to web app
ExtensionSync: Received X jobs from extension
ExtensionSync: Importing job: [Job Title] at [Company]
```

---

## Diagnostic Tool

If sync still doesn't work, use the diagnostic tool:

```
http://localhost:3000/test-extension-sync.html
```

This will run 5 automated tests and tell you exactly what's working/broken:

1. ✅ Extension Detection
2. ✅ Bridge Script
3. ✅ IndexedDB Service
4. ✅ Extension Storage (Jobs)
5. ✅ Web App Storage (IndexedDB)

You can also click **"🔄 Trigger Manual Sync"** to force a sync.

---

## Expected Console Flow (When Working)

### On Page Load:
```
1. JHM Bridge: Content script loaded
2. ExtensionSync: Initializing...
3. ExtensionSync: Extension detected, requesting initial sync
4. JHM Bridge: Sync requested
5. JHM Bridge: Sending 0 jobs to web app
6. ExtensionSync: Received 0 jobs from extension
7. JHM Bridge: Ready (CSP-safe mode)
```

### When You Save a Job:
```
1. [LinkedIn/Indeed/Glassdoor page]
   content-script.js: Extracted job: [Title] at [Company]
   background.js: Job Saved!

2. [localhost:3000 page]
   JHM Bridge: Extension storage changed, syncing...
   JHM Bridge: Sending 1 jobs to web app
   ExtensionSync: Received 1 jobs from extension
   ExtensionSync: Importing job: [Title] at [Company]
   ExtensionSync: Import complete - 1 imported, 0 skipped, 0 failed
   ExtensionSync: Triggered UI refresh for 1 new jobs
```

### Periodic Sync (Every 30 Seconds):
```
JHM Bridge: Periodic sync - X jobs
ExtensionSync: Received X jobs from extension
ExtensionSync: Import complete - 0 imported, X skipped, 0 failed
```

---

## Troubleshooting

### Issue: No "JHM Bridge" messages in console
**Cause**: Bridge script not loading

**Fix**:
1. Check extension is installed: `chrome://extensions`
2. Verify extension has `localhost:3000` in manifest
3. Reload extension
4. Hard refresh page

### Issue: "CSP violation" still appears
**Cause**: Old version of extension cached

**Fix**:
1. Go to `chrome://extensions`
2. Click "Remove" on Job Hunt Manager
3. Reload the unpacked extension from folder
4. Hard refresh page

### Issue: Bridge working but jobs not importing
**Cause**: IndexedDB or extension-sync service issue

**Fix**:
1. Open diagnostic tool: `localhost:3000/test-extension-sync.html`
2. Check which test fails
3. Try "Trigger Manual Sync" button

### Issue: Jobs import but don't show in UI
**Cause**: UI not refreshing

**Fix**:
1. Manually refresh the page
2. Check if jobs appear after refresh
3. If yes, it's a UI refresh issue (not sync issue)

---

## What's Different Now

### Before (Broken):
```
Extension saves job
   → chrome.storage.local updated
   → Bridge tries to inject inline script
   → ❌ CSP blocks it
   → Bridge never runs
   → Web app never receives message
   → Jobs stuck in extension
```

### After (Fixed):
```
Extension saves job
   → chrome.storage.local updated
   → Bridge (content script) detects change
   → ✅ Reads jobs from chrome.storage
   → ✅ Sends to web app via window.postMessage
   → Web app receives message
   → extension-sync imports to IndexedDB
   → UI refreshes
   → ✓ Jobs appear!
```

---

## Files Changed

1. `extension/bridge-script.js` - Complete rewrite (CSP-safe)
2. `js/services/extension-sync.js` - Improved message handling
3. `www/js/services/extension-sync.js` - Synced copy for Capacitor
4. `test-extension-sync.html` - New diagnostic tool

---

## Next Steps

1. **Reload extension** in `chrome://extensions`
2. **Hard refresh** `localhost:3000`
3. **Check console** for bridge messages
4. **Save a test job** on LinkedIn/Indeed/Glassdoor
5. **Verify** it appears in web app within 30 seconds

If it works, you're done! 🎉

If not, run the diagnostic tool and share the results.
