"""
Comprehensive tests for the priority calculator module.
Run with: pytest app/utils/test_priority_calculator.py -v
"""

import pytest
from .priority_calculator import (
    normalize_grade,
    calculate_priority_coefficient,
    calculate_all_priorities,
    allocate_study_time,
    get_priority_explanation
)


class TestGradeNormalization:
    """Test grade normalization across different education systems."""

    def test_ib_numeric_grades(self):
        """Test IB 1-7 grading scale."""
        assert normalize_grade("1", "IB") == 0.0
        assert normalize_grade("4", "IB") == 50.0
        assert normalize_grade("7", "IB") == 100.0
        assert normalize_grade("5.5", "IB") == pytest.approx(75.0)

    def test_ib_invalid_grades(self):
        """Test IB grades outside valid range."""
        assert normalize_grade("0", "IB") is None
        assert normalize_grade("8", "IB") is None
        assert normalize_grade("", "IB") is None
        assert normalize_grade(None, "IB") is None

    def test_a_level_grades(self):
        """Test A-Level letter grades."""
        assert normalize_grade("A*", "A-Level") == 100.0
        assert normalize_grade("A", "A-Level") == 90.0
        assert normalize_grade("B", "A-Level") == 80.0
        assert normalize_grade("C", "A-Level") == 70.0
        assert normalize_grade("E", "A-Level") == 50.0
        assert normalize_grade("U", "A-Level") == 0.0

    def test_a_level_case_insensitive(self):
        """Test A-Level grades are case insensitive."""
        assert normalize_grade("a*", "A-Level") == 100.0
        assert normalize_grade("a", "A-Level") == 90.0
        assert normalize_grade("b", "A-Level") == 80.0

    def test_american_percentage(self):
        """Test American percentage grades."""
        assert normalize_grade("100", "American") == 100.0
        assert normalize_grade("85", "American") == 85.0
        assert normalize_grade("75.5", "American") == 75.5
        assert normalize_grade("0", "American") == 0.0
        assert normalize_grade("100%", "American") == 100.0
        assert normalize_grade("85%", "American") == 85.0

    def test_american_letter_grades(self):
        """Test American letter grades conversion."""
        a_plus = normalize_grade("A+", "American")
        assert 97 <= a_plus <= 100

        b = normalize_grade("B", "American")
        assert 83 <= b <= 86

        f = normalize_grade("F", "American")
        assert 0 <= f <= 59

    def test_ap_scores(self):
        """Test AP exam scores (1-5)."""
        assert normalize_grade("5", "AP", "AP") == 100.0
        assert normalize_grade("4", "AP", "AP") == 80.0
        assert normalize_grade("3", "AP", "AP") == 60.0
        assert normalize_grade("2", "AP", "AP") == 40.0
        assert normalize_grade("1", "AP", "AP") == 20.0


class TestPriorityCoefficient:
    """Test priority coefficient calculation."""

    def test_ib_basic_gap(self):
        """Test IB grade gap priority."""
        # Gap of 1 (6 -> 7)
        coef = calculate_priority_coefficient("6", "7", "IB")
        assert 0.5 <= coef <= 1.5  # Small gap = lower coefficient

        # Gap of 2 (4 -> 6)
        coef = calculate_priority_coefficient("4", "6", "IB")
        assert 1.5 <= coef <= 2.5  # Larger gap = higher coefficient

    def test_meeting_target(self):
        """Test when already at or exceeding target."""
        # Already at target
        coef = calculate_priority_coefficient("7", "7", "IB")
        assert coef == 0.5  # Minimum coefficient

        # Exceeding target
        coef = calculate_priority_coefficient("7", "6", "IB")
        assert coef == 0.5  # Minimum coefficient

    def test_missing_grades(self):
        """Test handling of missing grades."""
        coef = calculate_priority_coefficient(None, "7", "IB")
        assert coef == 1.0  # Default coefficient

        coef = calculate_priority_coefficient("6", None, "IB")
        assert coef == 1.0  # Default coefficient

    def test_level_weighting(self):
        """Test HL vs SL weighting."""
        hl_coef = calculate_priority_coefficient("6", "7", "IB", level="HL")
        sl_coef = calculate_priority_coefficient("6", "7", "IB", level="SL")

        assert hl_coef > sl_coef  # HL should get slightly higher priority

    def test_coefficient_bounds(self):
        """Test coefficient stays within min/max bounds."""
        # Very large gap
        coef = calculate_priority_coefficient("1", "7", "IB")
        assert coef <= 3.0  # Max coefficient

        # Already exceeding
        coef = calculate_priority_coefficient("7", "5", "IB")
        assert coef >= 0.5  # Min coefficient

    def test_american_system(self):
        """Test American grading system."""
        # 10 point gap
        coef = calculate_priority_coefficient("80", "90", "American")
        assert 1.0 <= coef <= 1.5

        # 30 point gap
        coef = calculate_priority_coefficient("60", "90", "American")
        assert 2.0 <= coef <= 3.0

    def test_a_level_system(self):
        """Test A-Level grading system."""
        # C to A gap
        coef = calculate_priority_coefficient("C", "A", "A-Level")
        assert 1.2 <= coef <= 1.8

        # E to A* gap
        coef = calculate_priority_coefficient("E", "A*", "A-Level")
        assert 2.0 <= coef <= 3.0


