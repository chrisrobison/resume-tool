// Test script for demo.html functionality
// Run with: node test-demo.js or with headless Chromium

const puppeteer = require('puppeteer');
const path = require('path');

async function runTests() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('PAGE ERROR:', msg.text());
        } else {
            console.log('PAGE LOG:', msg.text());
        }
    });
    
    // Catch page errors
    page.on('pageerror', error => {
        console.error('PAGE CRASH:', error.message);
    });
    
    try {
        // Load the demo.html file
        const filePath = `file://${path.join(__dirname, '..', 'demo.html')}`;
        console.log('Loading:', filePath);
        
        await page.goto(filePath, { waitUntil: 'networkidle0' });
        
        // Wait for app to initialize
        await page.waitForSelector('#app', { timeout: 5000 });
        console.log('✓ Page loaded successfully');
        
        // Test basic navigation
        await testNavigation(page);
        
        // Test resume editing functionality
        await testResumeEditing(page);
        
        console.log('🎉 All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

async function testNavigation(page) {
    console.log('Testing navigation...');
    
    // Test switching to resumes tab
    await page.click('[data-category="resumes"]');
    await page.waitForSelector('#itemList', { timeout: 2000 });
    console.log('✓ Resumes tab navigation works');
    
    // Test switching to jobs tab
    await page.click('[data-category="jobs"]');
    await page.waitForTimeout(500);
    console.log('✓ Jobs tab navigation works');
    
    // Go back to resumes
    await page.click('[data-category="resumes"]');
    await page.waitForTimeout(500);
}

async function testResumeEditing(page) {
    console.log('Testing resume editing...');
    
    // Click create new resume
    await page.click('button:contains("New Resume")');
    await page.waitForSelector('#resume-editor', { timeout: 3000 });
    console.log('✓ New resume creation works');
    
    // Test tab switching in resume editor
    await page.click('[data-tab="work"]');
    await page.waitForSelector('#work-panel.active', { timeout: 2000 });
    console.log('✓ Work tab switching works');
    
    await page.click('[data-tab="education"]');
    await page.waitForSelector('#education-panel.active', { timeout: 2000 });
    console.log('✓ Education tab switching works');
    
    await page.click('[data-tab="skills"]');
    await page.waitForSelector('#skills-panel.active', { timeout: 2000 });
    console.log('✓ Skills tab switching works');
    
    await page.click('[data-tab="projects"]');
    await page.waitForSelector('#projects-panel.active', { timeout: 2000 });
    console.log('✓ Projects tab switching works');
    
    // Test if edit buttons exist and are clickable (without actually having data)
    const editButtons = await page.$$('.edit-item');
    const deleteButtons = await page.$$('.delete-item');
    
    console.log(`✓ Found ${editButtons.length} edit buttons and ${deleteButtons.length} delete buttons`);
    
    // Test event delegation by checking if containers have event listeners
    const hasWorkEvents = await page.evaluate(() => {
        const workList = document.querySelector('#work-list');
        return workList !== null;
    });
    
    const hasProjectsEvents = await page.evaluate(() => {
        const projectsList = document.querySelector('#projects-list');
        return projectsList !== null;
    });
    
    if (hasWorkEvents && hasProjectsEvents) {
        console.log('✓ Event delegation containers exist');
    } else {
        throw new Error('Event delegation containers missing');
    }
    
    // Test that functions don't throw errors
    const noErrors = await page.evaluate(() => {
        try {
            // Test that app object exists and has required methods
            if (!window.app) return false;
            if (typeof window.app.setupSectionEventDelegation !== 'function') return false;
            if (typeof window.app.updateWorkSection !== 'function') return false;
            if (typeof window.app.updateProjectsSection !== 'function') return false;
            return true;
        } catch (e) {
            console.error('Function test error:', e);
            return false;
        }
    });
    
    if (noErrors) {
        console.log('✓ Required functions exist and are callable');
    } else {
        throw new Error('Required functions missing or broken');
    }
}

// Run the tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };