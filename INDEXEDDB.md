# IndexedDB Data Layer Documentation

## Overview

The Job Tool now features a **modern, high-performance data layer** built on IndexedDB with Web Worker integration. This enhancement provides:

- **Non-blocking operations** - Database operations run in a separate thread
- **Automatic migration** - Seamless upgrade from localStorage
- **Graceful fallback** - Automatic fallback to localStorage if IndexedDB unavailable
- **Enhanced storage** - No 5-10MB localStorage limits
- **Better performance** - Optimized for large datasets
- **Data recovery** - Built-in health monitoring and recovery tools

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│  (app.html, jobs.html, components)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           Storage API (storage.js)                   │
│  • Unified interface for data access                │
│  • Automatic mode detection (IndexedDB/localStorage)│
│  • Transparent fallback handling                    │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│  IndexedDB   │  │   localStorage   │
│   (primary)  │  │    (fallback)    │
└──────┬───────┘  └──────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│     Data Service (data-service.js)       │
│  • Promise-based API                     │
│  • Request management                    │
│  • Progress tracking                     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│   Database Worker (db-worker.js)         │
│  • Runs in Web Worker thread             │
│  • IndexedDB operations                  │
│  • Non-blocking execution                │
└──────────────────────────────────────────┘
```

## Database Schema

The IndexedDB implementation includes the following object stores:

### 1. **resumes**
- **Key Path**: `id`
- **Indexes**: `name`, `timestamp`, `lastModified`
- **Purpose**: Store resume data in JSON Resume format

### 2. **jobs**
- **Key Path**: `id`
- **Indexes**: `status`, `company`, `title`, `dateCreated`, `dateApplied`, `resumeId`
- **Purpose**: Store job application tracking data

### 3. **logs**
- **Key Path**: `id` (auto-increment)
- **Indexes**: `timestamp`, `type`, `operation`
- **Purpose**: Activity logging and history

### 4. **settings**
- **Key Path**: `id`
- **Purpose**: Application settings (single record with id='default')

### 5. **coverLetters**
- **Key Path**: `id`
- **Indexes**: `jobId`, `resumeId`, `timestamp`
- **Purpose**: Store cover letters linked to jobs

### 6. **aiHistory**
- **Key Path**: `id` (auto-increment)
- **Indexes**: `timestamp`, `operation`, `provider`
- **Purpose**: AI interaction history

## Usage

### Basic Initialization

```javascript
import { initStorage, getStorageMode } from './js/storage.js';

// Initialize storage (auto-detects and migrates)
await initStorage();

// Check which storage mode is active
const mode = getStorageMode(); // 'indexeddb' or 'localstorage'
console.log(`Storage mode: ${mode}`);
```

### CRUD Operations

All storage functions are now **async** and support both IndexedDB and localStorage:

```javascript
import {
    saveResumeToStorage,
    loadResumeFromStorage,
    saveNamedResume,
    loadNamedResume,
    saveSettings,
    loadSettings
} from './js/storage.js';

// Save a resume
const resume = { basics: { name: 'John Doe' }, work: [], education: [] };
await saveResumeToStorage(resume);

// Load a resume
const loadedResume = await loadResumeFromStorage();

// Save named resume
const resumeId = await saveNamedResume(resume, 'My Resume');

// Load named resume
const namedResume = await loadNamedResume('My Resume');

// Settings
await saveSettings({ theme: 'dark', apiKeys: { /* ... */ } });
const settings = await loadSettings();
```

### Direct Data Service Access

For advanced operations, use the data service directly:

```javascript
import dataService from './js/data-service.js';

// Get all resumes
const resumes = await dataService.getResumes();

// Get all jobs with a specific status
const appliedJobs = await dataService.getJobs('applied');

// Query with filters
const recentResumes = await dataService.query(
    'resumes',
    null,  // No filter
    { field: 'lastModified', direction: 'desc' },  // Sort
    10     // Limit
);

// Bulk operations
const resumesToSave = [resume1, resume2, resume3];
await dataService.bulkPut('resumes', resumesToSave);

// Count records
const resumeCount = await dataService.count('resumes');

// Delete a resume
await dataService.deleteResume('resume_123');
```

### Migration

Migration from localStorage to IndexedDB happens **automatically** on first load:

```javascript
// Migration occurs automatically in initStorage()
await initStorage();

// Check if migration completed
if (dataService.isMigrated()) {
    console.log('Data successfully migrated from localStorage');
}
```

### Import/Export

```javascript
import dataService from './js/data-service.js';

// Export entire database
const backupData = await dataService.export();

// Save to file
const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json'
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `backup-${Date.now()}.json`;
a.click();

// Import from backup
const importData = JSON.parse(fileContents);
const result = await dataService.import(importData);
console.log('Import result:', result);
```

## Error Handling & Recovery

The implementation includes comprehensive error handling and recovery tools:

```javascript
import dbRecovery from './js/db-recovery.js';

// Check database health
const health = await dbRecovery.checkDatabaseHealth();
if (!health.isHealthy) {
    console.error('Database issues:', health.errors);
}

// Attempt automatic recovery
try {
    // Your database operation
    await dataService.saveResume(resume);
} catch (error) {
    // Attempt recovery
    const recovery = await dbRecovery.attemptRecovery(error);
    if (recovery.success) {
        console.log('Recovery successful:', recovery.message);
        // Retry operation
    }
}

// Get database statistics
const stats = await dbRecovery.getDatabaseStats();
console.log('Total records:', stats.totalRecords);
console.log('Store counts:', stats.stores);

// Perform maintenance (clear old logs, remove orphaned records)
const maintenance = await dbRecovery.performMaintenance();
console.log('Maintenance completed:', maintenance);

