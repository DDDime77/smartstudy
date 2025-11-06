"""
Priority Coefficient Calculator for Study Time Allocation

This module calculates priority coefficients for subjects based on the gap between
actual and target grades, then allocates study time proportionally.

Example:
    User has 10 hours/week available
    Math: actual=6, target=7, gap=1
    Economics: actual=4, target=6, gap=2

    Priority coefficients: Math=1.0, Economics=2.0
    Total priority = 3.0

    Time allocation:
    - Math: 10 * (1.0/3.0) = 3.33 hours
    - Economics: 10 * (2.0/3.0) = 6.67 hours
"""

from typing import Dict, List, Tuple, Optional
import re


# Grading scale configurations for different education systems
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
        "letter_conversion": {
            "A+": (97, 100),
            "A": (93, 96),
            "A-": (90, 92),
            "B+": (87, 89),
            "B": (83, 86),
            "B-": (80, 82),
            "C+": (77, 79),
            "C": (73, 76),
            "C-": (70, 72),
            "D+": (67, 69),
            "D": (63, 66),
            "D-": (60, 62),
            "F": (0, 59)
        },
        "description": "American percentage or letter grade"
    },
    "AP": {
        "scale_type": "ap_score",
        "grades": {
            "5": 100,
            "4": 80,
            "3": 60,
            "2": 40,
            "1": 20
        },
        "passing": 60,
        "description": "AP exam scores: 1-5"
    }
}


