'use client';

import { useState } from 'react';
import { OnboardingData, SubjectInput } from '@/lib/api/onboarding';
import TimezoneStep from './onboarding/TimezoneStep';
import EducationSystemStep from './onboarding/EducationSystemStep';
import ImportMethodStep from './onboarding/ImportMethodStep';
import SubjectsStep from './onboarding/SubjectsStep';
import AvailabilityStep from './onboarding/AvailabilityStep';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => Promise<void>;
}

export default function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    subjects: [],
    availability: [],
  });

  const totalSteps = 5;

  const updateData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate all required fields are present
      if (!onboardingData.timezone || !onboardingData.education_system ||
          !onboardingData.education_program || !onboardingData.import_method) {
        throw new Error('Please complete all steps');
      }

      await onComplete(onboardingData as OnboardingData);
      onClose();
    } catch (err: any) {
      setError(err.detail || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl my-8 rounded-3xl bg-black border border-white/10 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to StudySmart</h2>
              <p className="text-sm text-slate-400 mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <TimezoneStep
              value={onboardingData.timezone || ''}
              onChange={(timezone) => updateData({ timezone })}
            />
          )}

          {currentStep === 2 && (
            <EducationSystemStep
              educationSystem={onboardingData.education_system || ''}
              educationProgram={onboardingData.education_program || ''}
              onChange={(education_system, education_program) =>
                updateData({ education_system, education_program })
              }
            />
          )}

          {currentStep === 3 && (
            <ImportMethodStep
              value={onboardingData.import_method || ''}
              onChange={(import_method) => updateData({ import_method })}
            />
          )}

          {currentStep === 4 && (
            <SubjectsStep
              subjects={onboardingData.subjects || []}
              educationSystem={onboardingData.education_system || ''}
              educationProgram={onboardingData.education_program || ''}
              onChange={(subjects) => updateData({ subjects })}
            />
          )}

          {currentStep === 5 && (
            <AvailabilityStep
              value={onboardingData.availability || []}
              onChange={(availability) => updateData({ availability })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-sm sticky bottom-0 z-10 rounded-b-3xl">
          <button
            onClick={previousStep}
            disabled={currentStep === 1}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading || !canProceed()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Completing...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return !!onboardingData.timezone;
      case 2:
        return !!onboardingData.education_system && !!onboardingData.education_program;
      case 3:
        return !!onboardingData.import_method;
      case 4:
        return (onboardingData.subjects?.length || 0) > 0;
      case 5:
        return (onboardingData.availability?.length || 0) > 0;
      default:
        return false;
    }
  }
}
