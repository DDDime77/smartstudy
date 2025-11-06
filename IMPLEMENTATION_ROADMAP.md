# Implementation Roadmap

This document outlines the recommended order for implementing features in the StudySmart AI Study Planner application.

## Current Status

### ✅ Completed Features

1. **Authentication System**
   - Login/Register pages
   - JWT token management
   - Protected routes

2. **Onboarding Flow**
   - Education system selection (IB, A-Level, American)
   - Program selection (IBDP, IBCP, AP, etc.)
   - Timezone and study goal configuration
   - Subject selection during onboarding

3. **Settings Page**
   - Profile settings (timezone, study goal)
   - Education settings (system, program)
   - Account management placeholder

4. **Subjects Page**
   - View all subjects
   - Add new subjects (with dropdown selection)
   - Edit existing subjects
   - Delete subjects
   - Subject detail view with stats
   - Fallback to IB IBDP for unauthenticated users

5. **Error Handling**
   - Centralized error handling in `/lib/api/client.ts`
   - Proper 401 handling (warnings instead of errors)
   - React hydration fixes

---

## Recommended Implementation Order

### Phase 1: Core Task Management (Week 1-2)

#### 1. Tasks Page - Backend
**Priority: HIGH**
**Dependencies: None**

- [ ] Create tasks database table
  - Fields: id, user_id, subject_id, title, description, due_date, priority, status, created_at, updated_at
- [ ] Create tasks router (`backend/app/routers/tasks.py`)
  - GET `/tasks` - Get all tasks (with filters: subject, status, priority)
  - GET `/tasks/{task_id}` - Get single task
  - POST `/tasks` - Create new task
  - PUT `/tasks/{task_id}` - Update task
  - DELETE `/tasks/{task_id}` - Delete task
  - PUT `/tasks/{task_id}/complete` - Mark task as complete
- [ ] Add task validation and error handling

#### 2. Tasks Page - Frontend
**Priority: HIGH**
**Dependencies: Tasks Backend**

- [ ] Create task list component
  - Display tasks grouped by status (To Do, In Progress, Completed)
  - Filter by subject, priority, due date
  - Search functionality
