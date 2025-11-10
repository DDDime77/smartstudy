'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OnboardingData, SubjectInput } from '@/lib/api/onboarding';
import TimezoneStep from './onboarding/TimezoneStep';
import EducationSystemStep from './onboarding/EducationSystemStep';
import ImportMethodStep from './onboarding/ImportMethodStep';
import SubjectsStep from './onboarding/SubjectsStep';
import AvailabilityStep from './onboarding/AvailabilityStep';
import GoogleClassroomImportStep from './onboarding/GoogleClassroomImportStep';

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

  // Restore onboarding state when returning from Google OAuth
  useEffect(() => {
    if (isOpen) {
      console.log('🟠 [Onboarding Modal] ====== Modal opened, checking for OAuth callback ======');
      const urlParams = new URLSearchParams(window.location.search);
      const isClassroomCallback = urlParams.get('classroom') === 'success';
      console.log('🟠 [Onboarding Modal] Is OAuth callback:', isClassroomCallback);

      if (isClassroomCallback) {
        console.log('🟠 [Onboarding Modal] OAuth callback detected, checking localStorage...');
        const savedState = localStorage.getItem('onboarding_state');
        console.log('🟠 [Onboarding Modal] Saved state exists:', !!savedState);

        if (savedState) {
          const parsed = JSON.parse(savedState);
          console.log('✅ [Onboarding Modal] Restoring saved state:', parsed);
          setOnboardingData(parsed);
          console.log('✅ [Onboarding Modal] Resuming at Step 4 (Subjects)');
          setCurrentStep(4); // Resume at Step 4 (Subjects)
          console.log('🟠 [Onboarding Modal] Cleaning up localStorage...');
          localStorage.removeItem('onboarding_state'); // Clean up
          console.log('🎉 [Onboarding Modal] State restoration complete');
        } else {
          console.log('⚠️ [Onboarding Modal] No saved state found in localStorage');
        }
      } else {
        console.log('🟠 [Onboarding Modal] Normal modal open (not OAuth callback)');
      }
    }
  }, [isOpen]);

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
        return !!onboardingData.education_system && !!onboardingData.education_program && !!onboardingData.grade_level;
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
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-heading font-bold">Welcome to StudySmart</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Step {currentStep} of {totalSteps} - Complete your profile to get started
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

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
              gradeLevel={onboardingData.grade_level || ''}
              onChange={(education_system, education_program, grade_level) =>
                updateData({ education_system, education_program, grade_level })
              }
            />
          )}

          {currentStep === 3 && (
            <ImportMethodStep
              value={onboardingData.import_method || ''}
              onChange={(import_method) => updateData({ import_method })}
            />
          )}

          {currentStep === 4 && onboardingData.import_method === 'google_classroom' && (
            <GoogleClassroomImportStep
              educationSystem={onboardingData.education_system || ''}
              onboardingState={onboardingData}
              onImportComplete={(subjects) => {
                updateData({ subjects });
                nextStep();
              }}
            />
          )}

          {currentStep === 4 && onboardingData.import_method === 'manual' && (
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
        {!(currentStep === 4 && onboardingData.import_method === 'google_classroom') && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