def normalize_grade(grade_str: Optional[str], education_system: str, education_program: Optional[str] = None) -> Optional[float]:
    """
    Normalize a grade to a 0-100 scale for comparison across systems.

    Args:
        grade_str: The grade as a string (e.g., "6", "A", "85", "B+")
        education_system: The education system (IB, A-Level, American)
        education_program: The specific program (IBDP, AP, etc.)

    Returns:
        Normalized grade on 0-100 scale, or None if invalid
    """
    if not grade_str or grade_str.strip() == "":
        return None

    grade_str = grade_str.strip().upper()

    # Determine which grading scale to use
    scale_key = education_system
    if education_program and education_program.upper() == "AP":
        scale_key = "AP"

    if scale_key not in GRADING_SCALES:
        scale_key = "IB"  # Default fallback

    scale = GRADING_SCALES[scale_key]

    try:
        if scale["scale_type"] == "numeric":
            # IB-style numeric grades (1-7)
            numeric_val = float(grade_str)
            min_val = scale["min"]
            max_val = scale["max"]

            if min_val <= numeric_val <= max_val:
                # Normalize to 0-100
                return ((numeric_val - min_val) / (max_val - min_val)) * 100
            return None

        elif scale["scale_type"] == "letter":
            # A-Level style letter grades
            grade_map = scale["grades"]
            if grade_str in grade_map:
                return float(grade_map[grade_str])
            return None

        elif scale["scale_type"] == "percentage":
            # American percentage system
            # First check if it's a letter grade
            if grade_str in scale["letter_conversion"]:
                min_pct, max_pct = scale["letter_conversion"][grade_str]
                return (min_pct + max_pct) / 2.0

            # Try to parse as percentage
            # Handle formats like "85%", "85.5%", or just "85"
            cleaned = grade_str.replace("%", "").strip()
            numeric_val = float(cleaned)

            if scale["min"] <= numeric_val <= scale["max"]:
                return float(numeric_val)
            return None

        elif scale["scale_type"] == "ap_score":
            # AP scores (1-5)
            grade_map = scale["grades"]
            if grade_str in grade_map:
                return float(grade_map[grade_str])
            return None

    except (ValueError, KeyError):
        return None

    return None


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
    Calculate priority coefficient for a subject based on grade gap.

    The coefficient represents how much priority/study time this subject should receive
    relative to others. Higher gap = higher coefficient = more time allocated.

    Args:
        current_grade: Student's current grade
        target_grade: Student's target grade
        education_system: The education system (IB, A-Level, American)
        education_program: The specific program (IBDP, AP, etc.)
        level: Subject level (HL, SL, AP, etc.) - used for additional weighting
        min_coefficient: Minimum coefficient value (default: 0.5)
        max_coefficient: Maximum coefficient value (default: 3.0)

    Returns:
        Priority coefficient (float between min_coefficient and max_coefficient)
    """
    # Normalize grades to 0-100 scale
    current_normalized = normalize_grade(current_grade, education_system, education_program)
    target_normalized = normalize_grade(target_grade, education_system, education_program)

    # If either grade is missing, return default coefficient
    if current_normalized is None or target_normalized is None:
        return 1.0

    # Calculate gap (positive means needs improvement, negative means exceeding target)
    grade_gap = target_normalized - current_normalized

    # If already at or above target, give minimum coefficient
    if grade_gap <= 0:
        return min_coefficient

    # Map grade gap to coefficient
    # Larger gaps get exponentially higher coefficients
    # Example gaps and coefficients:
    # - 5 point gap: ~1.0
    # - 10 point gap: ~1.2
    # - 20 point gap: ~1.6
    # - 30 point gap: ~2.2
    # - 50 point gap: ~3.0 (max)

    # Use a logarithmic-esque formula for smooth scaling
    base_coefficient = 1.0 + (grade_gap / 25.0)  # 25 points gap = 2.0 coefficient

    # Apply exponential factor for very large gaps
    if grade_gap > 30:
        exponential_factor = 1.0 + ((grade_gap - 30) / 30.0) * 0.5
        base_coefficient *= exponential_factor

    # Apply level weighting (HL courses might get slightly higher priority)
    level_multiplier = 1.0
    if level:
        level_upper = level.upper()
        if level_upper in ["HL", "HIGHER", "AP", "HONORS"]:
            level_multiplier = 1.1  # 10% boost for higher level courses
        elif level_upper in ["SL", "STANDARD"]:
            level_multiplier = 1.0

    final_coefficient = base_coefficient * level_multiplier

    # Clamp to min/max range
    return max(min_coefficient, min(max_coefficient, final_coefficient))


def calculate_all_priorities(subjects: List[Dict]) -> List[Dict]:
    """
    Calculate priority coefficients for all subjects.

    Args:
        subjects: List of subject dictionaries with keys:
            - id: subject ID
            - name: subject name
            - current_grade: current grade (optional)
            - target_grade: target grade (optional)
            - education_system: education system
            - education_program: education program (optional)
            - level: subject level (optional)

    Returns:
        List of subject dictionaries with added 'priority_coefficient' key
    """
    results = []

    for subject in subjects:
        coefficient = calculate_priority_coefficient(
            current_grade=subject.get('current_grade'),
            target_grade=subject.get('target_grade'),
            education_system=subject.get('education_system', 'IB'),
            education_program=subject.get('education_program'),
            level=subject.get('level')
        )

        result = subject.copy()
        result['priority_coefficient'] = round(coefficient, 3)
        results.append(result)

    return results


def allocate_study_time(
    subjects: List[Dict],
    total_hours_available: float,
    min_hours_per_subject: float = 0.5,
    max_hours_per_subject: Optional[float] = None
) -> Dict[str, float]:
    """
    Allocate study time across subjects based on priority coefficients.

    Example:
        subjects = [
            {'id': '1', 'priority_coefficient': 1.0, 'name': 'Math'},
            {'id': '2', 'priority_coefficient': 2.0, 'name': 'Economics'}
        ]
        total_hours_available = 10

        Result: {'1': 3.33, '2': 6.67}

    Args:
        subjects: List of subjects with 'id' and 'priority_coefficient' keys
        total_hours_available: Total study hours available per week
        min_hours_per_subject: Minimum hours to allocate per subject (default: 0.5)
        max_hours_per_subject: Maximum hours to allocate per subject (optional)

    Returns:
        Dictionary mapping subject_id to allocated hours
    """
    if not subjects or total_hours_available <= 0:
        return {}

    # Filter subjects with valid coefficients
    valid_subjects = [s for s in subjects if 'priority_coefficient' in s and s['priority_coefficient'] > 0]

    if not valid_subjects:
        # No valid subjects, distribute equally
        hours_per_subject = total_hours_available / len(subjects)
        return {str(s['id']): round(hours_per_subject, 2) for s in subjects}

    # Calculate total priority weight
    total_priority = sum(s['priority_coefficient'] for s in valid_subjects)

    # Allocate proportionally
    allocation = {}
    remaining_hours = total_hours_available

    for subject in valid_subjects:
        subject_id = str(subject['id'])
        coefficient = subject['priority_coefficient']

        # Calculate proportional allocation
        allocated_hours = (coefficient / total_priority) * total_hours_available

        # Apply min/max constraints
        allocated_hours = max(min_hours_per_subject, allocated_hours)
        if max_hours_per_subject:
            allocated_hours = min(max_hours_per_subject, allocated_hours)

        allocation[subject_id] = round(allocated_hours, 2)
        remaining_hours -= allocated_hours

    # Redistribute any remaining hours due to rounding or constraints
    if remaining_hours > 0.1 and valid_subjects:
        # Give extra time to highest priority subject
        highest_priority_id = max(valid_subjects, key=lambda s: s['priority_coefficient'])['id']
        allocation[str(highest_priority_id)] += round(remaining_hours, 2)

    return allocation


def get_priority_explanation(
    current_grade: Optional[str],
    target_grade: Optional[str],
    priority_coefficient: float,
    education_system: str
) -> str:
    """
    Generate human-readable explanation for priority coefficient.

    Args:
        current_grade: Current grade string
        target_grade: Target grade string
        priority_coefficient: Calculated coefficient
        education_system: Education system name

    Returns:
        Explanation string
    """
    if not current_grade or not target_grade:
        return "Priority set to neutral (no grades provided)"

    current_norm = normalize_grade(current_grade, education_system)
    target_norm = normalize_grade(target_grade, education_system)

    if current_norm is None or target_norm is None:
        return f"Priority set to neutral (unable to parse grades: {current_grade} → {target_grade})"

    gap = target_norm - current_norm

    if gap <= 0:
        return f"Currently meeting/exceeding target ({current_grade} ≥ {target_grade}) - lower priority (×{priority_coefficient:.2f})"
    elif gap < 10:
        return f"Small improvement needed ({current_grade} → {target_grade}) - standard priority (×{priority_coefficient:.2f})"
    elif gap < 20:
        return f"Moderate improvement needed ({current_grade} → {target_grade}) - elevated priority (×{priority_coefficient:.2f})"
    elif gap < 35:
        return f"Significant improvement needed ({current_grade} → {target_grade}) - high priority (×{priority_coefficient:.2f})"
    else:
        return f"Major improvement needed ({current_grade} → {target_grade}) - highest priority (×{priority_coefficient:.2f})"


# Test/validation functions
def validate_grading_system(education_system: str) -> bool:
    """Check if an education system is supported."""
    return education_system in GRADING_SCALES


def get_supported_systems() -> List[str]:
    """Get list of supported education systems."""
    return list(GRADING_SCALES.keys())


def get_grading_scale_info(education_system: str) -> Optional[Dict]:
    """Get grading scale information for a system."""
    return GRADING_SCALES.get(education_system)
