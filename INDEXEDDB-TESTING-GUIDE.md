# IndexedDB Migration Testing Guide

## Overview
This guide provides step-by-step instructions for manually testing the IndexedDB migration implementation.

## Prerequisites
- Modern browser (Chrome, Firefox, Edge, Safari)
- Access to browser DevTools
- Test URL: `https://cdr2.com/job-tool/app.html` or local file path

---

## Test 1: Bootstrap Initialization

### Steps:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to `app.html`
4. Wait for page to load

### Expected Results:
✅ Console should show:
```
🗄️ Bootstrapping IndexedDB service...
✅ IndexedDB service ready
✅ Migration already complete (or migration messages if data exists)
```

✅ No JavaScript errors in console

### Verification:
```javascript
// In browser console:
window.indexedDBService
// Should return: IndexedDBService { dbName: "JobHuntManagerDB", ... }

window.storageMigration
// Should return: StorageMigration { idbService: ... }
```

---

## Test 2: Object Store Creation

### Steps:
1. Open DevTools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Navigate to **IndexedDB** → **JobHuntManagerDB**

### Expected Results:
✅ Database `JobHuntManagerDB` exists
✅ Contains 5 object stores:
- `jobs`
- `resumes`
- `letters`
- `settings`
- `metadata`

### Screenshot locations:
- Chrome: Application → IndexedDB → JobHuntManagerDB
- Firefox: Storage → IndexedDB → JobHuntManagerDB
- Safari: Storage → IndexedDB → JobHuntManagerDB

---

## Test 3: Data Persistence

### Steps:
1. Navigate to app.html
2. Click "Add Job" button
3. Fill in job details:
   - Company: `Test Company`
   - Position: `Software Engineer`
   - Status: `Saved`
4. Save the job
5. Open DevTools → Application → IndexedDB → JobHuntManagerDB → jobs
6. Verify job appears in the `jobs` store

### Expected Results:
✅ Job entry visible in IndexedDB with all fields
✅ Job has unique ID (e.g., `job_1234567890_abc`)
✅ All form data saved correctly

### Verification in Console:
```javascript
// Get all jobs from IndexedDB
await window.indexedDBService.getAll('jobs')
// Should return: [{ id: '...', company: 'Test Company', ... }]
```

---

## Test 4: Data Persistence Across Reloads

### Steps:
1. Add a test job (as in Test 3)
2. Note the job ID
3. Reload the page (F5 or Ctrl+R)
4. Check DevTools → IndexedDB → jobs

### Expected Results:
✅ Job still exists after reload
✅ All data intact
✅ No duplication

### Verification:
```javascript
// In console after reload:
const jobs = await window.indexedDBService.getAll('jobs')
console.log(jobs)
// Should include the test job created before reload
```

---

## Test 5: Migration from localStorage

### Steps:
1. Open browser console
2. Clear IndexedDB:
   ```javascript
   indexedDB.deleteDatabase('JobHuntManagerDB')
   ```
3. Add test data to localStorage:
   ```javascript
   const testJobs = [
     { id: 'job1', company: 'Migration Test A', position: 'Developer', status: 'saved' },
     { id: 'job2', company: 'Migration Test B', position: 'Engineer', status: 'applied' }
   ];
   const testResumes = [
     { id: 'resume1', basics: { name: 'John Doe', email: 'john@example.com' } }
   ];
   localStorage.setItem('jobs', JSON.stringify(testJobs));
   localStorage.setItem('resumes', JSON.stringify(testResumes));
   localStorage.setItem('letters', JSON.stringify([]));
   ```
4. Reload the page
5. Watch console for migration messages

### Expected Results:
✅ Console shows:
```
📦 Starting localStorage → IndexedDB migration...
✅ Migration complete: { success: true, jobs: { migrated: 2 }, resumes: { migrated: 1 }, ... }
```

✅ Jobs appear in DevTools → IndexedDB → jobs
✅ Resumes appear in DevTools → IndexedDB → resumes

### Verification:
```javascript
// Check migration status
await window.storageMigration.isMigrationComplete()
// Should return: true

// Check migrated data
const jobs = await window.indexedDBService.getAll('jobs')
console.log(jobs)
// Should include: Migration Test A, Migration Test B

const resumes = await window.indexedDBService.getAll('resumes')
console.log(resumes)
// Should include: John Doe
```

---

## Test 6: Migration Idempotency

### Steps:
1. Ensure migration has completed (Test 5)
2. Reload page
3. Watch console

### Expected Results:
✅ Console shows:
```
✅ Migration already complete
```
✅ No re-migration occurs
✅ Data not duplicated

### Verification:
```javascript
// Check migration status
const status = await window.storageMigration.getMigrationStatus()
console.log(status)
// Should show: { completed: true, inProgress: false, ... }

// Try to migrate again
const result = await window.storageMigration.migrate({ force: false })
console.log(result)
// Should show: { success: true, skipped: true, message: 'Migration already completed' }
```

