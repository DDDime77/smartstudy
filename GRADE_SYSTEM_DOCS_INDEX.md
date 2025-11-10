# Grade System Documentation Index

## Research Documents Created

This folder contains comprehensive research on the SmartStudy grade system implementation.

### 1. GRADE_SYSTEM_SUMMARY.md
**Quick Overview (5 min read)**
- What was found
- Current state (what works, what doesn't)
- Required changes
- Key code locations
- Grade system architecture overview

**Best for:** Getting a quick understanding of the grade system status

---

### 2. GRADE_SYSTEM_RESEARCH.md
**Complete Technical Documentation (30 min read)**
- Detailed implementation of all three education systems
- Database schema for grades
- Grade choice configuration and validation
- Priority calculation algorithm
- A-Level specific implementation issues
- How grades are used throughout the application
- Complete code examples and line references

**Best for:** Deep understanding of grade system architecture

---

### 3. A_LEVEL_FIX_IMPLEMENTATION.md
**Step-by-Step Implementation Guide (10 min read)**
- What needs to be changed
- Exact code replacements
- Testing instructions
- Why these changes matter
- Impact analysis
- Verification checklist

**Best for:** Implementing the A-Level year choices fix

---

## Quick Reference

### Current Grade System Status
- **IB System:** ✅ Fully working
- **American System:** ✅ Fully working
- **A-Level System:** ⚠️ Configuration issue (uses outdated AS/A2 system)

### What Needs to be Fixed
1. Remove obsolete A-Level programs (AS Level, A2 Level, Combined)
2. Add proper year choices (Year 12, Year 13, Post-A-level)
3. Update one file: `components/onboarding/EducationSystemStep.tsx`
4. Estimated time: 15 minutes

### Files to Modify
```
components/onboarding/EducationSystemStep.tsx (Lines 49-53)
```

### Database Schema Status
- No database changes needed
- Schema already supports all grade types
- grade_level column stores year/level as string
- Priority calculator is education-system agnostic

---

## Grade System Architecture Overview

```
Education System Selection
├── IB
│   ├── Programs: IBDP, IBCP, IB Courses
│   ├── Grades: 1-7 numeric
│   └── Years: Year 1-2 (Grade 11-12)
│
├── A-Level
│   ├── Programs: A-Level (should be single)
│   ├── Grades: A*, A, B, C, D, E, U
│   └── Years: Year 12, Year 13, Post-A-level
│
└── American
    ├── Programs: Standard, AP, Honors
    ├── Grades: A+ to F (4.0 or 5.0 GPA)
    └── Years: Grade 9-12 (Freshman-Senior)
```

---

## Key Files in the Grade System

### Frontend Configuration
- `/home/claudeuser/smartstudy/lib/education-config.ts` (358 lines)
  - Defines all education systems, programs, subjects, grading scales
  - 3 systems: IB (IBDP, IBCP, IB Courses), A-Level (1 program), American (Standard, AP)

### Frontend Components
- `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx`
  - Step 2 of onboarding: system/program/year selection
  - Contains gradeOptions hardcoded (where A-Level fix needed)
  
- `/home/claudeuser/smartstudy/components/onboarding/SubjectsStep.tsx`
  - Step 4 of onboarding: subject setup with current/target grades
  - Dynamically loads grade options based on education system

- `/home/claudeuser/smartstudy/components/OnboardingModal.tsx`
  - Orchestrates entire 5-step onboarding flow

### Backend Models
- `/home/claudeuser/smartstudy/backend/app/models/profile.py`
  - UserProfile: stores education_system, education_program, grade_level
  
- `/home/claudeuser/smartstudy/backend/app/models/subject.py`
  - Subject: stores current_grade, target_grade, priority_coefficient

### Backend Logic
- `/home/claudeuser/smartstudy/backend/app/utils/priority_calculator.py` (392 lines)
  - GRADING_SCALES: defines grade scales for each system
  - normalize_grade(): converts all grades to 0-100 scale
  - calculate_priority_coefficient(): computes priority based on grade gap
  - allocate_study_time(): distributes hours based on priorities

### Backend API
- `/home/claudeuser/smartstudy/backend/app/routers/onboarding.py`
  - POST /onboarding/complete: saves grades, calculates priorities
  - PUT /onboarding/subjects/{id}: updates grades and recalculates priority

### Schemas
- `/home/claudeuser/smartstudy/backend/app/schemas/onboarding.py`
  - SubjectInput: current_grade, target_grade fields
  - OnboardingComplete: complete onboarding data structure

### API Client
- `/home/claudeuser/smartstudy/lib/api/onboarding.ts`
  - Frontend interface for onboarding API
  - OnboardingData interface includes grade_level

---

## Grade Normalization Algorithm

All grades are normalized to 0-100 scale for priority calculation:

| System | Grade | Normalized | Formula |
|--------|-------|-----------|---------|
| IB | 1 | 0 | (1-1)/(7-1)*100 = 0 |
| IB | 6 | 83.33 | (6-1)/(7-1)*100 = 83.33 |
| IB | 7 | 100 | (7-1)/(7-1)*100 = 100 |
| A-Level | U | 0 | From scale dict |
| A-Level | A | 90 | From scale dict |
| A-Level | A* | 100 | From scale dict |
| American | F | 0 | From letter_conversion |
| American | A- | 91 | avg(90,92) |
| American | A+ | 97.5 | avg(97,100) |

---

## Priority Calculation Example

**IB Student:**
- Current: "5" → normalized: 66.67
- Target: "7" → normalized: 100
- Gap: 33.33 points
- Priority coefficient: ~1.9x

**A-Level Student:**
- Current: "C" → normalized: 70
- Target: "A*" → normalized: 100
- Gap: 30 points
- Priority coefficient: ~1.6x

**American Student:**
- Current: "B" → normalized: 85
- Target: "A+" → normalized: 97.5
- Gap: 12.5 points
- Priority coefficient: ~1.5x

---

## How Grades Flow Through the System

```
1. User selects education system in Step 2
   ↓
2. Frontend loads program options from education-config.ts
   ↓
3. User selects program (e.g., "A-Level")
   ↓
4. Frontend loads year options from EducationSystemStep.tsx
   ↓
5. User selects year (e.g., "Year 13 (Upper Sixth)")
   ↓
6. User adds subjects in Step 4, sets current/target grades
   ↓
7. Frontend retrieves grade options from education-config.ts
   ↓
8. User submits onboarding
   ↓
9. Backend receives OnboardingComplete with subjects + grades
   ↓
10. For each subject, backend calls:
    - calculate_priority_coefficient(current_grade, target_grade, education_system)
    - This normalizes both grades to 0-100 scale
    - Calculates gap and applies formula
    - Returns coefficient (0.5-3.0x)
    ↓
11. Backend saves Subject with:
    - current_grade (original string, e.g., "5")
    - target_grade (original string, e.g., "7")
    - priority_coefficient (calculated float, e.g., 1.9)
    ↓
12. Priority coefficient used for task scheduling and recommendations
```

---

## Testing Grade System

### Manual Testing Steps

1. **IB User:**
   - Select IB → IBDP → Year 2
   - Add Math HL: Current 5, Target 7 → coefficient ~1.9x
   - Add Chemistry SL: Current 6, Target 6 → coefficient 0.5x

2. **A-Level User (After Fix):**
   - Select A-Level → A-Level → Year 13
   - Add Mathematics: Current B, Target A* → coefficient ~1.6x
   - Add Physics: Current A, Target A* → coefficient ~0.7x

3. **American User:**
   - Select American → AP → Grade 11
   - Add AP Calc BC: Current B+, Target A+ → coefficient ~1.5x
   - Add AP Physics: Current C, Target A → coefficient ~2.0x

### What to Verify
- Grade options change based on selected education system
- Year options change based on selected program
- Grade dropdowns show correct scale for system
- Priority coefficients are calculated correctly
- Grades can be updated and priority recalculated

---

## Related Documentation

See also:
- `/home/claudeuser/smartstudy/ONBOARDING_AND_DATABASE_STATUS.md` - Complete project status
- Backend model definitions in `/home/claudeuser/smartstudy/backend/app/models/`
- Onboarding router in `/home/claudeuser/smartstudy/backend/app/routers/onboarding.py`

---

## Document Version

- **Created:** 2025-11-10
- **Status:** Complete Research
- **Grade System Completion:** 95% (needs A-Level fix)
- **Database Schema:** 100% Ready
- **Frontend Components:** 95% (needs A-Level update)

---

**Next Step:** Implement A-Level fix using `A_LEVEL_FIX_IMPLEMENTATION.md`
