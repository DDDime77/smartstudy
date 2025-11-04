'use client';

import { useState } from 'react';
import { EDUCATION_SYSTEMS } from '@/lib/education-config';
import { SubjectInput } from '@/lib/api/onboarding';

interface SubjectsStepProps {
  subjects: SubjectInput[];
  educationSystem: string;
  educationProgram: string;
  onChange: (subjects: SubjectInput[]) => void;
}

export default function SubjectsStep({
  subjects,
  educationSystem,
  educationProgram,
  onChange,
}: SubjectsStepProps) {
  const [currentSubject, setCurrentSubject] = useState<Partial<SubjectInput>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const systemConfig = EDUCATION_SYSTEMS[educationSystem as keyof typeof EDUCATION_SYSTEMS];
  const programConfig = systemConfig?.programs[educationProgram];

  const getSubjectsByCategory = () => {
    if (!programConfig || !('subjectGroups' in programConfig)) return {};
    return programConfig.subjectGroups || {};
  };

  const getSubjectList = () => {
    if (!programConfig) return [];
    if ('subjectGroups' in programConfig) {
      // IB system with groups
      return [];
    }
    return programConfig.subjects || [];
  };

  const getGradingOptions = () => {
    if (!programConfig?.grading) return [];
    // Handle American system which uses letterGrades
    if ('letterGrades' in programConfig.grading) {
      return programConfig.grading.letterGrades.map((g: any) => g.letter);
    }
    // Handle IB and A-Level which use scale
    return programConfig.grading.scale || [];
  };

  const getLevelOptions = () => {
    if (educationSystem === 'IB' && 'subjectGroups' in programConfig) {
      return ['HL', 'SL'];
    }
    if (educationSystem === 'American') {
      return ['Standard', 'AP'];
    }
    return [];
  };

  const subjectGroups = getSubjectsByCategory();
  const subjectList = getSubjectList();
  const hasCategories = Object.keys(subjectGroups).length > 0;

  const addSubject = () => {
    if (!currentSubject.name) return;

    const newSubject: SubjectInput = {
      id: `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: currentSubject.name,
      level: currentSubject.level,
      category: selectedCategory || currentSubject.category,
      current_grade: currentSubject.current_grade,
      target_grade: currentSubject.target_grade,
      color: getRandomColor(),
    };

    onChange([...subjects, newSubject]);
    setCurrentSubject({});
    setSelectedCategory('');
  };

  const removeSubject = (id: string) => {
    onChange(subjects.filter((subject) => subject.id !== id));
  };

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-white mb-2">Add Your Subjects</h3>
        <p className="text-slate-400 text-sm">
          Add all the subjects you're currently studying
        </p>
      </div>

      {/* Subject Input Form */}
      <div className="p-6 rounded-xl bg-black/40 border border-white/10 space-y-4">
        {/* Category Selection (for IB) */}
        {hasCategories && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Subject Group
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentSubject({ ...currentSubject, name: '' });
              }}
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select a group...</option>
              {Object.keys(subjectGroups).map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subject Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Subject Name
          </label>
          {hasCategories && selectedCategory ? (
            <select
              value={currentSubject.name || ''}
              onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select a subject...</option>
              {subjectGroups[selectedCategory]?.map((subject: any) => {
                const subjectName = typeof subject === 'string' ? subject : subject.name;
                return (
                  <option key={subjectName} value={subjectName}>
                    {subjectName}
                  </option>
                );
              })}
            </select>
          ) : !hasCategories ? (
            <select
              value={currentSubject.name || ''}
              onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select a subject...</option>
              {subjectList.map((subject: any) => {
                const subjectName = typeof subject === 'string' ? subject : subject.name;
                return (
                  <option key={subjectName} value={subjectName}>
                    {subjectName}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="text-sm text-slate-400 py-2">Please select a group first</div>
          )}
        </div>

        {/* Level (HL/SL or Standard/AP) */}
        {getLevelOptions().length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Level
            </label>
            <div className="flex gap-2">
              {getLevelOptions().map((level) => (
                <button
                  key={level}
                  onClick={() => setCurrentSubject({ ...currentSubject, level })}
                  className={`flex-1 px-4 py-2.5 rounded-lg border transition-all ${
                    currentSubject.level === level
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Grade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Grade
            </label>
            <select
              value={currentSubject.current_grade || ''}
              onChange={(e) =>
                setCurrentSubject({ ...currentSubject, current_grade: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select grade...</option>
              {getGradingOptions().map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Target Grade */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Grade
            </label>
            <select
              value={currentSubject.target_grade || ''}
              onChange={(e) =>
                setCurrentSubject({ ...currentSubject, target_grade: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">Select grade...</option>
              {getGradingOptions().map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={addSubject}
          disabled={!currentSubject.name}
          className="w-full px-4 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Subject
        </button>
      </div>

      {/* Added Subjects List */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Your Subjects ({subjects.length})
          </label>
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="p-4 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between group hover:bg-black/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {subject.name}
                      {subject.level && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                          {subject.level}
                        </span>
                      )}
                    </div>
                    {(subject.current_grade || subject.target_grade) && (
                      <div className="text-xs text-slate-400 mt-1">
                        {subject.current_grade && `Current: ${subject.current_grade}`}
                        {subject.current_grade && subject.target_grade && ' • '}
                        {subject.target_grade && `Target: ${subject.target_grade}`}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeSubject(subject.id!)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
