# Grade System Implementation Research Report

## Executive Summary

The SmartStudy application currently implements a **complete grade system** supporting three major education systems (IB, A-Level, American) with differentiated grading scales. However, the **A-level program lacks year/level choices** (Year 12, Year 13, Post-A-level) that need to be added for proper curriculum alignment.

---

## 1. CURRENT GRADE SYSTEM IMPLEMENTATION

### 1.1 Education Systems Defined

**Location:** `/home/claudeuser/smartstudy/lib/education-config.ts` (Lines 1-358)

Three main education systems are implemented:

#### A. **IB (International Baccalaureate)** - Lines 1-90
- **Name:** International Baccalaureate
- **Programs:**
  - IBDP (IB Diploma Programme)
  - IBCP (IB Career-related Programme)
  - IB Courses (Individual IB Courses/MYP)
- **Grade Scale:** 1-7 (numeric)
  - Passing: 4
  - Description: "7 is highest, 1 is lowest. Maximum 45 points total (42 from subjects + 3 from TOK/EE)."

#### B. **A-Level (UK/Cambridge)** - Lines 91-180
- **Name:** A-Level (UK/Cambridge)
- **Program:** A-Level (single program)
- **Grade Scale:** A*, A, B, C, D, E, U (letter grades)
  - Passing: E (minimum pass)
  - Description: "A* is highest, E is minimum pass, U is ungraded/fail"
- **Subjects:** 65 subjects listed (Math, Sciences, Humanities, Languages, Arts, etc.)
- **Requirements:** "Students typically take 3-4 A-Levels"

#### C. **American High School** - Lines 181-357
- **Name:** American High School
- **Programs:**
  - Standard (regular courses)
  - AP (Advanced Placement)
  - (Note: Honors program exists in frontend but not fully documented in config)
- **Grade Scales:**
  - American Standard: Letter grades (A+ to F) on 4.0 GPA scale
  - AP: Letter grades (A+ to F) on 5.0 weighted GPA scale
  - Description includes AP Exam scores (1-5 scale)

### 1.2 Current Grade Level Options

**Location:** `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx` (Lines 39-62)

Grade/Year level options are hardcoded in the component:

```typescript
const gradeOptions: Record<string, Record<string, string[]>> = {
  'IB': {
    'IBDP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
    'IBCP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
    'IB Courses': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)']
  },
  'A-Level': {
    'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
    'A2 Level': ['Year 13 (Upper Sixth)'],
    'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
  },
  'American': {
    'Standard': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
    'AP': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
    'Honors': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)']
  }
};
```

### KEY FINDING: A-Level Issue
**The current implementation shows "AS Level", "A2 Level", and "Combined" as programs** for A-Level, but these should actually be **programs or sub-options within the A-Level program**. The year choices shown are outdated - they reference the old AS/A2 system which was replaced in 2015.

---

## 2. DATABASE SCHEMA FOR GRADES

### 2.1 UserProfile Model

**Location:** `/home/claudeuser/smartstudy/backend/app/models/profile.py` (Lines 1-31)

