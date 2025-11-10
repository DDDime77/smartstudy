# Settings Page - Comprehensive Logic Outline

**Date**: November 10, 2025
**Purpose**: Document the complete logic, data flow, and implementation status of each settings section

---

## 📋 Overview

The settings page has **5 main sections**:
1. Profile
2. Education
3. Preferences
4. Notifications
5. Security

---

## 1️⃣ PROFILE SECTION

### **Current Implementation Status: ✅ FULLY FUNCTIONAL**

### Data Fields:
| Field | Type | Editable | Source | Saved To |
|-------|------|----------|--------|----------|
| Display Name | String | ✅ Yes | `users.full_name` | `users.full_name` |
| Email | String | ❌ No | `users.email` | N/A (read-only) |
| Timezone | Select (38 options) | ✅ Yes | `user_profiles.timezone` | `user_profiles.timezone` |
| Weekly Study Goal | Number (0-168) | ✅ Yes | `user_profiles.study_goal` | `user_profiles.study_goal` |

### Data Flow:

**LOAD SEQUENCE:**
```
1. Page Mount (useEffect)
   ↓
2. GET /auth/me → Fetch user basic info (name, email)
   ↓
3. GET /onboarding/profile → Fetch profile data (timezone, study_goal, education)
   ↓
4. Update React state: profileData
   └─ name: user.full_name || 'Student'
   └─ email: user.email
   └─ timezone: profile.timezone || detectBrowserTimezone()
   └─ studyGoal: profile.study_goal || 20
```

**SAVE SEQUENCE:**
```
1. User clicks "Save Changes" button
   ↓
2. Two parallel API calls:
   ├─ PUT /auth/me → Update { full_name: profileData.name }
   └─ PUT /onboarding/profile → Update { timezone, study_goal }
   ↓
3. Show success toast notification
```

### Backend Endpoints:
- ✅ `GET /auth/me` - Fetch current user
- ✅ `PUT /auth/me` - Update user name
- ✅ `GET /onboarding/profile` - Fetch profile
- ✅ `PUT /onboarding/profile` - Update profile fields

### Database Tables:
```sql
-- users table
full_name VARCHAR (updated via PUT /auth/me)

-- user_profiles table
timezone VARCHAR NOT NULL (updated via PUT /onboarding/profile)
study_goal INTEGER (updated via PUT /onboarding/profile)
```

### What Works:
✅ Loads name, email, timezone, study goal from database
✅ Saves name to `users.full_name`
✅ Saves timezone to `user_profiles.timezone`
✅ Saves study goal to `user_profiles.study_goal`
✅ Toast notifications on success/error
✅ Auto-detects browser timezone on first load
✅ 38 comprehensive timezone options

### Issues/Missing:
- **Email change**: Currently read-only with message "Contact support to change your email"
  - **Recommendation**: Add email verification flow if allowing email changes
  - **Alternative**: Keep read-only for security (prevents account hijacking)

### Improvement Opportunities:
- Add profile picture upload
- Add phone number field (optional)
- Add bio/about me section (optional)
- Show "Last updated" timestamp

---

## 2️⃣ EDUCATION SECTION

### **Current Implementation Status: ✅ FULLY FUNCTIONAL**

### Data Fields:
| Field | Type | Editable | Source | Saved To |
|-------|------|----------|--------|----------|
| Education System | Select | ✅ Yes | `user_profiles.education_system` | `user_profiles.education_system` |
| Program | Select (dynamic) | ✅ Yes | `user_profiles.education_program` | `user_profiles.education_program` |
| Grade/Year | Text Input | ✅ Yes | `user_profiles.grade_level` | `user_profiles.grade_level` |
| School | Text Input | ✅ Yes | Frontend state only | **NOT SAVED** |

### Education Systems Supported:
```javascript
IB: ['IBDP', 'IBCP', 'IB Courses']
A-Level: ['AS Level', 'A2 Level', 'Combined']
American: ['Standard', 'AP', 'Honors']
GCSE: ['Standard', 'iGCSE']
```

### Data Flow:

**LOAD SEQUENCE:**
```
1. Page Mount (useEffect)
   ↓
2. GET /onboarding/profile
   ↓
3. Update educationData state:
   └─ educationSystem: profile.education_system || 'IB'
   └─ educationProgram: profile.education_program || 'IBDP'
   └─ grade: profile.grade_level || 'Year 12'
   └─ school: 'International School' (hardcoded default)
```

**SAVE SEQUENCE:**
```
1. User clicks "Save Changes"
   ↓
2. PUT /onboarding/profile
   └─ { education_system, education_program, grade_level }
   ↓
3. Show success toast
```

### Backend Endpoints:
- ✅ `GET /onboarding/profile` - Fetch profile
- ✅ `PUT /onboarding/profile` - Update education fields

### Database Table:
```sql
-- user_profiles table
education_system VARCHAR NOT NULL  ('IB', 'A-Level', 'American', 'GCSE')
education_program VARCHAR          ('IBDP', 'AS Level', 'AP', etc.)
grade_level VARCHAR                ('Year 12', 'Grade 11', etc.)
```

### What Works:
✅ Loads education system, program, grade from database
✅ Dynamic program dropdown (changes based on education system)
✅ Saves all 3 fields to database correctly
✅ Toast notification on save
✅ Data properly persisted and reloaded

### Issues/Missing:
- ❌ **School field NOT saved** - Only exists in frontend state
- ❌ **No database column for school name**
- ❌ **Program dropdown doesn't update when education system changes**
  - User must manually select new program after changing system
  - Risk of saving incompatible combinations (e.g., "IB" + "AS Level")

### Critical Issue - System Change Logic:
**Problem**: When user changes education system, the program dropdown shows new options but the selected value might be invalid.

**Example Bug Scenario:**
```
1. User has: education_system='A-Level', education_program='AS Level'
2. User changes to: education_system='IB'
3. Program dropdown still shows 'AS Level' (invalid for IB)
4. User clicks Save → Database gets: IB + AS Level (INVALID)
```

**Solution Needed**: Auto-reset program when system changes
```javascript
onChange={(e) => {
  const newSystem = e.target.value;
  setEducationData({
    ...educationData,
    educationSystem: newSystem,
    educationProgram: educationPrograms[newSystem][0] // Reset to first valid option
  });
}}
```

### Improvement Opportunities:
1. **Add school field to database**
   - Add `school_name` column to `user_profiles`
   - Save and load school name properly
2. **Add graduation year field**
   - Help with exam scheduling logic
3. **Add education start date**
   - Calculate time remaining until graduation
4. **Validate grade_level format**
   - Ensure consistent format (Year 12 vs Grade 12 vs Y12)

### System Impact:
**Why this matters**: Education system affects:
- Subject catalogs (IB vs A-Level subjects)
- Grading scales (1-7 for IB, A*-U for A-Level)
- Priority coefficient calculations
- Exam types available
- AI task generation (curriculum-specific problems)

---

## 3️⃣ PREFERENCES SECTION

### **Current Implementation Status: ⚠️ UI-ONLY (NO PERSISTENCE)**

### Data Fields:
| Field | Type | Default | Storage | Applied |
|-------|------|---------|---------|---------|
| Auto-start breaks | Boolean | false | React state | ❌ Not implemented |
| Sound notifications | Boolean | true | React state | ❌ Not implemented |
| Show animations | Boolean | true | React state | ❌ Not implemented |
| Compact view | Boolean | false | React state | ❌ Not implemented |

### Data Flow:

**LOAD SEQUENCE:**
```
1. Page Mount
   ↓
2. Initialize preferences state with hardcoded defaults:
   └─ autoStartBreaks: false
   └─ soundNotifications: true
   └─ showAnimations: true
   └─ compactView: false
   ↓
3. NO API CALL (not fetched from backend)
```

**SAVE SEQUENCE:**
```
Currently: No save mechanism
Toggle changes only update React state (lost on page refresh)
```

### Backend:
- ❌ No API endpoints
- ❌ No database columns
- ❌ No schemas

### What Works:
✅ UI toggles respond to clicks
✅ Visual feedback (animations)
✅ Clean, descriptive UI
✅ Info box explains local storage concept

