#!/bin/bash

echo "================================"
echo "Testing All Frontend Pages"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FRONTEND_URL="http://localhost:4000"
BACKEND_URL="http://localhost:4008"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a page
test_page() {
    local page_name=$1
    local page_url=$2
    local expected_code=${3:-200}

    echo -n "Testing $page_name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$page_url" 2>&1)

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test backend health first
echo "=== Backend Health Check ==="
test_page "Backend Health" "$BACKEND_URL/health" 200
test_page "Backend API Docs" "$BACKEND_URL/docs" 200
echo ""

# Test frontend pages
echo "=== Frontend Pages ==="
test_page "Home Page" "$FRONTEND_URL/" 200
test_page "Auth Pages" "$FRONTEND_URL/auth/login" 200
test_page "Dashboard" "$FRONTEND_URL/dashboard" 200
test_page "Study Timer" "$FRONTEND_URL/dashboard/study-timer" 200
test_page "Calendar" "$FRONTEND_URL/dashboard/calendar" 200
test_page "Onboarding" "$FRONTEND_URL/onboarding" 200
echo ""

# Check for JavaScript errors in build
echo "=== Checking for Build Errors ==="
if [ -f "/tmp/frontend.log" ]; then
    echo -n "Checking frontend logs for errors... "

    # Look for compilation errors
    if grep -q "error" /tmp/frontend.log | grep -v "errorComponents" | grep -v "error.tsx"; then
        echo -e "${YELLOW}⚠ WARNINGS FOUND${NC}"
        echo "Recent errors from frontend log:"
        grep -i "error" /tmp/frontend.log | tail -5
    else
        echo -e "${GREEN}✓ No errors found${NC}"
        ((TESTS_PASSED++))
    fi
else
    echo -e "${YELLOW}⚠ Frontend log not found${NC}"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
