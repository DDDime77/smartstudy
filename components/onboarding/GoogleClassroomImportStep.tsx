'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
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
}

export default function GoogleClassroomImportStep({
  onImportComplete,
  educationSystem
}: GoogleClassroomImportStepProps) {
  const [step, setStep] = useState<'api_key' | 'select_courses'>('api_key');
  const [apiKey, setApiKey] = useState('');
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

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save API key
      const saveResponse = await fetch('/api/google-classroom/save-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save API key');
      }

      // Fetch courses
      const coursesResponse = await fetch('/api/google-classroom/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!coursesResponse.ok) {
        throw new Error('Failed to fetch courses. Please check your API key.');
      }

      const coursesData = await coursesResponse.json();
      setCourses(coursesData);

      // Select all courses by default
      setSelectedCourses(new Set(coursesData.map((c: Course) => c.id)));

      // Initialize empty grades for all courses
      const initialGrades = new Map();
      coursesData.forEach((course: Course) => {
        initialGrades.set(course.id, { current: '', target: '' });
      });
      setCourseGrades(initialGrades);

      setStep('select_courses');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
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

  if (step === 'api_key') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h3 className="text-xl font-semibold text-white mb-2">Enter Your Google Classroom API Key</h3>
          <p className="text-slate-400 text-sm">
            We'll use this to fetch your courses from Google Classroom
          </p>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium text-white">
              API Key
            </label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Google Classroom API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-black/60 border-white/20 text-white placeholder:text-slate-500 focus:border-white/40"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              You can get your API key from the Google Cloud Console
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleSaveApiKey}
            disabled={isLoading || !apiKey.trim()}
            className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect to Google Classroom'}
          </Button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
          <div className="font-medium text-white mb-1">How to get your API key:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Go to Google Cloud Console</li>
            <li>Enable the Classroom API</li>
            <li>Create credentials (API key)</li>
            <li>Copy and paste it here</li>
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
                    {course.suggested_level && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {course.suggested_level}
                      </span>
                    )}
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
          onClick={() => setStep('api_key')}
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