### What Doesn't Work:
❌ Preferences don't persist (lost on page refresh)
❌ Preferences don't affect app behavior anywhere
❌ No localStorage implementation
❌ No save button (says "stored locally" but isn't)

### Critical Gap Analysis:

**WHERE PREFERENCES SHOULD BE USED:**

1. **Auto-start breaks** → Study Timer page
   - When focus timer ends, automatically start break timer
   - Currently: Not implemented in `/dashboard/study-timer`

2. **Sound notifications** → Study Timer page
   - Play sound when timer completes
   - Currently: Not implemented (no audio files)

3. **Show animations** → Global app
   - Disable `AnimatedText`, smooth transitions, fade effects
   - Currently: Animations always enabled everywhere

4. **Compact view** → Global app
   - Reduce padding/margins on all components
   - Currently: Not implemented (no compact CSS classes)

### Implementation Options:

**Option A: localStorage (Recommended)**
```javascript
// On toggle change
useEffect(() => {
  localStorage.setItem('preferences', JSON.stringify(preferences));
}, [preferences]);

// On page load
useEffect(() => {
  const saved = localStorage.getItem('preferences');
  if (saved) setPreferences(JSON.parse(saved));
}, []);
```
**Pros**: Fast, no backend changes needed, instant apply
**Cons**: Lost if user clears browser data or uses different device

**Option B: Database Storage**
```sql
ALTER TABLE user_profiles ADD COLUMN preferences JSON;
-- Store: {"autoStartBreaks": false, "soundNotifications": true, ...}
```
**Pros**: Syncs across devices, persists forever
**Cons**: Requires backend changes, API calls, slower

**Option C: Hybrid Approach**
- Store in localStorage for instant access
- Periodically sync to database (every 5 minutes or on logout)
- On login, pull from database and update localStorage

### Recommendation:
**Use Option A (localStorage) initially**, then add Option C later.

### Missing Implementation Checklist:
- [ ] Add localStorage save/load logic
- [ ] Create React Context for preferences (share across app)
- [ ] Implement auto-start breaks in Study Timer
- [ ] Add sound files and play logic
- [ ] Create animation toggle utility (enable/disable globally)
- [ ] Add compact view CSS classes

---

## 4️⃣ NOTIFICATIONS SECTION

### **Current Implementation Status: 🚧 UI-ONLY (BACKEND NOT READY)**

### Data Fields:

**Notification Channels:**
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| Email notifications | Boolean | true | Send emails for events |
| Push notifications | Boolean | true | Browser push notifications |

**Notification Types:**
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| Study session reminders | Boolean | true | Remind to start scheduled sessions |
| Exam alerts | Boolean | true | Alerts 7 days, 3 days, 1 day before exams |
| Achievement notifications | Boolean | true | Notify when badges/streaks unlocked |
| Weekly progress reports | Boolean | false | Email summary every Monday |

### Data Flow:

**CURRENT:**
```
1. Page Mount
   ↓
2. Initialize notifications state with hardcoded defaults
   ↓
3. Toggles update React state only (not saved)
   ↓
4. "Save Settings" button shows: "will be saved in a future update"
```

**NEEDED:**
```
1. Load user notification preferences from database
2. Display current settings in toggles
3. On save, update database
4. Backend uses these settings to decide whether to send notifications
```

### Backend Requirements:

**Database Schema Needed:**
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Channels
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,

    -- Types
    study_reminders BOOLEAN DEFAULT TRUE,
    exam_alerts BOOLEAN DEFAULT TRUE,
    achievements BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT FALSE,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints Needed:**
```
GET  /notifications/preferences - Fetch user notification settings
PUT  /notifications/preferences - Update notification settings
POST /notifications/test        - Send test notification
```

### What Works:
✅ UI toggles work
✅ Visual state updates
✅ Clean, organized layout

### What Doesn't Work:
❌ Settings don't save to database
❌ Settings don't affect actual notifications
❌ No notification system implemented yet
❌ Email notifications not set up
❌ Push notifications not set up

### Missing Infrastructure:

**1. Email System:**
- Need email service (SendGrid, AWS SES, Mailgun)
- Email templates (study reminder, exam alert, achievement, weekly report)
- Cron jobs to check schedules and send emails

**2. Push Notifications:**
- Service Worker registration
- Push notification permissions request
- Firebase Cloud Messaging or similar
- Notification scheduling system

**3. Notification Scheduler:**
- Cron job to check:
  - Upcoming study sessions (15 min before)
  - Upcoming exams (7 days, 3 days, 1 day before)
  - Unlocked achievements (immediate)
  - Weekly reports (every Monday 8 AM)
- Filter by user preferences before sending

### Implementation Priority:
1. **Database table** - Store preferences
2. **API endpoints** - Save/load preferences
3. **Email system** - Start with exam alerts (highest value)
4. **Push notifications** - Lower priority (requires HTTPS, service workers)
5. **Quiet hours** - Add UI for time range picker

---

## 5️⃣ SECURITY SECTION

### **Current Implementation Status: 🚧 UI-ONLY (NO BACKEND)**

### Sub-sections:

#### A. PASSWORD MANAGEMENT
| Feature | Status | Notes |
|---------|--------|-------|
| Display last changed date | ❌ Hardcoded "30 days ago" | Need `users.password_updated_at` column |
| Change Password button | ❌ Non-functional | Need modal + API endpoint |

**Change Password Flow Needed:**
```
1. User clicks "Change Password"
2. Modal opens with fields:
   - Current Password (required for verification)
   - New Password (min 8 chars, validation)
   - Confirm New Password (must match)
3. POST /auth/change-password
4. Backend verifies current password
5. Backend hashes new password with bcrypt
6. Update users.password_hash
7. Update users.password_updated_at
8. Invalidate all existing sessions (force re-login)
9. Show success message
```

#### B. TWO-FACTOR AUTHENTICATION (2FA)
| Feature | Status | Notes |
|---------|--------|-------|
| 2FA Status display | ✅ Shows "Not enabled" | Static text |
| Enable 2FA button | ❌ Non-functional | Need complete 2FA flow |

**2FA Implementation Needed:**
```
1. Generate TOTP secret (using library like `pyotp`)
2. Display QR code for user to scan with authenticator app
3. User enters 6-digit code to verify setup
4. Store 2fa_secret encrypted in users table
5. On login, prompt for TOTP code if 2FA enabled
6. Add backup codes (10 one-time use codes)
```

**Database Changes Needed:**
```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255); -- Encrypted
ALTER TABLE users ADD COLUMN backup_codes JSON; -- Array of hashed codes
```

#### C. ACTIVE SESSIONS
| Feature | Status | Notes |
|---------|--------|-------|
| Show current session | ✅ Static "Chrome on Mac" | Not reading from database |
| Show other sessions | ❌ Not implemented | Need sessions table |
| Revoke session button | ❌ Not implemented | Need blacklist mechanism |

**Sessions System Needed:**
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255), -- Hash of JWT token
    device_info VARCHAR(255), -- "Chrome 120.0 on Mac OS"
    ip_address INET,
    location VARCHAR(255), -- "New York, US" (from IP lookup)
    created_at TIMESTAMP,
    last_active TIMESTAMP,
    expires_at TIMESTAMP
);
```

**Session Management Flow:**
```
1. On login, create session record
2. On each API call, update last_active
3. Display all active sessions in settings
4. "Revoke" button → Add token_hash to blacklist
5. Middleware checks blacklist before accepting tokens
```

#### D. ACCOUNT DELETION
| Feature | Status | Notes |
|---------|--------|-------|
| Delete Account button | ❌ Non-functional | Need confirmation flow |
| Danger zone warning | ✅ Displays correctly | Static text |

**Account Deletion Flow Needed:**
```
1. User clicks "Delete Account"
2. Show confirmation modal:
   - "Type DELETE to confirm"
   - Re-enter password
   - Checkbox: "I understand this cannot be undone"