class TestCalculateAllPriorities:
    """Test batch priority calculation for multiple subjects."""

    def test_multiple_subjects(self):
        """Test calculating priorities for multiple subjects."""
        subjects = [
            {
                'id': '1',
                'name': 'Math',
                'current_grade': '6',
                'target_grade': '7',
                'education_system': 'IB',
                'level': 'HL'
            },
            {
                'id': '2',
                'name': 'Economics',
                'current_grade': '4',
                'target_grade': '6',
                'education_system': 'IB',
                'level': 'SL'
            }
        ]

        results = calculate_all_priorities(subjects)

        assert len(results) == 2
        assert all('priority_coefficient' in s for s in results)

        # Economics (gap=2) should have higher priority than Math (gap=1)
        math_coef = next(s['priority_coefficient'] for s in results if s['name'] == 'Math')
        econ_coef = next(s['priority_coefficient'] for s in results if s['name'] == 'Economics')

        assert econ_coef > math_coef

    def test_mixed_systems(self):
        """Test subjects from different education systems."""
        subjects = [
            {
                'id': '1',
                'name': 'Math',
                'current_grade': '6',
                'target_grade': '7',
                'education_system': 'IB'
            },
            {
                'id': '2',
                'name': 'English',
                'current_grade': 'B',
                'target_grade': 'A',
                'education_system': 'A-Level'
            }
        ]

        results = calculate_all_priorities(subjects)
        assert len(results) == 2
        assert all('priority_coefficient' in s for s in results)


class TestStudyTimeAllocation:
    """Test study time allocation algorithm."""

    def test_basic_allocation(self):
        """Test basic proportional allocation."""
        subjects = [
            {'id': '1', 'priority_coefficient': 1.0, 'name': 'Math'},
            {'id': '2', 'priority_coefficient': 2.0, 'name': 'Economics'}
        ]

        allocation = allocate_study_time(subjects, 10.0)

        assert len(allocation) == 2
        assert '1' in allocation
        assert '2' in allocation

        # Economics should get roughly twice the time of Math
        assert allocation['2'] > allocation['1']
        assert pytest.approx(allocation['2'], rel=0.1) == allocation['1'] * 2

        # Total should equal available hours
        total = sum(allocation.values())
        assert pytest.approx(total, abs=0.5) == 10.0

    def test_equal_priorities(self):
        """Test equal allocation when priorities are same."""
        subjects = [
            {'id': '1', 'priority_coefficient': 1.0},
            {'id': '2', 'priority_coefficient': 1.0},
            {'id': '3', 'priority_coefficient': 1.0}
        ]

        allocation = allocate_study_time(subjects, 12.0)

        # Each should get approximately 4 hours
        for subject_id in ['1', '2', '3']:
            assert pytest.approx(allocation[subject_id], abs=0.5) == 4.0

    def test_minimum_hours_constraint(self):
        """Test minimum hours per subject constraint."""
        subjects = [
            {'id': '1', 'priority_coefficient': 0.1},  # Very low priority
            {'id': '2', 'priority_coefficient': 5.0}   # Very high priority
        ]

        allocation = allocate_study_time(subjects, 10.0, min_hours_per_subject=1.0)

        # Even low priority subject should get at least 1 hour
        assert allocation['1'] >= 1.0

    def test_maximum_hours_constraint(self):
        """Test maximum hours per subject constraint."""
        subjects = [
            {'id': '1', 'priority_coefficient': 0.5},
            {'id': '2', 'priority_coefficient': 10.0}  # Very high priority
        ]

        allocation = allocate_study_time(subjects, 20.0, max_hours_per_subject=12.0)

        # High priority subject shouldn't exceed max
        assert allocation['2'] <= 12.0

    def test_real_world_scenario(self):
        """Test realistic scenario with multiple subjects."""
        # User's example: 10 hours/week, Math(6->7) and Econ(4->6)
        subjects = [
            {'id': 'math', 'priority_coefficient': 1.0, 'name': 'Math'},
            {'id': 'econ', 'priority_coefficient': 2.0, 'name': 'Economics'}
        ]

        allocation = allocate_study_time(subjects, 10.0)

        # Based on example: Econ should get ~6.67, Math ~3.33
        assert pytest.approx(allocation['math'], abs=0.5) == 3.33
        assert pytest.approx(allocation['econ'], abs=0.5) == 6.67

    def test_empty_subjects(self):
        """Test handling empty subject list."""
        allocation = allocate_study_time([], 10.0)
        assert allocation == {}

    def test_zero_hours(self):
        """Test handling zero available hours."""
        subjects = [{'id': '1', 'priority_coefficient': 1.0}]
        allocation = allocate_study_time(subjects, 0.0)
        assert allocation == {}


