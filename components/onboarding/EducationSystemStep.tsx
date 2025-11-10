'use client';

import { EDUCATION_SYSTEMS } from '@/lib/education-config';

interface EducationSystemStepProps {
  educationSystem: string;
  educationProgram: string;
  gradeLevel: string;
  onChange: (system: string, program: string, grade?: string) => void;
}

export default function EducationSystemStep({
  educationSystem,
  educationProgram,
  gradeLevel,
  onChange,
}: EducationSystemStepProps) {
  const systems = Object.keys(EDUCATION_SYSTEMS);

  const handleSystemSelect = (system: string) => {
    // Reset program and grade when system changes
    onChange(system, '', '');
  };

  const handleProgramSelect = (program: string) => {
    onChange(educationSystem, program, '');
  };

  const handleGradeSelect = (grade: string) => {
    onChange(educationSystem, educationProgram, grade);
  };

  const getPrograms = () => {
    if (!educationSystem) return [];
    const system = EDUCATION_SYSTEMS[educationSystem as keyof typeof EDUCATION_SYSTEMS];
    return Object.keys(system.programs);
  };

  const getGradeOptions = () => {
    if (!educationSystem || !educationProgram) return [];

    // Define grade/year options for each education system and program
    const gradeOptions: Record<string, Record<string, string[]>> = {
      'IB': {
        'IBDP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
        'IBCP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
        'IB Courses': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)']
      },
      'A-Level': {
        'A-Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
      },
      'American': {
        'Standard': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
        'AP': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
        'Honors': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)']
      }
    };

    return gradeOptions[educationSystem]?.[educationProgram] || [];
  };

  const systemIcons: Record<string, string> = {
    IB: '🎓',
    'A-Level': '📚',
    American: '🏫',
  };

  const systemDescriptions: Record<string, string> = {
    IB: 'International Baccalaureate',
    'A-Level': 'British A-Level System',
    American: 'American Education System',
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📖</div>
        <h3 className="text-xl font-semibold text-white mb-2">Select Your Education System</h3>
        <p className="text-slate-400 text-sm">
          This helps us customize your study plans and subject options
        </p>
      </div>

      {/* Education System Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Education System
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systems.map((system) => (
            <button
              key={system}
              onClick={() => handleSystemSelect(system)}
              className={`
                relative overflow-hidden rounded-2xl p-8
                glass-effect border transition-all duration-500
                hover:scale-[1.05] hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]
                group
                ${educationSystem === system ? 'border-white/30' : 'border-white/10 hover:border-white/20'}
              `}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-500">{systemIcons[system]}</div>
                <div className="text-lg font-bold text-white mb-2">{system}</div>
                <div className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                  {systemDescriptions[system]}
                </div>
                {educationSystem === system && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Selected
                  </div>
                )}
              </div>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Program Selection (only shows when system is selected) */}
      {educationSystem && (
        <div className="space-y-4 animate-slide-up">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Program Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getPrograms().map((program) => (
              <button
                key={program}
                onClick={() => handleProgramSelect(program)}
                className={`
                  relative overflow-hidden rounded-xl p-5
                  glass-effect border transition-all duration-300
                  hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]
                  group
                  ${educationProgram === program ? 'border-white/30' : 'border-white/10 hover:border-white/20'}
                `}
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className={`font-medium ${educationProgram === program ? 'text-white' : 'text-white/70 group-hover:text-white'} transition-colors`}>
                    {program}
                  </span>
                  {educationProgram === program && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grade Level Selection (only shows when program is selected) */}
      {educationSystem && educationProgram && (
        <div className="space-y-4 animate-slide-up">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Grade / Year Level
          </label>
          <div className="relative">
            <select
              value={gradeLevel}
              onChange={(e) => handleGradeSelect(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:border-white/30 focus:outline-none appearance-none cursor-pointer hover:border-white/20 transition-colors"
              required
            >
              <option value="" className="bg-black text-white/60">Select your grade level</option>
              {getGradeOptions().map((grade) => (
                <option key={grade} value={grade} className="bg-black text-white">
                  {grade}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {educationSystem && educationProgram && gradeLevel && (
        <div className="p-4 rounded-lg bg-white-500/10 border border-white-500/20 text-white-400 text-sm flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">Education Details Complete</div>
            <div className="text-xs mt-1 text-white-300">
              {educationSystem} - {educationProgram} - {gradeLevel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
