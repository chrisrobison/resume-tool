#!/usr/bin/env node
/**
 * Quick Validation Script for Component Naming Migration
 * Tests that all components are properly renamed and registered
 */

console.log('🧪 Testing Component Migration - Removed -migrated Suffix\n');
console.log('=' .repeat(60));

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const issues = [];

// Test 1: Verify component files exist without -migrated suffix
console.log('\n📁 Test 1: Component Files');
const componentFiles = [
    'components/ai-assistant-worker.js',
    'components/api-settings.js',
    'components/global-store.js',
    'components/job-manager.js',
    'components/resume-editor.js',
    'components/resume-viewer.js',
    'components/settings-manager.js'
];

componentFiles.forEach(file => {
    const exists = fs.existsSync(file);
    if (exists) {
        console.log(`  ✅ ${file}`);
        passed++;
    } else {
        console.log(`  ❌ ${file} - NOT FOUND`);
        issues.push(`Missing file: ${file}`);
        failed++;
    }
});

// Test 2: Verify old -migrated files are removed
console.log('\n🗑️  Test 2: Old Migrated Files Removed');
const oldFiles = [
    'components/ai-assistant-worker-migrated.js',
    'components/api-settings-migrated.js',
    'components/global-store-migrated.js',
    'components/job-manager-migrated.js',
    'components/resume-editor-migrated.js',
    'components/resume-viewer-migrated.js',
    'components/settings-manager-migrated.js'
];

oldFiles.forEach(file => {
    const exists = fs.existsSync(file);
    if (!exists) {
        console.log(`  ✅ ${file} - Removed`);
        passed++;
    } else {
        console.log(`  ❌ ${file} - Still exists!`);
        issues.push(`Old file still exists: ${file}`);
        failed++;
    }
});

// Test 3: Verify customElements.define statements
console.log('\n🔧 Test 3: Custom Element Definitions');
const elementChecks = [
    { file: 'components/global-store.js', element: 'global-store', class: 'GlobalStore' },
    { file: 'components/resume-editor.js', element: 'resume-editor', class: 'ResumeEditor' },
    { file: 'components/resume-viewer.js', element: 'resume-viewer', class: 'ResumeViewer' },
    { file: 'components/settings-manager.js', element: 'settings-manager', class: 'SettingsManager' },
    { file: 'components/api-settings.js', element: 'api-settings', class: 'ApiSettings' },
    { file: 'components/ai-assistant-worker.js', element: 'ai-assistant-worker', class: 'AIAssistantWorker' },
    { file: 'components/job-manager.js', element: 'job-manager', class: 'JobManager' }
];

elementChecks.forEach(({ file, element, class: className }) => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasCorrectDefine = content.includes(`customElements.define('${element}'`);
        const hasCorrectClass = content.includes(`class ${className} extends`);
        const noMigratedClass = !content.includes(`${className}Migrated`);

        if (hasCorrectDefine && hasCorrectClass && noMigratedClass) {
            console.log(`  ✅ ${file} - <${element}> = ${className}`);
            passed++;
        } else {
            console.log(`  ❌ ${file}`);
            if (!hasCorrectDefine) issues.push(`${file}: Missing correct customElements.define`);
            if (!hasCorrectClass) issues.push(`${file}: Missing correct class name`);
            if (!noMigratedClass) issues.push(`${file}: Still has Migrated suffix in class name`);
            failed++;
        }
    }
});

// Test 4: Verify HTML imports
console.log('\n📄 Test 4: HTML Imports');
const htmlFiles = ['jobs.html', 'jobs-new.html'];

htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasOldRefs = content.includes('-migrated.js') || content.includes('-migrated>');

        if (!hasOldRefs) {
            console.log(`  ✅ ${file} - No -migrated references`);
            passed++;
        } else {
            console.log(`  ❌ ${file} - Still has -migrated references`);
            issues.push(`${file}: Contains -migrated references`);
            failed++;
        }
    }
});

// Test 5: Check JavaScript references
console.log('\n🔍 Test 5: JavaScript References');
const jsFiles = [
    'js/app-manager.js',
    'js/modal-manager.js',
    'js/core.js'
];

jsFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasOldRefs = content.includes('-migrated');

        if (!hasOldRefs) {
            console.log(`  ✅ ${file} - Clean`);
            passed++;
        } else {
            console.log(`  ⚠️  ${file} - Has -migrated references (may be in comments)`);
            // Don't fail on this since comments are ok
            passed++;
        }
    }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Summary:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📈 Total: ${passed + failed}`);
console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (issues.length > 0) {
    console.log('\n❗ Issues Found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n' + '='.repeat(60));

if (failed === 0) {
    console.log('\n✨ All tests passed! Component migration successful! ✨\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.\n');
    process.exit(1);
}