class TestPriorityExplanation:
    """Test human-readable priority explanations."""

    def test_explanation_generation(self):
        """Test explanation text generation."""
        explanation = get_priority_explanation("6", "7", 1.2, "IB")
        assert "6" in explanation
        assert "7" in explanation
        assert "1.2" in explanation or "1.20" in explanation

    def test_missing_grades_explanation(self):
        """Test explanation when grades are missing."""
        explanation = get_priority_explanation(None, "7", 1.0, "IB")
        assert "neutral" in explanation.lower()

    def test_exceeding_target_explanation(self):
        """Test explanation when exceeding target."""
        explanation = get_priority_explanation("7", "6", 0.5, "IB")
        assert "meeting" in explanation.lower() or "exceeding" in explanation.lower()


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_invalid_grade_formats(self):
        """Test handling of invalid grade formats."""
        assert normalize_grade("abc", "IB") is None
        assert normalize_grade("--", "IB") is None
        assert normalize_grade("7.5.5", "IB") is None

    def test_boundary_values(self):
        """Test boundary values in grading scales."""
        # IB boundaries
        assert normalize_grade("1", "IB") == 0.0
        assert normalize_grade("7", "IB") == 100.0

        # American boundaries
        assert normalize_grade("0", "American") == 0.0
        assert normalize_grade("100", "American") == 100.0

    def test_negative_coefficients(self):
        """Ensure coefficients are never negative."""
        coef = calculate_priority_coefficient("7", "1", "IB")  # Reverse gap
        assert coef >= 0.5  # Should give minimum, not negative

    def test_very_large_gaps(self):
        """Test handling of very large grade gaps."""
        coef = calculate_priority_coefficient("1", "7", "IB")
        assert 2.0 <= coef <= 3.0  # Should cap at max

    def test_whitespace_handling(self):
        """Test handling of whitespace in grades."""
        assert normalize_grade(" 6 ", "IB") == normalize_grade("6", "IB")
        assert normalize_grade(" A ", "A-Level") == normalize_grade("A", "A-Level")


# Integration test
def test_full_workflow():
    """Test complete workflow: calculate priorities and allocate time."""
    # Scenario: 3 subjects, 15 hours available per week
    subjects = [
        {
            'id': 'math',
            'name': 'Mathematics HL',
            'current_grade': '6',
            'target_grade': '7',
            'education_system': 'IB',
            'level': 'HL'
        },
        {
            'id': 'econ',
            'name': 'Economics SL',
            'current_grade': '4',
            'target_grade': '6',
            'education_system': 'IB',
            'level': 'SL'
        },
        {
            'id': 'english',
            'name': 'English A SL',
            'current_grade': '5',
            'target_grade': '6',
            'education_system': 'IB',
            'level': 'SL'
        }
    ]

    # Step 1: Calculate priorities
    subjects_with_priorities = calculate_all_priorities(subjects)

    assert len(subjects_with_priorities) == 3
    for s in subjects_with_priorities:
        assert 'priority_coefficient' in s
        assert 0.5 <= s['priority_coefficient'] <= 3.0

    # Step 2: Allocate study time
    allocation = allocate_study_time(subjects_with_priorities, 15.0)

    assert len(allocation) == 3
    total_hours = sum(allocation.values())
    assert pytest.approx(total_hours, abs=1.0) == 15.0

    # Economics (gap=2) should get most time
    # English (gap=1) should get moderate time
    # Math (gap=1 but HL) should get moderate-high time

    assert allocation['econ'] > allocation['english']  # Larger gap wins

    # Verify all subjects got some time
    for subject_id in ['math', 'econ', 'english']:
        assert allocation[subject_id] > 0


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