// Validate data integrity
const validation = await dbRecovery.validateDataIntegrity();
if (!validation.isValid) {
    console.warn('Data integrity issues:', validation.issues);
}

// Create backup
const backup = await dbRecovery.createBackup();

// Restore from backup
await dbRecovery.restoreBackup(backup);

// Repair a specific store
await dbRecovery.repairStore('resumes');
```

## Progress Tracking

Track progress of long-running operations:

```javascript
import dataService from './js/data-service.js';

// With progress callback
await dataService.bulkPut('resumes', largeResumeArray, (message) => {
    console.log('Progress:', message);
    // Update UI with progress
});

// For migrations
await dataService.migrate(localStorageData, (message) => {
    console.log('Migration progress:', message);
});
```

## Performance Considerations

### Best Practices

1. **Use bulk operations** for multiple records:
   ```javascript
   // Good
   await dataService.bulkPut('resumes', [resume1, resume2, resume3]);

   // Avoid
   await dataService.put('resumes', resume1);
   await dataService.put('resumes', resume2);
   await dataService.put('resumes', resume3);
   ```

2. **Use indexes for queries**:
   ```javascript
   // Efficient - uses index
   const jobs = await dataService.getAll('jobs', 'status', 'applied');

   // Less efficient - full scan
   const jobs = await dataService.query('jobs', { status: 'applied' });
   ```

3. **Limit result sets**:
   ```javascript
   // Good - only fetch what you need
   const recent = await dataService.getAll('resumes', 'lastModified', null, 10);

   // Avoid - fetching everything
   const all = await dataService.getAll('resumes');
   ```

4. **Clear old logs regularly**:
   ```javascript
   import dbRecovery from './js/db-recovery.js';

   // Clear logs older than 30 days
   await dbRecovery.clearOldLogs(30);
   ```

### Performance Metrics

From performance testing on demo page:

- **Average write time**: ~5-10ms per record
- **Average read time**: ~2-5ms per record
- **Average query time**: ~10-15ms for filtered queries
- **Bulk operations**: 100 records in ~100-200ms

## Browser Compatibility

- ✅ **Chrome/Edge**: Full support (IndexedDB v3)
- ✅ **Firefox**: Full support (IndexedDB v3)
- ✅ **Safari**: Full support (IndexedDB v3)
- ⚠️ **Older browsers**: Automatic fallback to localStorage

## Testing

### Demo Page

Open `demo-indexeddb.html` to test all features:

```bash
# Open in browser
open demo-indexeddb.html
# OR navigate to:
https://cdr2.com/job-tool/demo-indexeddb.html
```

The demo includes tests for:
- CRUD operations
- Bulk operations
- Migration
- Import/Export
- Query & Filter
- Performance testing
- Error scenarios

### Automated Testing

```javascript
// Run health check
const health = await dbRecovery.checkDatabaseHealth();
console.assert(health.isHealthy, 'Database should be healthy');

// Validate data
const validation = await dbRecovery.validateDataIntegrity();
console.assert(validation.isValid, 'Data should be valid');
```

## Troubleshooting

### Issue: Worker not initializing

**Solution**: Check browser console for errors. Ensure `workers/db-worker.js` is accessible.

```javascript
// Check worker status
import dataService from './js/data-service.js';
console.log('Worker ready:', dataService.isWorkerReady());
```

### Issue: Quota exceeded

**Solution**: Clear old logs and data.

```javascript
import dbRecovery from './js/db-recovery.js';

// Clear old logs
await dbRecovery.clearOldLogs(7); // Keep last 7 days

// Or perform full maintenance
await dbRecovery.performMaintenance();
```

### Issue: Migration not completing

**Solution**: Check localStorage data format and retry.

```javascript
// Check localStorage
const hasData = localStorage.getItem('resumeJson') ||
                localStorage.getItem('savedResumes');
console.log('Has localStorage data:', !!hasData);

// Manual migration
import dataService from './js/data-service.js';
const localData = {
    resumes: JSON.parse(localStorage.getItem('savedResumes') || '{}'),
    settings: JSON.parse(localStorage.getItem('resumeEditorSettings') || '{}')
};
await dataService.migrate(localData);
```

### Issue: Performance degradation

**Solution**: Run maintenance and validate data.

```javascript
import dbRecovery from './js/db-recovery.js';

// Get stats
const stats = await dbRecovery.getDatabaseStats();
console.log('Database stats:', stats);

// Perform maintenance
await dbRecovery.performMaintenance();

// If issues persist, repair stores
await dbRecovery.repairStore('resumes');
await dbRecovery.repairStore('jobs');
```

## Migration from Legacy Code

If your code uses the old synchronous localStorage API:

### Before (Old)
```javascript
import { saveResumeToStorage, loadResumeFromStorage } from './js/storage.js';

// Synchronous
const success = saveResumeToStorage(resume);
const resume = loadResumeFromStorage();
```

### After (New)
```javascript
import { saveResumeToStorage, loadResumeFromStorage } from './js/storage.js';

// Async
const success = await saveResumeToStorage(resume);
const resume = await loadResumeFromStorage();
```

**Important**: Remember to:
1. Add `async` to functions that use storage
2. Add `await` before storage calls
3. Handle Promise rejections with try/catch

## Future Enhancements

Planned improvements for the data layer:

- [ ] Encryption at rest for sensitive data
- [ ] Sync with remote server (optional)
- [ ] Conflict resolution for multi-device usage
- [ ] Compression for large datasets
- [ ] Streaming export/import for very large databases
- [ ] Advanced query language (SQL-like)

## Credits

IndexedDB implementation follows modern Web Worker patterns inspired by the existing AI Worker architecture. Built with:

- Native IndexedDB API
- Web Workers for non-blocking operations
- Progressive enhancement principles
- Zero external dependencies

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
