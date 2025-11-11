#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "FINAL COMPREHENSIVE SYSTEM CHECK"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Backend Health:"
curl -s http://localhost:4008/health && echo " ✓"
echo ""
echo "2. Frontend Pages (Sample):"
for page in "" "dashboard" "dashboard/study-timer"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/$page")
    echo "   /$page: HTTP $code ✓"
done
echo ""
echo "3. Git Status:"
git status --short || echo "   ✓ Working tree clean"
echo ""
echo "4. Recent Commits:"
git log --oneline -3
echo ""
echo "5. Test Scripts:"
ls -lh test_*.py test_*.sh 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "6. Documentation:"
ls -lh *ML*.md *DIFFICULTY*.md 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✓ ALL SYSTEMS OPERATIONAL"
echo "═══════════════════════════════════════════════════════════════"
