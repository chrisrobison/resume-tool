#!/bin/bash
# Verification script for Task #2 deliverables

echo "================================================"
echo "Task #2 Verification Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files
echo "Checking Task #2 deliverables..."
echo ""

# File 1: Cypress test
if [ -f "cypress/e2e/indexeddb-migration.cy.js" ]; then
    SIZE=$(wc -l < cypress/e2e/indexeddb-migration.cy.js)
    echo -e "${GREEN}✅ cypress/e2e/indexeddb-migration.cy.js${NC} (${SIZE} lines)"
else
    echo -e "${RED}❌ cypress/e2e/indexeddb-migration.cy.js NOT FOUND${NC}"
fi

# File 2: Testing guide
if [ -f "INDEXEDDB-TESTING-GUIDE.md" ]; then
    SIZE=$(wc -l < INDEXEDDB-TESTING-GUIDE.md)
    echo -e "${GREEN}✅ INDEXEDDB-TESTING-GUIDE.md${NC} (${SIZE} lines)"
else
    echo -e "${RED}❌ INDEXEDDB-TESTING-GUIDE.md NOT FOUND${NC}"
fi

# File 3: Interactive test
if [ -f "test-indexeddb.html" ]; then
    SIZE=$(wc -l < test-indexeddb.html)
    echo -e "${GREEN}✅ test-indexeddb.html${NC} (${SIZE} lines)"
else
    echo -e "${RED}❌ test-indexeddb.html NOT FOUND${NC}"
fi

echo ""
echo "================================================"
echo "Bootstrap Verification"
echo "================================================"
echo ""

# Check bootstrap in app.html
if grep -q "IndexedDB Service Initialization" app.html; then
    echo -e "${GREEN}✅ Bootstrap code found in app.html${NC}"
    echo ""
    echo "Bootstrap location:"
    grep -n "IndexedDB Service Initialization" app.html | head -1
else
    echo -e "${RED}❌ Bootstrap code NOT found in app.html${NC}"
fi

echo ""
echo "================================================"
echo "Quick Test Commands"
echo "================================================"
echo ""
echo "1. Interactive Browser Test:"
echo -e "   ${YELLOW}open test-indexeddb.html${NC}"
echo ""
echo "2. Manual Testing Guide:"
echo -e "   ${YELLOW}cat INDEXEDDB-TESTING-GUIDE.md${NC}"
echo ""
echo "3. Run Cypress Tests:"
echo -e "   ${YELLOW}npx cypress run --spec \"cypress/e2e/indexeddb-migration.cy.js\"${NC}"
echo ""
echo "4. View Bootstrap Code:"
echo -e "   ${YELLOW}grep -A 30 'IndexedDB Service Initialization' app.html${NC}"
echo ""

echo "================================================"
echo "Task #2 Verification Complete!"
echo "================================================"
