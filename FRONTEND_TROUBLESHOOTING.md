# Frontend Troubleshooting Guide - Next.js 16 with Turbopack

## Common Issue: Chunk 500 Errors & Page Loading Failures

### Symptoms
```
GET /_next/static/chunks/[hash].js net::ERR_ABORTED 500 (Internal Server Error)
Uncaught Error: Failed to load chunk /_next/static/chunks/[hash].js from module [id]
GET /dashboard/[page] 500 (Internal Server Error)
```

Pages fail to load with chunk loading errors in browser console.

---

## Root Causes Identified

### 1. Invalid Next.js Configuration
**Problem**: Next.js 16 with Turbopack has different config requirements than previous versions
- Deprecated `eslint` configuration in `next.config.js` causes build issues
- Invalid experimental keys like `turbo.root` are not supported
- Configuration errors can cause chunk compilation failures

**File**: `next.config.js`

### 2. Stale Build Artifacts
**Problem**: Cached build files from previous compilations cause manifest mismatches
- `.next` directory contains outdated chunk files
- `node_modules/.cache` holds stale Turbopack cache
- `.turbo` directory may have conflicting cache

### 3. Multiple Dev Server Processes
**Problem**: Multiple Next.js processes running simultaneously compete for ports
- Old processes from killed terminals remain active
- Port conflicts prevent clean server startup
- Mixed process versions serve inconsistent chunks

### 4. Missing Production Dependencies
**Problem**: Development works but production build fails
- Missing npm packages referenced in code
- Missing database client libraries (e.g., `pg` for PostgreSQL)
- Environment variables not set for production

---

## Step-by-Step Fix Protocol

### Step 1: Clean Next.js Configuration

**Check current config:**
```bash
cat next.config.js
```

**Fix to minimal working config:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,  // Only if needed
  },
}

module.exports = nextConfig
```

**Remove:**
- ❌ `eslint: { ignoreDuringBuilds: true }` - No longer supported
- ❌ `experimental.turbo.root` - Invalid key
- ❌ Any deprecated Turbopack configurations

### Step 2: Kill All Dev Servers Aggressively

**Kill by port (recommended):**
```bash
# Kill processes on frontend port
fuser -k 4000/tcp 2>/dev/null || lsof -ti:4000 | xargs kill -9 2>/dev/null

# Kill processes on backend port
fuser -k 8000/tcp 2>/dev/null || lsof -ti:8000 | xargs kill -9 2>/dev/null

# Wait for processes to fully terminate
sleep 2
```

**Alternative - kill by process name:**
```bash
pkill -9 -f "next dev"
pkill -9 -f "uvicorn"
sleep 2
```

**Verify nothing is running:**
```bash
ps aux | grep -E "(next dev|uvicorn)" | grep -v grep
```

### Step 3: Deep Clean All Caches

**Remove all Next.js caches:**
```bash
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
```

**Optional - full node_modules reinstall (if issues persist):**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Fix Production Build Errors

**Attempt production build to find missing dependencies:**
```bash
npm run build
```

**Common fixes:**

**Missing database client:**
```bash
npm install pg @types/pg
```

**Missing environment variables:**
```bash
# Check backend .env
grep DATABASE_URL backend/.env

# Copy to frontend .env.local (if needed)
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/db" >> .env.local
```

**Create missing module files** (example: `lib/db.ts`):
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default db;
```

### Step 5: Restart Development Server Clean

**Start backend:**
```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
```

**Start frontend (after 3 second delay):**
```bash
sleep 3
npm run dev
```

**Verify servers are responding:**
```bash
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:4000
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:8000/docs
```

Should both return `200`.

### Step 6: Rebuild and Restart Production

**For production deployment:**
```bash
# Kill production server
pkill -f "next start"

# Clean and rebuild
rm -rf .next
npm run build

# Start production
PORT=3000 npm start &
```

**Verify all pages load:**
```bash
for page in "" "/dashboard" "/dashboard/subjects" "/dashboard/study-timer" "/dashboard/preparation" "/dashboard/analytics" "/dashboard/notifications" "/dashboard/settings"; do
  curl -s -o /dev/null -w "$page: %{http_code}\n" http://localhost:3000$page
done
```

All should return `200`.

---

## Quick Reference Checklist

When encountering chunk 500 errors, run through this checklist:

- [ ] 1. Check `next.config.js` for invalid/deprecated keys
- [ ] 2. Kill all Next.js dev processes (`fuser -k 4000/tcp`)
- [ ] 3. Kill all backend processes (`fuser -k 8000/tcp`)
- [ ] 4. Remove `.next`, `node_modules/.cache`, `.turbo` directories
- [ ] 5. Test production build: `npm run build`
- [ ] 6. Fix any build errors (missing deps, modules)
- [ ] 7. Restart backend server
- [ ] 8. Restart frontend server
- [ ] 9. Verify with curl: both servers return 200
- [ ] 10. Test in browser: all pages load without chunk errors

---

## Prevention Best Practices

### 1. Always Use Clean Restarts
```bash
# Create this alias in ~/.bashrc
alias restart-dev='fuser -k 4000/tcp 2>/dev/null; fuser -k 8000/tcp 2>/dev/null; sleep 2; rm -rf .next; npm run dev'
```

### 2. Keep Next.js Config Minimal
- Only add configuration options you actually need
- Check Next.js 16 documentation for valid keys
- Remove deprecated options after upgrades

### 3. Clean Rebuilds After Major Changes
```bash
# After adding new dependencies or major code changes
rm -rf .next && npm run build
```

### 4. Monitor Dev Server Output
Watch for warnings about:
- Invalid configuration keys
- Multiple lockfiles
- Module resolution failures
- TypeScript errors (if not ignoring)

### 5. Test Production Build Regularly
```bash
# Run this before deploying
npm run build && echo "Build successful" || echo "Build failed - fix before deploy"
```

---

## Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| `listen EADDRINUSE: address already in use` | Kill process: `fuser -k [port]/tcp` |
| `Failed to load chunk /_next/static/chunks/[hash].js` | Clean `.next` and restart |
| `Module not found: Can't resolve '@/lib/[module]'` | Create module or install missing package |
| `Invalid next.config.js options detected` | Remove invalid keys from config |
| `Turbopack build failed with errors` | Check build output, fix missing imports |
| `Multiple lockfiles detected` | Remove parent directory lockfile or set turbopack.root |

---

## Last Resort: Nuclear Option

If all else fails, complete reset:

```bash
# 1. Kill everything
pkill -9 -f next
pkill -9 -f node
fuser -k 4000/tcp 2>/dev/null
fuser -k 8000/tcp 2>/dev/null

# 2. Remove all caches and builds
rm -rf .next .turbo node_modules/.cache

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Clean build
npm run build

# 5. Restart servers
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# Frontend
cd .. && npm run dev
```

---

## Troubleshooting Workflow Summary

```
Error Occurs
    ↓
Check Browser Console for specific error
    ↓
Check Dev Server Terminal for build errors
    ↓
Fix next.config.js if invalid keys detected
    ↓
Kill all dev processes (fuser -k)
    ↓
Deep clean caches (rm -rf .next node_modules/.cache .turbo)
    ↓
Attempt build (npm run build)
    ↓
Fix any build errors (missing deps/modules)
    ↓
Restart backend + frontend
    ↓
Verify with curl tests
    ↓
Test in browser
    ↓
If still failing: Nuclear Option
```

---

## Documentation Version
- **Last Updated**: 2025-11-10
- **Next.js Version**: 16.0.1
- **Turbopack**: Enabled by default
- **Node Version**: 20.19.5
