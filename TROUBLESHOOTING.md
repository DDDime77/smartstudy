# Quick Troubleshooting Guide

## Next.js Chunk 500 Errors

If you encounter chunk loading errors like:
```
Failed to load resource: the server responded with a status of 500 ()
/_next/static/chunks/[hash].js
```

### Quick Fix (Run these commands):

```bash
# 1. Stop the Next.js server
fuser -k 3000/tcp

# 2. Clean build directory
rm -rf .next

# 3. Rebuild application
npm run build

# 4. Restart production server
PORT=3000 npm start &

# 5. Verify it's working
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Should return: 200
```

### Root Causes:
- Stale build artifacts from previous builds
- Server cache issues
- Build process interrupted/incomplete
- Chunk manifest mismatch

### Prevention:
- Always do clean rebuilds after major changes
- Ensure builds complete successfully before deploying
- Check for build warnings/errors in output

---

## Git Push Protection for API Keys

If push is blocked with "Repository rule violations found":

```bash
# 1. Undo last commit
git reset --soft HEAD~1

# 2. Unstage and remove sensitive file from tracking
git reset HEAD .env.local
git rm --cached .env.local

# 3. Verify .gitignore contains:
# .env.local
# .env
# *.env

# 4. Re-commit without sensitive files
git add -A
git commit -m "Your commit message"
git push
```

### Remember:
- `.env.local` should NEVER be committed
- Always verify it's in `.gitignore`
- API keys stay on server, not in git
