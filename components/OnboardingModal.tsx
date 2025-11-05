'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 gap-0 bg-card border-border overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold">Welcome to StudySmart</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">
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
        <div className="px-8 py-6 border-t border-border flex items-center justify-between bg-card">
          <Button
            onClick={previousStep}
            disabled={currentStep === 1}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isLoading || !canProceed()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? 'Completing...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