3. POST /auth/delete-account
4. Backend verifies password
5. Soft delete: users.deleted_at = NOW()
   OR hard delete: DELETE CASCADE (removes all data)
6. Invalidate all sessions
7. Clear localStorage
8. Redirect to goodbye page
```

### What Works:
✅ Visual layout
✅ Danger zone styling
✅ Warning messages

### What Doesn't Work:
❌ All buttons non-functional
❌ No password change capability
❌ No 2FA implementation
❌ No session management
❌ No account deletion
❌ Hardcoded dummy data everywhere

### Implementation Priority:
1. **Change Password** (High) - Basic security feature
2. **Active Sessions** (Medium) - Security visibility
3. **2FA** (Medium) - Enhanced security for sensitive accounts
4. **Account Deletion** (Low) - GDPR compliance but rarely used

---

## 🔄 CROSS-CUTTING CONCERNS

### Data Consistency Issues:

**1. School Field Not Saved**
- Education section has "School" input
- Not saved to database
- Always resets to "International School" on reload
- **Fix**: Add `school_name` to user_profiles

**2. Education System + Program Mismatch**
- User can change system without program auto-updating
- Can save invalid combinations
- **Fix**: Reset program when system changes

**3. Preferences Lost on Refresh**
- All preference toggles reset to defaults
- No persistence mechanism
- **Fix**: Add localStorage

### Missing Database Columns:

```sql
-- user_profiles table
ALTER TABLE user_profiles ADD COLUMN school_name VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN preferences JSON; -- Optional