- [ ] Create add/edit task dialog
  - Subject selection dropdown (from user's subjects)
  - Title, description fields
  - Due date picker
  - Priority selection (Low, Medium, High)
- [ ] Implement task CRUD operations
- [ ] Add task completion toggle
- [ ] Add overdue task highlighting

---

### Phase 2: Study Timer & Sessions (Week 2-3)

#### 3. Study Timer - Backend
**Priority: HIGH**
**Dependencies: Tasks Backend**

- [ ] Create study_sessions database table
  - Fields: id, user_id, subject_id, task_id (optional), start_time, end_time, duration_minutes, focus_rating, notes
- [ ] Create study sessions router (`backend/app/routers/study_sessions.py`)
  - GET `/study-sessions` - Get all sessions (with filters)
  - GET `/study-sessions/active` - Get active session
  - POST `/study-sessions/start` - Start new session
  - PUT `/study-sessions/{session_id}/end` - End session
  - GET `/study-sessions/stats` - Get study statistics
- [ ] Add session validation

#### 4. Study Timer - Frontend
**Priority: HIGH**
**Dependencies: Study Timer Backend**

- [ ] Create timer component
  - Start/stop/pause functionality
  - Subject selection
  - Optional task linking
- [ ] Add Pomodoro mode (25min work, 5min break)
- [ ] Create session end dialog
  - Focus rating (1-5)
  - Notes field
- [ ] Display recent sessions list
- [ ] Add daily/weekly study time summary

---

### Phase 3: Complete Subject Features (Week 3-4)

#### 5. Subject Detail Page Enhancements
**Priority: MEDIUM**
**Dependencies: Tasks Backend, Study Sessions Backend**

- [ ] Add subject-specific analytics
  - Study time trends (daily, weekly, monthly)
  - Task completion rate over time
  - Focus rating trends
- [ ] Add subject progress visualization
  - Current vs target grade display
  - Progress percentage
- [ ] Add recent tasks for the subject
- [ ] Add recent study sessions for the subject

---

### Phase 4: Exams & Deadlines (Week 4-5)

#### 6. Exams Page - Backend
**Priority: MEDIUM**
**Dependencies: Subjects Backend**

- [ ] Create exams database table
  - Fields: id, user_id, subject_id, title, exam_date, duration_minutes, location, notes, created_at
- [ ] Create exams router (`backend/app/routers/exams.py`)
  - GET `/exams` - Get all exams (with filters)
  - GET `/exams/upcoming` - Get upcoming exams
  - POST `/exams` - Create new exam
  - PUT `/exams/{exam_id}` - Update exam
  - DELETE `/exams/{exam_id}` - Delete exam

#### 7. Exams Page - Frontend
**Priority: MEDIUM**
**Dependencies: Exams Backend**

- [ ] Create exam list view
  - Calendar view of exams
  - List view with filters
- [ ] Create add/edit exam dialog
- [ ] Add countdown to upcoming exams
- [ ] Add exam notifications/reminders
- [ ] Show related subject information

---

### Phase 5: Dashboard & Schedule (Week 5-6)

#### 8. Dashboard Page - Backend
**Priority: MEDIUM**
**Dependencies: All previous backends**

- [ ] Create dashboard aggregation endpoint
  - GET `/dashboard/overview` - Get all dashboard data
    - Upcoming tasks (next 7 days)
    - Today's study sessions
    - Upcoming exams (next 30 days)
    - Weekly study time summary
    - Subject performance summary

#### 9. Dashboard Page - Frontend
**Priority: MEDIUM**
**Dependencies: Dashboard Backend**

- [ ] Create dashboard widgets
  - Quick stats (total subjects, pending tasks, study hours this week)
  - Today's schedule
  - Upcoming deadlines
  - Recent activity
  - Study time chart (last 7 days)
- [ ] Add quick actions
  - Start study session
  - Add task
  - View today's tasks

#### 10. Schedule/Calendar View
**Priority: MEDIUM**
**Dependencies: Tasks, Exams, Study Sessions**

- [ ] Create calendar component
  - Monthly view
  - Weekly view
  - Daily view
- [ ] Display tasks, exams, and sessions on calendar
- [ ] Add drag-and-drop for rescheduling (optional)

---

### Phase 6: Analytics & Insights (Week 6-7)

#### 11. Analytics Page - Backend
**Priority: LOW**
**Dependencies: All previous backends**

- [ ] Create analytics aggregation endpoints
  - GET `/analytics/study-time` - Study time analytics
  - GET `/analytics/subjects` - Subject performance analytics
  - GET `/analytics/productivity` - Productivity metrics
  - GET `/analytics/trends` - Long-term trends

#### 12. Analytics Page - Frontend
**Priority: LOW**
**Dependencies: Analytics Backend**

- [ ] Create analytics charts
  - Study time by subject (pie chart)
  - Daily/weekly study time trends (line chart)
  - Task completion rate (bar chart)
  - Focus rating over time (line chart)
- [ ] Add time range filters (week, month, semester, year)
- [ ] Add subject comparison charts
- [ ] Add productivity insights
  - Most productive time of day
  - Average session duration
  - Most studied subjects

---

### Phase 7: Notifications & Reminders (Week 7-8)

#### 13. Notifications System - Backend
**Priority: LOW**
**Dependencies: Tasks, Exams**

- [ ] Create notifications database table
  - Fields: id, user_id, type, title, message, related_id, is_read, created_at
- [ ] Create notifications router
  - GET `/notifications` - Get all notifications
  - GET `/notifications/unread` - Get unread notifications
  - PUT `/notifications/{notification_id}/read` - Mark as read
  - PUT `/notifications/read-all` - Mark all as read
- [ ] Implement notification triggers
  - Task due date approaching
  - Exam coming up
  - Study goal not met
  - Daily study reminder

#### 14. Notifications Page - Frontend
**Priority: LOW**
**Dependencies: Notifications Backend**

- [ ] Create notifications list
- [ ] Add notification badge to sidebar
- [ ] Add mark as read functionality
- [ ] Add notification preferences settings

---

## Implementation Guidelines

### Development Principles

1. **Always implement backend first, then frontend**
   - Ensures API contracts are clear
   - Allows for easier testing
   - Prevents rework

2. **Test as you go**
   - Test each endpoint with Postman/curl
   - Verify Chrome DevTools shows correct data
   - Check for errors in console

3. **Handle errors properly**
   - Use centralized error handling
   - Provide user-friendly error messages
   - Log errors appropriately

4. **Maintain existing functionality**
   - Don't break what's working
   - Test related features after changes
   - Keep fallbacks for unauthenticated states

### Code Quality Standards

- Follow TypeScript strict mode
- Use proper typing for all API responses
- Add loading states for all async operations
- Add proper form validation
- Use shadcn/ui components consistently
- Follow React best practices (hooks, functional components)

---

## Quick Reference: API Endpoints to Build

### Tasks
- `GET /tasks` - List all tasks
- `GET /tasks/{task_id}` - Get task details
- `POST /tasks` - Create task
- `PUT /tasks/{task_id}` - Update task
- `DELETE /tasks/{task_id}` - Delete task
- `PUT /tasks/{task_id}/complete` - Toggle completion

### Study Sessions
- `GET /study-sessions` - List all sessions
- `GET /study-sessions/active` - Get active session
- `POST /study-sessions/start` - Start session
- `PUT /study-sessions/{session_id}/end` - End session
- `GET /study-sessions/stats` - Get statistics

### Exams
- `GET /exams` - List all exams
- `GET /exams/upcoming` - Get upcoming exams
- `POST /exams` - Create exam
- `PUT /exams/{exam_id}` - Update exam
- `DELETE /exams/{exam_id}` - Delete exam

### Dashboard
- `GET /dashboard/overview` - Get dashboard data

### Analytics
- `GET /analytics/study-time` - Study time analytics
- `GET /analytics/subjects` - Subject analytics
- `GET /analytics/productivity` - Productivity metrics

### Notifications
- `GET /notifications` - List notifications
- `GET /notifications/unread` - Unread notifications
- `PUT /notifications/{notification_id}/read` - Mark as read

---

## Notes

- All endpoints require authentication (JWT token)
- All dates should use ISO 8601 format
- All endpoints should return proper HTTP status codes
- Use pagination for list endpoints where appropriate
- Implement proper foreign key relationships in database