---

## Test 7: CRUD Operations

### CREATE:
```javascript
const newJob = {
  id: 'test-crud-' + Date.now(),
  company: 'CRUD Test Inc',
  position: 'Software Engineer',
  status: 'saved',
  dateCreated: new Date().toISOString()
};
await window.indexedDBService.save('jobs', newJob);
// Expected: Job saved successfully
```

### READ:
```javascript
const job = await window.indexedDBService.get('jobs', newJob.id);
console.log(job);
// Expected: Returns job object with all properties
```

### UPDATE:
```javascript
newJob.status = 'applied';
await window.indexedDBService.save('jobs', newJob);
const updated = await window.indexedDBService.get('jobs', newJob.id);
console.log(updated.status);
// Expected: 'applied'
```

### DELETE:
```javascript
await window.indexedDBService.delete('jobs', newJob.id);
const deleted = await window.indexedDBService.get('jobs', newJob.id);
console.log(deleted);
// Expected: undefined
```

### LIST (getAll):
```javascript
const allJobs = await window.indexedDBService.getAll('jobs');
console.log(allJobs.length, 'jobs found');
// Expected: Array of all jobs
```

---

## Test 8: Error Handling & Fallback

### Test localStorage fallback:
1. Simulate IndexedDB error (difficult in real browser)
2. Verify localStorage still works:
   ```javascript
   localStorage.setItem('test', 'fallback-test');
   localStorage.getItem('test');
   // Expected: 'fallback-test'
   ```

### Expected Results:
✅ App gracefully handles IndexedDB failures
✅ Console shows: `⚠️ App will fall back to localStorage`
✅ App continues to function

---

## Test 9: Backup Verification

### Steps:
1. Set localStorage data (as in Test 5)
2. Load app and wait for migration
3. Check localStorage after migration

### Expected Results:
✅ localStorage data still exists (backup preserved)
```javascript
localStorage.getItem('jobs')
// Should still return: original jobs JSON string
```

✅ Migration metadata saved:
```javascript
const metadata = await window.indexedDBService.getMetadata('storage_migration_status')
console.log(metadata)
// Should show: { completed: true, startedAt: ..., ... }
```

---

## Test 10: Multi-Store Operations

### Test all stores:
```javascript
// Jobs
await window.indexedDBService.save('jobs', { id: 'j1', company: 'Test' });

// Resumes
await window.indexedDBService.save('resumes', { id: 'r1', basics: { name: 'Test' } });

// Letters
await window.indexedDBService.save('letters', { id: 'l1', content: 'Test letter' });

// Settings
await window.indexedDBService.saveSetting('theme', 'dark');

// Metadata
await window.indexedDBService.saveMetadata('test', { value: 'test data' });

// Verify all
const jobs = await window.indexedDBService.getAll('jobs');
const resumes = await window.indexedDBService.getAll('resumes');
const letters = await window.indexedDBService.getAll('letters');
const theme = await window.indexedDBService.getSetting('theme');
const metadata = await window.indexedDBService.getMetadata('test');

console.log({ jobs, resumes, letters, theme, metadata });
```

### Expected Results:
✅ All stores accept data
✅ All data retrievable
✅ No cross-contamination between stores

---

## Automated Testing

### Run Cypress Tests:
```bash
cd /home/cdr/domains/cdr2.com/www/job-tool
npx cypress open
# or
npx cypress run --spec "cypress/e2e/indexeddb-migration.cy.js"
```

### Expected Results:
✅ All tests pass
✅ No failures or errors
✅ Coverage: Bootstrap, Migration, CRUD, Error handling

---

## Troubleshooting

### Issue: IndexedDB not initializing
- Check browser console for errors
- Verify files loaded: `js/services/indexeddb-service.js`, `js/services/storage-migration.js`
- Check browser compatibility (IndexedDB support)

### Issue: Migration not running
- Verify localStorage contains data
- Check console for "Migration already complete" message
- Clear IndexedDB and try again: `indexedDB.deleteDatabase('JobHuntManagerDB')`

### Issue: Data not persisting
- Check DevTools → Application → IndexedDB
- Verify `isInitialized === true`: `window.indexedDBService.isInitialized`
- Check for quota exceeded errors

---

## Success Criteria

All tests must pass with these results:

✅ Bootstrap initializes without errors
✅ All 5 object stores created
✅ Data persists across page reloads
✅ Migration completes successfully
✅ Migration doesn't re-run unnecessarily
✅ CRUD operations work correctly
✅ Backup created during migration
✅ localStorage preserved as fallback
✅ Console logs are clear and informative
✅ No JavaScript errors
✅ Cypress tests pass

---

## Testing Completed By:
- **Name**: IndexedDB Specialist
- **Date**: _____________
- **Status**: _____________
- **Notes**: _____________
