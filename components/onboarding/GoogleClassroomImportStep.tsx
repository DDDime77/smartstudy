'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Course {
  id: string;
  name: string;
  section: string | null;
  description: string | null;
  suggested_level: string | null;
  suggested_category: string | null;
}

interface CourseWithGrades extends Course {
  current_grade: string;
  target_grade: string;
}

interface GoogleClassroomImportStepProps {
  onImportComplete: (subjects: any[]) => void;
  educationSystem: string;
  onboardingState?: any;
}

export default function GoogleClassroomImportStep({
  onImportComplete,
  educationSystem,
  onboardingState
}: GoogleClassroomImportStepProps) {
  const [step, setStep] = useState<'oauth' | 'select_courses'>('oauth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [courseGrades, setCourseGrades] = useState<Map<string, { current: string; target: string }>>(new Map());

  // Grade options based on education system
  const getGradeOptions = () => {
    if (educationSystem === 'IB') {
      return ['1', '2', '3', '4', '5', '6', '7'];
    } else if (educationSystem === 'A-Level') {
      return ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
    } else {
      // American system
      return ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    }
  };

  const gradeOptions = getGradeOptions();

  useEffect(() => {
    const checkOAuthCallback = async () => {
      console.log('🟣 [GoogleClassroom Frontend] ====== Checking for OAuth callback ======');
      const urlParams = new URLSearchParams(window.location.search);
      const hasClassroomParam = urlParams.get('classroom') === 'success';
      console.log('🟣 [GoogleClassroom Frontend] Has classroom=success param:', hasClassroomParam);

      if (hasClassroomParam) {
        console.log('🟣 [GoogleClassroom Frontend] OAuth callback detected, fetching courses...');
        setIsLoading(true);
        try {
          console.log('🟣 [GoogleClassroom Frontend] Calling /api/google-classroom/courses...');
          const response = await fetch('/api/google-classroom/courses');
          console.log('🟣 [GoogleClassroom Frontend] Response status:', response.status);

          if (!response.ok) {
            throw new Error('Failed to fetch courses');
          }

          const coursesData = await response.json();
          console.log('✅ [GoogleClassroom Frontend] Received', coursesData.length, 'courses from API');
          console.log('📚 [GoogleClassroom Frontend] Course details:', coursesData);
          setCourses(coursesData);

          console.log('🟣 [GoogleClassroom Frontend] Auto-selecting all courses...');
          setSelectedCourses(new Set(coursesData.map((c: Course) => c.id)));

          console.log('🟣 [GoogleClassroom Frontend] Initializing grade inputs...');
          const initialGrades = new Map();
          coursesData.forEach((course: Course) => {
            initialGrades.set(course.id, { current: '', target: '' });
          });
          setCourseGrades(initialGrades);

          console.log('✅ [GoogleClassroom Frontend] Transitioning to course selection UI');
          setStep('select_courses');

          console.log('🟣 [GoogleClassroom Frontend] Cleaning up URL parameters...');
          window.history.replaceState({}, '', window.location.pathname);
          console.log('🎉 [GoogleClassroom Frontend] ====== Course loading complete ======');
        } catch (err: any) {
          console.error('🔴 [GoogleClassroom Frontend] Error loading courses:', err);
          setError(err.message || 'Failed to load courses');
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('🟣 [GoogleClassroom Frontend] No OAuth callback detected, showing OAuth button');
      }
    };

    checkOAuthCallback();
  }, []);

  const handleGoogleOAuth = async () => {
    console.log('🟣 [GoogleClassroom Frontend] ====== Initiating Google OAuth ======');
    setIsLoading(true);
    setError(null);

    try {
      // Save onboarding state before redirecting to OAuth
      if (onboardingState) {
        console.log('🟣 [GoogleClassroom Frontend] Saving onboarding state to localStorage:', onboardingState);
        localStorage.setItem('onboarding_state', JSON.stringify(onboardingState));
        console.log('✅ [GoogleClassroom Frontend] Onboarding state saved');
      } else {
        console.log('⚠️ [GoogleClassroom Frontend] No onboarding state to save');
      }

      console.log('🟣 [GoogleClassroom Frontend] Fetching OAuth URL from /api/google-classroom/oauth-url...');
      const response = await fetch('/api/google-classroom/oauth-url', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Google OAuth');
      }

      const { url } = await response.json();
      console.log('✅ [GoogleClassroom Frontend] Received OAuth URL:', url);
      console.log('🟣 [GoogleClassroom Frontend] Redirecting to Google OAuth...');
      window.location.href = url;

    } catch (err: any) {
      console.error('🔴 [GoogleClassroom Frontend] Error initiating OAuth:', err);
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    const newSelection = new Set(selectedCourses);
    if (newSelection.has(courseId)) {
      newSelection.delete(courseId);
    } else {
      newSelection.add(courseId);
    }
    setSelectedCourses(newSelection);
  };

  const updateGrade = (courseId: string, type: 'current' | 'target', value: string) => {
    const newGrades = new Map(courseGrades);
    const existing = newGrades.get(courseId) || { current: '', target: '' };
    newGrades.set(courseId, {
      ...existing,
      [type]: value
    });
    setCourseGrades(newGrades);
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate that all selected courses have grades
      const selectedCoursesArray = courses.filter(c => selectedCourses.has(c.id));
      const missingGrades = selectedCoursesArray.some(course => {
        const grades = courseGrades.get(course.id);
        return !grades || !grades.current || !grades.target;
      });

      if (missingGrades) {
        setError('Please set current and target grades for all selected courses');
        setIsLoading(false);
        return;
      }

      // Prepare import data
      const subjectsToImport = selectedCoursesArray.map(course => {
        const grades = courseGrades.get(course.id)!;
        return {
          course_id: course.id,
          course_name: course.name,
          current_grade: grades.current,
          target_grade: grades.target,
          level: course.suggested_level,
          category: course.suggested_category
        };
      });

      // Send import request
      const response = await fetch('/api/google-classroom/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(subjectsToImport)
      });

      if (!response.ok) {
        throw new Error('Failed to import subjects');
      }

      const result = await response.json();
      onImportComplete(result.subjects);

    } catch (err: any) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'oauth') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-white mb-2">Connect Google Classroom</h3>
          <p className="text-slate-400 text-sm">
            Sign in with your Google account to import your courses
          </p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleOAuth}
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-3 h-12"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Connecting...' : 'Sign in with Google'}
          </Button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
          <div className="font-medium text-white mb-1">What happens next:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>You'll be redirected to Google's secure sign-in page</li>
            <li>Grant permission to access your Google Classroom courses</li>
            <li>Select which courses you want to import</li>
            <li>Set your current and target grades for each course</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-white mb-2">Select Courses to Import</h3>
        <p className="text-slate-400 text-sm">
          Choose which courses to add as subjects and set your grades
        </p>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {courses.map((course) => {
          const isSelected = selectedCourses.has(course.id);
          const grades = courseGrades.get(course.id) || { current: '', target: '' };

          return (
            <div
              key={course.id}
              className={`bg-black/40 border rounded-xl p-4 transition-all ${
                isSelected ? 'border-white/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCourseSelection(course.id)}
                  className="mt-1 h-5 w-5 rounded border-white/20 bg-black/60 text-white focus:ring-white/40"
                />

                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-semibold text-white">{course.name}</h4>
                    {course.section && (
                      <p className="text-xs text-slate-400">{course.section}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {course.suggested_level && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                          {course.suggested_level}
                        </span>
                      )}
                      {course.suggested_category && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                          {course.suggested_category}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Current Grade</label>
                        <Select
                          value={grades.current}
                          onValueChange={(value) => updateGrade(course.id, 'current', value)}
                        >
                          <SelectTrigger className="bg-black/60 border-white/20 text-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/20">
                            {gradeOptions.map((grade) => (
                              <SelectItem key={grade} value={grade} className="text-white hover:bg-white/10">
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Target Grade</label>
                        <Select
                          value={grades.target}
                          onValueChange={(value) => updateGrade(course.id, 'target', value)}
                        >
                          <SelectTrigger className="bg-black/60 border-white/20 text-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/20">
                            {gradeOptions.map((grade) => (
                              <SelectItem key={grade} value={grade} className="text-white hover:bg-white/10">
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => setStep('oauth')}
          variant="outline"
          className="flex-1 border-white/20 text-white hover:bg-white/10"
        >
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={isLoading || selectedCourses.size === 0}
          className="flex-1 bg-white text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isLoading ? 'Importing...' : `Import ${selectedCourses.size} Course${selectedCourses.size !== 1 ? 's' : ''}`}
        </Button>
      </div>

      <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-3 text-xs text-slate-400">
        {selectedCourses.size} of {courses.length} courses selected
      </div>
    </div>
  );
}
