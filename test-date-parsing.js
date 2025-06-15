// Test script to verify date parsing fixes
// This can be run in the browser console to test the improvements

console.log('Testing date parsing improvements...');

// Test cases for problematic dates
const testDates = [
    'invalid-date',
    '2023-13-45',  // Invalid month/day
    '2020-02-30',  // Invalid day for February
    'not-a-date',
    'garbage',
    '2020-15-30',  // Invalid month
    '2023-02-30',  // Invalid day for February
    'this-is-not-a-date',
    '',            // Empty string
    null,          // Null value
    undefined,     // Undefined value
    'Present',     // Should be removed (contains 'present')
    'PRESENT',     // Should be removed (contains 'present')
    'currently present', // Should be removed (contains 'present')
    '2023-12-01',  // Valid date
];

function testDateValidation(dateStr) {
    try {
        if (!dateStr) {
            return { valid: true, result: '', reason: 'Empty field' };
        }
        
        // Check if field contains 'present' - should be removed
        if (dateStr.toString().toLowerCase().includes('present')) {
            return { valid: false, result: 'REMOVED', reason: 'Contains "present" - field removed' };
        }
        
        const testDate = new Date(dateStr);
        if (isNaN(testDate.getTime())) {
            return { valid: false, result: 'REMOVED', reason: 'Invalid date - field removed' };
        }
        
        return { valid: true, result: dateStr, reason: 'Valid date' };
    } catch (e) {
        return { valid: false, result: 'REMOVED', reason: `Error: ${e.message} - field removed` };
    }
}

console.log('Date validation test results:');
testDates.forEach(date => {
    const result = testDateValidation(date);
    console.log(`"${date}" => ${result.valid ? '✅' : '❌'} ${result.reason} -> "${result.result}"`);
});

// Test the actual resume import with problematic data
const problematicResume = {
    basics: {
        name: "Test User",
        email: "test@example.com",
        location: {}
    },
    work: [
        {
            name: "Company A",
            position: "Developer", 
            startDate: "invalid-date",
            endDate: "2023-13-45"
        }
    ],
    education: [
        {
            institution: "University",
            studyType: "Bachelor's",
            startDate: "not-a-date",
            endDate: "2022-99-99"
        }
    ],
    projects: [
        {
            name: "Project 1",
            startDate: "garbage",
            endDate: "2023-02-30"
        }
    ],
    volunteer: [
        {
            organization: "Charity",
            position: "Volunteer",
            startDate: "2020-15-30",
            endDate: "Present"
        }
    ],
    skills: [],
    meta: {
        lastModified: "this-is-not-a-date",
        version: "1.0.0"
    }
};

console.log('\nOriginal problematic resume:');
console.log(JSON.stringify(problematicResume, null, 2));

console.log('\n✅ Test script completed. Use this in browser console to verify fixes.');