```python
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Education system info
    education_system = Column(String, nullable=False)  # 'IB', 'A-Level', 'American'
    education_program = Column(String, nullable=True)  # 'IBDP', 'IBCP', 'IB Courses', 'A-Level', 'Standard', 'AP'
    grade_level = Column(String, nullable=True)  # <-- STORES YEAR/GRADE LEVEL
    
    # ... other fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Key Fields:**
- `education_system`: String (IB, A-Level, American)
- `education_program`: String (IBDP, IBCP, A-Level, Standard, AP, etc.)
- `grade_level`: String (Year 1-2 for IB, Year 12-13 for A-Level, Grade 9-12 for American)

### 2.2 Subject Model

**Location:** `/home/claudeuser/smartstudy/backend/app/models/subject.py` (Lines 1-36)

```python
class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String, nullable=False)
    level = Column(String, nullable=True)  # 'HL', 'SL', 'AP', etc.
    category = Column(String, nullable=True)  # Subject group/category
    color = Column(String, nullable=True)  # Hex color for UI
    difficulty_level = Column(Integer, nullable=True)  # 1-5
    current_grade = Column(String, nullable=True)  # <-- CURRENT GRADE
    target_grade = Column(String, nullable=True)   # <-- TARGET GRADE
    priority_coefficient = Column(Float, nullable=True, default=1.0)
    
    # ... relationships
    user = relationship("User", back_populates="subjects")
    tasks = relationship("Task", back_populates="subject", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")
```

**Grade Fields:**
- `current_grade`: String (user's current grade in subject, e.g., "6", "A", "85")
- `target_grade`: String (user's target grade, e.g., "7", "A*", "95")

---

## 3. GRADE CHOICE CONFIGURATION & VALIDATION

### 3.1 Grade Options in Frontend

**Location:** `/home/claudeuser/smartstudy/components/onboarding/SubjectsStep.tsx` (Lines 40-48)

```typescript
const getGradingOptions = () => {
  if (!programConfig?.grading) return [];
  // Handle American system which uses letterGrades
  if ('letterGrades' in programConfig.grading) {
    return programConfig.grading.letterGrades.map((g: any) => g.letter);
  }
  // Handle IB and A-Level which use scale
  return programConfig.grading.scale || [];
};
```

**Dynamic Grade Options Based on Education System:**
- **IB:** `[1, 2, 3, 4, 5, 6, 7]`
- **A-Level:** `['A*', 'A', 'B', 'C', 'D', 'E', 'U']`
- **American Standard:** `['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']`
- **American AP:** Same as Standard (weighted GPA 5.0)

### 3.2 Priority Calculator - Grade Normalization

**Location:** `/home/claudeuser/smartstudy/backend/app/utils/priority_calculator.py` (Lines 24-81)

The system defines grading scales for each education system:

```python
GRADING_SCALES = {
    "IB": {
        "scale_type": "numeric",
        "min": 1,
        "max": 7,
        "passing": 4,
        "description": "IB grading scale: 1 (lowest) to 7 (highest)"
    },
    "A-Level": {
        "scale_type": "letter",
        "grades": {
            "A*": 100,
            "A": 90,
            "B": 80,
            "C": 70,
            "D": 60,
            "E": 50,
            "U": 0
        },
        "passing": 50,
        "description": "A-Level grading: A* (highest) to E (lowest), U (ungraded)"
    },
    "American": {
        "scale_type": "percentage",
        "min": 0,
        "max": 100,
        "passing": 60,
        "letter_conversion": { ... },
        "description": "American percentage or letter grade"
    },
    # ... AP scale
}
```

#### Grade Normalization Function (Lines 84-156)

```python
def normalize_grade(grade_str: Optional[str], education_system: str, 
                   education_program: Optional[str] = None) -> Optional[float]:
    """
    Normalize a grade to a 0-100 scale for comparison across systems.
    
    IB "6" → 83.33 (out of 100)
    A-Level "A" → 90 (out of 100)
    American "A-" → 91 (out of 100)
    """
```

**Normalization Examples:**
- IB "6" → `((6-1)/(7-1))*100 = 83.33`
- A-Level "A" → `90` (from grades dict)
- American "A-" → `91` (average of 90-92 range)

---

## 4. ONBOARDING FLOW FOR GRADE SELECTION

### 4.1 Onboarding Step 2: Education System Selection

**Location:** `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx`

**Current Flow:**
1. User selects education system (IB, A-Level, American)
2. User selects program (IBDP, IBCP, etc.)
3. User selects grade/year level (Year 1-2 for IB, Year 12-13 for A-Level, Grade 9-12 for American)

**State Management:**
```typescript
interface EducationSystemStepProps {
  educationSystem: string;
  educationProgram: string;
  gradeLevel: string;
  onChange: (system: string, program: string, grade?: string) => void;
}
```

### 4.2 Onboarding Step 4: Subject Grades

**Location:** `/home/claudeuser/smartstudy/components/onboarding/SubjectsStep.tsx` (Lines 193-235)

```typescript
{/* Current Grade */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Current Grade</label>
    <select value={currentSubject.current_grade || ''} onChange={(e) =>
        setCurrentSubject({ ...currentSubject, current_grade: e.target.value })
    }>
      <option value="">Select grade...</option>
      {getGradingOptions().map((grade) => (
        <option key={grade} value={grade}>{grade}</option>
      ))}
    </select>
  </div>
  
  {/* Target Grade */}
  <div>
    <label>Target Grade</label>
    <select value={currentSubject.target_grade || ''} onChange={(e) =>
        setCurrentSubject({ ...currentSubject, target_grade: e.target.value })
    }>
      <option value="">Select grade...</option>
      {getGradingOptions().map((grade) => (
        <option key={grade} value={grade}>{grade}</option>
      ))}
    </select>
  </div>
</div>
```

**Flow for Each Subject:**
1. Select subject name
2. Select level (HL/SL for IB, Standard/AP for American, optional for A-Level)
3. Select current grade (dropdown from grading scale)
4. Select target grade (dropdown from grading scale)

### 4.3 Backend Validation

**Location:** `/home/claudeuser/smartstudy/backend/app/schemas/onboarding.py` (Lines 6-13)

```python
class SubjectInput(BaseModel):
    name: str
    level: Optional[str] = None  # 'HL', 'SL', 'AP', etc.
    category: Optional[str] = None
    current_grade: Optional[str] = None
    target_grade: Optional[str] = None
    color: Optional[str] = None
```

**No validation** - grades are stored as strings. The priority calculator handles validation in `normalize_grade()`.

---

## 5. PRIORITY CALCULATION BASED ON GRADES

**Location:** `/home/claudeuser/smartstudy/backend/app/utils/priority_calculator.py` (Lines 159-230)

```python
def calculate_priority_coefficient(
    current_grade: Optional[str],
    target_grade: Optional[str],
    education_system: str,
    education_program: Optional[str] = None,
    level: Optional[str] = None,
    min_coefficient: float = 0.5,
    max_coefficient: float = 3.0
) -> float:
    """
    Calculate priority coefficient based on grade gap.
    
    Example:
    - Current: IB "5" (66.67), Target: IB "7" (100)
    - Gap: 33.33 points
    - Priority: ~1.8x (higher priority)
    """
```

**Priority Calculation Algorithm:**
1. Normalize both current and target grades to 0-100 scale
2. Calculate gap = target_normalized - current_normalized
3. If gap ≤ 0: return min_coefficient (0.5)
4. If gap > 0: apply formula
   ```
   base_coefficient = 1.0 + (grade_gap / 25.0)
   if grade_gap > 30:
       exponential_factor = 1.0 + ((grade_gap - 30) / 30.0) * 0.5
       base_coefficient *= exponential_factor
   ```
5. Apply level multiplier: HL/AP/Honors = 1.1x, others = 1.0x
6. Clamp to [min_coefficient, max_coefficient]

**Example:**
- IB student: Current "5" (66.67), Target "7" (100) → Gap 33.33 → Priority 1.7x
- A-Level student: Current "C" (70), Target "A*" (100) → Gap 30 → Priority 1.6x

---

## 6. A-LEVEL SPECIFIC IMPLEMENTATION ISSUES

### 6.1 Current A-Level Configuration (WRONG)

**In education-config.ts (Line 49-53):**
```typescript
'A-Level': {
  'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
  'A2 Level': ['Year 13 (Upper Sixth)'],
  'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
},
```

**PROBLEMS:**
1. AS/A2 system was abolished in 2015 - these are outdated
2. Should have a single "A-Level" program (not AS/A2/Combined)
3. Missing Year 13 Post-A-level option for gap year students

### 6.2 What A-Level System Actually Is

A-Level (Advanced Level) is the UK post-secondary qualification:
- **Year 12 (Lower Sixth):** Foundation year (covers AS content in new system)
- **Year 13 (Upper Sixth):** Completion year (covers A-Level content)
- **Post-A-level:** Gap year, prep for retakes, or already completed

**Subjects:** Same 65 subjects are correct (Math, Biology, Chemistry, Physics, etc.)

### 6.3 Grade Scale (Correct)

**A-Level Grades:** A*, A, B, C, D, E, U
- A* = 90+ points
- A = 80-89 points
- B = 70-79 points
- C = 60-69 points
- D = 50-59 points
- E = 40-49 points
- U = <40 points (Unclassified/Fail)

---

## 7. HOW GRADES ARE CURRENTLY USED IN THE APP

### 7.1 Subject Creation Flow

**Location:** `/home/claudeuser/smartstudy/backend/app/routers/onboarding.py` (Lines 54-78)

```python
# When subjects are submitted during onboarding:
for subject_data in onboarding_data.subjects:
    # Calculate priority coefficient based on grade gap
    priority_coef = calculate_priority_coefficient(
        current_grade=subject_data.current_grade,
        target_grade=subject_data.target_grade,
        education_system=onboarding_data.education_system,
        education_program=onboarding_data.education_program,
        level=subject_data.level
    )
    
    subject = Subject(
        user_id=user.id,
        name=subject_data.name,
        level=subject_data.level,
        category=subject_data.category,
        current_grade=subject_data.current_grade,
        target_grade=subject_data.target_grade,
        color=subject_data.color,
        priority_coefficient=priority_coef  # <-- Calculated here
    )
    db.add(subject)
```

### 7.2 Subject Update Flow

**Location:** `/home/claudeuser/smartstudy/backend/app/routers/onboarding.py` (Lines 216-280)

When grades are updated, priority coefficient is recalculated:

```python
@router.put("/subjects/{subject_id}")
def update_subject(subject_id: str, subject_data: UpdateSubject, ...):
    # ...
    grades_changed = False
    if subject_data.current_grade is not None:
        subject.current_grade = subject_data.current_grade
        grades_changed = True
    if subject_data.target_grade is not None:
        subject.target_grade = subject_data.target_grade
        grades_changed = True
    
    if grades_changed:
        # Recalculate priority coefficient
        priority_coef = calculate_priority_coefficient(
            current_grade=subject.current_grade,
            target_grade=subject.target_grade,
            education_system=education_system,
            education_program=education_program,
            level=subject.level
        )
        subject.priority_coefficient = priority_coef
```

---

## 8. GRADE DISPLAY IN SUBJECTS STEP

**Location:** `/home/claudeuser/smartstudy/components/onboarding/SubjectsStep.tsx` (Lines 254-280)

When a subject is added, grades are displayed as:

```typescript
{(subject.current_grade || subject.target_grade) && (
  <div className="text-xs text-slate-400 mt-1">
    {subject.current_grade && `Current: ${subject.current_grade}`}
    {subject.current_grade && subject.target_grade && ' • '}
    {subject.target_grade && `Target: ${subject.target_grade}`}
  </div>
)}
```

**Example displays:**
- "Current: 5 • Target: 7" (IB)
- "Current: B • Target: A*" (A-Level)
- "Current: B+ • Target: A" (American)

---

## 9. WHAT NEEDS TO BE MODIFIED FOR A-LEVEL YEAR CHOICES

### 9.1 Changes to education-config.ts

**Current (WRONG):**
```typescript
'A-Level': {
  'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
  'A2 Level': ['Year 13 (Upper Sixth)'],
  'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
}
```

**Should be (CORRECT):**
```typescript
'A-Level': {
  'A-Level': {
    name: 'A-Level',
    subjects: [/* 65 subjects list */],
    requirements: 'Students typically take 3-4 A-Levels',
    grading: {
      scale: ['A*', 'A', 'B', 'C', 'D', 'E', 'U'],
      passing: 'E',
      description: 'A* is highest, E is minimum pass, U is ungraded/fail',
    },
  },
}

// Then year options in EducationSystemStep:
'A-Level': {
  'A-Level': [
    'Year 12 (Lower Sixth)', 
    'Year 13 (Upper Sixth)',
    'Post-A-level (Gap Year / Retakes)'
  ]
}
```

### 9.2 Key Changes Summary

| Component | Change | Location |
|-----------|--------|----------|
| education-config.ts | Remove AS/A2, add single A-Level program | Line 91-179 |
| EducationSystemStep.tsx | Add "Post-A-level" year option | Line 49-53 |
| (Optional) user_profiles | Clarify what grade_level means for A-Level | backend/app/models/profile.py:18 |

---

## 10. COMPLETE GRADE SYSTEM FLOW DIAGRAM

```
┌─────────────────────────────────────────┐
│   ONBOARDING STEP 2: EDUCATION SYSTEM   │
│  (Select: IB, A-Level, or American)     │
└──────────────────┬──────────────────────┘
                   │
      ┌────────────┴────────────┬─────────────────┐
      │                         │                 │
      ▼                         ▼                 ▼
   [IB]                    [A-Level]       [American]
   Programs:              Programs:        Programs:
   - IBDP              - A-Level         - Standard
   - IBCP              (NOTE: Fix needed!)  - AP
   - IB Courses        
                          
      │                         │                 │
      ▼                         ▼                 ▼
   Grades:                  Grades:          Grades:
   [1-7]               [A*, A, B, C, D, E, U]  [A+, A, A-, B+, B, B-, C+, C, C-, D, D-, F]
   
      │                         │                 │
      ▼                         ▼                 ▼
   Years:                  Years:              Grades:
   - Year 1 (Gr 11)    - Year 12 (Lr 6)    - Grade 9 (Fr)
   - Year 2 (Gr 12)    - Year 13 (Up 6)    - Grade 10 (So)
                       - Post-A-level       - Grade 11 (Jr)
                       (TO BE ADDED)        - Grade 12 (Sr)

┌─────────────────────────────────────────────────────────┐
│   ONBOARDING STEP 4: SUBJECT GRADES (per Subject)       │
│                                                         │
│  Subject Name: [Mathematics]                            │
│  Level: [HL / SL / Standard / AP] (if applicable)       │
│  Current Grade: [Dropdown with system-specific options] │
│  Target Grade: [Dropdown with system-specific options]  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│   BACKEND: PRIORITY COEFFICIENT CALCULATION             │
│                                                         │
│  1. Normalize both grades to 0-100 scale               │
│     IB "6" → 83.33, A-Level "A" → 90, "A-" → 91       │
│                                                         │
│  2. Calculate gap = target_norm - current_norm          │
│                                                         │
│  3. Apply formula to convert gap to coefficient          │
│     Gap 30+ → Coefficient ~1.6-3.0x                     │
│                                                         │
│  4. Store in subjects.priority_coefficient              │
└─────────────────────────────────────────────────────────┘
```

---

## 11. SUMMARY OF MODIFICATIONS NEEDED

### To Add A-Level Year Choices (Year 12, Year 13, Post-A-level):

1. **File:** `/home/claudeuser/smartstudy/lib/education-config.ts` (Lines 91-179)
   - Remove "AS Level", "A2 Level", "Combined" programs
   - Keep single "A-Level" program
   - Ensure 65 subjects remain intact

2. **File:** `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx` (Lines 43-62)
   - Update gradeOptions for 'A-Level':
     ```typescript
     'A-Level': {
       'A-Level': [
         'Year 12 (Lower Sixth)',
         'Year 13 (Upper Sixth)',
         'Post-A-level (Gap Year / Retakes)'
       ]
     }
     ```

3. **No database schema changes needed:**
   - `grade_level` column already exists in `user_profiles`
   - String format can accommodate "Year 12 (Lower Sixth)" etc.
   - Priority calculator doesn't use grade_level (only education_system and education_program)

---

## 12. AFFECTED FILES SUMMARY

### Frontend Files:
- `/home/claudeuser/smartstudy/lib/education-config.ts` - Define education systems and grade scales
- `/home/claudeuser/smartstudy/components/onboarding/EducationSystemStep.tsx` - Year/grade level selection
- `/home/claudeuser/smartstudy/components/onboarding/SubjectsStep.tsx` - Current/target grade selection
- `/home/claudeuser/smartstudy/components/OnboardingModal.tsx` - Orchestrates onboarding flow

### Backend Files:
- `/home/claudeuser/smartstudy/backend/app/models/profile.py` - Stores grade_level
- `/home/claudeuser/smartstudy/backend/app/models/subject.py` - Stores current_grade, target_grade
- `/home/claudeuser/smartstudy/backend/app/utils/priority_calculator.py` - Calculates priority from grades
- `/home/claudeuser/smartstudy/backend/app/routers/onboarding.py` - Validates and saves grades
- `/home/claudeuser/smartstudy/backend/app/schemas/onboarding.py` - Pydantic schemas for grades

### API Files:
- `/home/claudeuser/smartstudy/lib/api/onboarding.ts` - Frontend API interface

---

## 13. CODE LOCATIONS QUICK REFERENCE

| What | Where | Lines |
|------|-------|-------|
| A-Level config | `lib/education-config.ts` | 91-179 |
| Grade options in UI | `components/onboarding/EducationSystemStep.tsx` | 39-62 |
| Subject grades input | `components/onboarding/SubjectsStep.tsx` | 193-235 |
| DB grade fields | `backend/app/models/subject.py` | 20-22 |
| Priority calculation | `backend/app/utils/priority_calculator.py` | 84-230 |
| Grade normalization | `backend/app/utils/priority_calculator.py` | 84-156 |
| Grading scales | `backend/app/utils/priority_calculator.py` | 25-81 |
| Onboarding API | `backend/app/routers/onboarding.py` | 22-105 |
| Pydantic schemas | `backend/app/schemas/onboarding.py` | 1-115 |

---

## 14. KEY INSIGHTS FOR A-LEVEL IMPLEMENTATION

1. **Old System (AS/A2)** - Abolished in 2015:
   - Was two separate qualifications taken in Year 12 and 13
   - AS (Advanced Subsidiary) - Year 12
   - A2 (Advanced Level) - Year 13

2. **New System (Linear A-Level)** - 2015-present:
   - Single A-Level qualification spanning Year 12-13
   - Full exams only at end of Year 13
   - Students may take some subjects after Year 12 (dropped subjects)

3. **User Scenarios:**
   - **Year 12 student:** Currently in first year of A-Level
   - **Year 13 student:** In final year, exam coming up
   - **Post-A-level student:** Gap year, retaking exams, or already completed

4. **Grade Scale Unchanged:**
   - A*, A, B, C, D, E, U remains the same
   - No changes needed to priority calculator or grade normalization

---

## CONCLUSION

The SmartStudy grade system is well-architected with:
- ✅ Three education systems properly configured
- ✅ Correct grade scales for each system
- ✅ Dynamic grade option selection in UI
- ✅ Grade-based priority calculation working correctly
- ✅ Database schema ready for all grade types

**One key fix needed:** Update A-Level to remove outdated AS/A2 options and add proper year choices (Year 12, Year 13, Post-A-level).

All other systems (IB, American) are correctly implemented and require no changes.