-- users table
ALTER TABLE users ADD COLUMN password_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN backup_codes JSON;

-- New table needed
CREATE TABLE notification_preferences (...);
CREATE TABLE user_sessions (...);
```

### API Endpoints Missing:

```
POST /auth/change-password
POST /auth/enable-2fa
POST /auth/verify-2fa
POST /auth/disable-2fa
GET  /auth/sessions
DELETE /auth/sessions/{session_id}
POST /auth/delete-account

GET  /notifications/preferences
PUT  /notifications/preferences
POST /notifications/test

-- Optional: Preferences if not using localStorage
GET  /preferences
PUT  /preferences
```

---

## 📊 IMPLEMENTATION STATUS SUMMARY

| Section | Load Works | Save Works | Backend Ready | Frontend Complete | Overall Status |
|---------|-----------|-----------|---------------|-------------------|----------------|
| **Profile** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ **COMPLETE** |
| **Education** | ✅ Yes | ⚠️ Partial | ✅ Yes | ⚠️ Has bugs | ⚠️ **NEEDS FIXES** |
| **Preferences** | ❌ No | ❌ No | ❌ No | ⚠️ UI only | ❌ **NOT IMPLEMENTED** |
| **Notifications** | ❌ No | ❌ No | ❌ No | ⚠️ UI only | ❌ **NOT IMPLEMENTED** |
| **Security** | ❌ No | ❌ No | ❌ No | ⚠️ UI only | ❌ **NOT IMPLEMENTED** |

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Critical Fixes (Now)
1. ✅ Fix education system + program mismatch logic
2. ✅ Add school_name to database and save it
3. ✅ Implement preferences with localStorage

### Phase 2: Core Features (Week 1)
4. ⏳ Change password functionality
5. ⏳ Notification preferences backend + API
6. ⏳ Basic email notifications (exam alerts)

### Phase 3: Enhanced Security (Week 2)
7. ⏳ Active sessions management
8. ⏳ Two-factor authentication
9. ⏳ Account deletion flow

### Phase 4: Nice-to-Have (Week 3+)
10. ⏳ Push notifications
11. ⏳ Weekly email reports
12. ⏳ Quiet hours feature
13. ⏳ Profile picture upload

---

## 🔍 KEY INSIGHTS

### What's Working Well:
- Profile section is production-ready
- Education section loads/saves correctly (with minor bugs)
- UI is clean and consistent across all sections
- Toast notifications provide good feedback

### What Needs Immediate Attention:
- Education system change logic (bug fix)
- Preferences have no persistence
- Notifications and Security are UI mockups
- Missing critical backend infrastructure

### Architecture Decisions Needed:
1. **Preferences storage**: localStorage vs database vs hybrid?
2. **Email service**: Which provider? (SendGrid, AWS SES, Mailgun)
3. **2FA library**: pyotp, authlib, or custom?
4. **Session storage**: Database table vs Redis cache?

---

**Document Status**: Complete
**Next Step**: Discuss priorities with team and implement Phase 1 fixes
