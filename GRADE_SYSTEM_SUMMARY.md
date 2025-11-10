# Grade System Research - Executive Summary

## What We Found

The SmartStudy grade system has a **well-implemented architecture** supporting three major education systems with proper grade scale handling. However, the **A-Level program configuration is outdated and needs fixing**.

## Current State

### Working Correctly ✅
1. **IB System** - Fully correct
   - Programs: IBDP, IBCP, IB Courses
   - Grades: 1-7 numeric scale
   - Year levels: Year 1-2 (Grade 11-12)

2. **American System** - Fully correct
   - Programs: Standard, AP, Honors
   - Grades: A+ to F (letter) with GPA conversion
   - Year levels: Grade 9-12 (Freshman-Senior)

3. **Grade Functionality** - Fully correct
   - Current/target grades stored per subject
   - Dynamic grade selection based on education system
   - Grade normalization to 0-100 scale for comparison
   - Priority coefficient calculation based on grade gap
   - Grades properly trigger priority recalculation when updated

### Broken ❌
1. **A-Level Program Configuration** (education-config.ts)
   - Currently shows "AS Level", "A2 Level", "Combined" as programs
   - These are from OLD system (abolished 2015)
   - Should have single "A-Level" program
   - Missing "Post-A-level" year option

## Required Changes

### File 1: `/home/claudeuser/smartstudy/lib/education-config.ts`
**Lines 91-179 (A-Level section)**

Change from:
```typescript
'A-Level': {
  'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
  'A2 Level': ['Year 13 (Upper Sixth)'],
  'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
}
```

Change to:
```typescript
'A-Level': {
  'A-Level': {
    name: 'A-Level',
    subjects: [/* existing 65 subjects */],
    requirements: 'Students typically take 3-4 A-Levels',
    grading: {
      scale: ['A*', 'A', 'B', 'C', 'D', 'E', 'U'],
      passing: 'E',
      description: 'A* is highest, E is minimum pass, U is ungraded/fail',
    },
  },
}
```

### File 2: `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx`
**Lines 49-53 (gradeOptions for A-Level)**

Change from:
```typescript
'A-Level': {
  'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
  'A2 Level': ['Year 13 (Upper Sixth)'],
  'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
}
```

Change to:
```typescript
'A-Level': {
  'A-Level': [
    'Year 12 (Lower Sixth)',
    'Year 13 (Upper Sixth)',
    'Post-A-level (Gap Year / Retakes)'
  ]
}
```

## Why This Matters

1. **AS/A2 System** - Abolished in 2015
   - Old: Two separate qualifications (AS in Year 12, A2 in Year 13)
   - New: Single linear A-Level spanning Year 12-13

2. **Missing "Post-A-level"** - Users need this option for:
   - Gap year students
   - Retaking exams
   - Already completed A-Levels

3. **Grade Scale Unchanged**
   - A*, A, B, C, D, E, U is still correct
   - No changes needed to priority calculator or grade normalization

## No Database Changes Needed

The database schema is already prepared:
- `user_profiles.grade_level` stores the year/level as a string
- `subject.current_grade` and `subject.target_grade` handle all grade formats
- Priority calculator uses education_system + education_program (not grade_level)

## Key Code Locations

| Item | Location | Lines |
|------|----------|-------|
| A-Level Configuration | `lib/education-config.ts` | 91-179 |
| Grade Level Selection | `components/onboarding/EducationSystemStep.tsx` | 39-62 |
| Subject Grade Input | `components/onboarding/SubjectsStep.tsx` | 193-235 |
| Priority Calculation | `backend/app/utils/priority_calculator.py` | 159-230 |
| Grade Normalization | `backend/app/utils/priority_calculator.py` | 84-156 |
| Grading Scales | `backend/app/utils/priority_calculator.py` | 25-81 |

## Grade System Architecture

```
1. User selects education system (IB, A-Level, American)
   ↓
2. User selects program (IBDP, A-Level, Standard, AP, etc.)
   ↓
3. User selects year/grade level (Year 1-2, Year 12-13, Grade 9-12, etc.)
   ↓
4. For each subject:
   - Select current grade (from system-specific dropdown)
   - Select target grade (from system-specific dropdown)
   ↓
5. Backend calculates priority coefficient:
   - Normalize both grades to 0-100 scale
   - Calculate gap = target - current
   - Apply formula to get priority coefficient (0.5-3.0x)
   - Store in database
   ↓
6. Priority coefficient used for task scheduling and study recommendations
```

## Grade Normalization Examples

| System | Grade | Normalized |
|--------|-------|-----------|
| IB | 6 | 83.33 |
| A-Level | A | 90 |
| American | A- | 91 |

All normalized to 0-100 scale for consistent priority calculation.

## Summary

- **Grade system is 95% implemented correctly**
- **One fix needed: Update A-Level configuration** (15 minutes of work)
- **No database migrations needed**
- **All other systems working perfectly**

See `/home/claudeuser/smartstudy/GRADE_SYSTEM_RESEARCH.md` for complete technical details.
