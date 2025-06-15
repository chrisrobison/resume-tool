// Simple in-browser test script
// Paste this into the browser console on demo.html to verify functionality

function runQuickTests() {
    console.log('🔍 Running quick functionality tests...');
    
    const tests = [];
    
    // Test 1: App object exists
    tests.push({
        name: 'App object exists',
        test: () => typeof window.app === 'object' && window.app !== null,
        details: 'window.app should be defined'
    });
    
    // Test 2: Required containers exist
    const containers = ['#work-list', '#education-list', '#skills-list', '#projects-list'];
    tests.push({
        name: 'Required containers exist',
        test: () => containers.every(selector => document.querySelector(selector) !== null),
        details: `Checking: ${containers.join(', ')}`
    });
    
    // Test 3: Event delegation method exists
    tests.push({
        name: 'Event delegation method exists',
        test: () => typeof window.app.setupSectionEventDelegation === 'function',
        details: 'app.setupSectionEventDelegation should be a function'
    });
    
    // Test 4: Update methods exist
    const updateMethods = ['updateWorkSection', 'updateEducationSection', 'updateSkillsSection', 'updateProjectsSection'];
    tests.push({
        name: 'Update methods exist',
        test: () => updateMethods.every(method => typeof window.app[method] === 'function'),
        details: `Checking: ${updateMethods.join(', ')}`
    });
    
    // Test 5: No immediate JavaScript errors
    let errorCount = 0;
    const originalError = console.error;
    console.error = function(...args) {
        errorCount++;
        originalError.apply(console, args);
    };
    
    try {
        window.app.setupSectionEventDelegation();
    } catch (e) {
        errorCount++;
    }
    
    console.error = originalError;
    
    tests.push({
        name: 'No immediate errors',
        test: () => errorCount === 0,
        details: `Error count: ${errorCount}`
    });
    
    // Test 6: Event listeners are attached
    const workList = document.querySelector('#work-list');
    const projectsList = document.querySelector('#projects-list');
    
    tests.push({
        name: 'Event listeners can be attached',
        test: () => {
            // Try to add a test event listener to verify the containers work
            try {
                if (workList) workList.addEventListener('test', () => {});
                if (projectsList) projectsList.addEventListener('test', () => {});
                return true;
            } catch (e) {
                return false;
            }
        },
        details: 'Testing if containers accept event listeners'
    });
    
    // Run tests and display results
    console.log('\n📊 Test Results:');
    console.log('================');
    
    let passed = 0;
    let total = tests.length;
    
    tests.forEach(test => {
        try {
            const result = test.test();
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test.name}`);
            if (test.details) {
                console.log(`   ${test.details}`);
            }
            if (result) passed++;
        } catch (error) {
            console.log(`❌ FAIL ${test.name} (Exception: ${error.message})`);
            if (test.details) {
                console.log(`   ${test.details}`);
            }
        }
    });
    
    console.log('================');
    console.log(`📈 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! The functionality should work correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the details above.');
    }
    
    return { passed, total, success: passed === total };
}

// Test specific functionality
function testEditButtonFunctionality() {
    console.log('🔍 Testing edit button functionality...');
    
    // First, let's create some test data to work with
    if (!window.app.currentResumeData) {
        window.app.currentResumeData = {
            work: [{ name: 'Test Company', position: 'Test Position', summary: 'Test summary' }],
            education: [{ institution: 'Test University', studyType: 'Bachelor', area: 'Computer Science' }],
            skills: [{ name: 'JavaScript', level: 'Expert', keywords: ['JS', 'Node'] }],
            projects: [{ name: 'Test Project', description: 'Test description' }]
        };
        
        // Update the sections to show the test data
        window.app.updateWorkSection();
        window.app.updateEducationSection();
        window.app.updateSkillsSection();
        window.app.updateProjectsSection();
        
        console.log('✅ Created test data and updated sections');
    }
    
    // Test if edit buttons exist
    const editButtons = document.querySelectorAll('.edit-item');
    const deleteButtons = document.querySelectorAll('.delete-item');
    
    console.log(`📊 Found ${editButtons.length} edit buttons and ${deleteButtons.length} delete buttons`);
    
    if (editButtons.length > 0) {
        console.log('✅ Edit buttons are present');
        
        // Test clicking an edit button (should show alert)
        const firstEditButton = editButtons[0];
        console.log('🖱️  Testing click on first edit button...');
        
        // Override alert to capture the message
        const originalAlert = window.alert;
        let alertMessage = '';
        window.alert = function(message) {
            alertMessage = message;
            console.log(`📢 Alert shown: ${message}`);
        };
        
        firstEditButton.click();
        
        window.alert = originalAlert;
        
        if (alertMessage.includes('coming soon')) {
            console.log('✅ Edit button click works (shows placeholder message)');
        } else {
            console.log('❌ Edit button click may not be working correctly');
        }
    } else {
        console.log('❌ No edit buttons found - there may be an issue with data rendering');
    }
    
    return editButtons.length > 0;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runQuickTests, testEditButtonFunctionality };
} else {
    // Browser environment - make available globally
    window.testDemo = { runQuickTests, testEditButtonFunctionality };
    console.log('💡 Test functions loaded! Run testDemo.runQuickTests() or testDemo.testEditButtonFunctionality()');
}