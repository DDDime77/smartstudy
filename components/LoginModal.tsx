'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OnboardingModal from './OnboardingModal';
import TermsModal from '@/components/ui/terms-modal';
import NotificationToast from '@/components/ui/notification-toast';
import { AuthService } from '@/lib/api/auth';
import { OnboardingService } from '@/lib/api/onboarding';
import { OnboardingData } from '@/lib/api/onboarding';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');
  const [showToast, setShowToast] = useState(false);

  // Detect Google Classroom OAuth callback and show onboarding
  useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const isClassroomCallback = urlParams.get('classroom') === 'success';

      if (isClassroomCallback) {
        setShowOnboarding(true);
      }
    }
  }, [isOpen]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
    setAgreedToTerms(false);
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Register new user
        await AuthService.register({
          email,
          password,
          full_name: fullName || undefined,
        });

        // Auto-login after registration
        await AuthService.login({ email, password });

        // Show onboarding for new users
        setShowOnboarding(true);
      } else {
        // Login existing user
        await AuthService.login({ email, password });

        // Check if user needs onboarding
        try {
          const profile = await OnboardingService.getProfile();
          // User has completed onboarding, redirect to dashboard
          onClose();
          router.push('/dashboard');
        } catch {
          // User needs to complete onboarding
          setShowOnboarding(true);
        }
      }

      resetForm();
    } catch (err: any) {
      if (err.status === 400) {
        setError(isSignUp ? 'Email already registered' : 'Invalid email or password');
      } else {
        setError(err.detail || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      await OnboardingService.completeOnboarding(data);
      // Success! Redirect to dashboard
      setShowOnboarding(false);
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.detail || 'Failed to complete onboarding');
    }
  };

  if (!isOpen && !showOnboarding) return null;

  if (showOnboarding) {
    return (
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          onClose();
        }}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isSignUp
              ? 'Sign up to start planning your studies'
              : 'Sign in to continue to your dashboard'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="bg-input border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="bg-input border-border"
            />
          </div>

          {/* User Agreement Checkbox - Only show for sign up */}
          {isSignUp && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  required
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary underline hover:text-primary/80"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-primary underline hover:text-primary/80"
                  >
                    Privacy Policy
                  </button>
                  , including the processing of my data to enhance my personalized learning experience.
                </label>
              </div>
              {!agreedToTerms && isSignUp && (
                <p className="text-xs text-destructive">
                  You must accept the terms to create an account
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || (isSignUp && !agreedToTerms)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setAgreedToTerms(false); // Reset checkbox when switching modes
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <span className="text-foreground font-medium">Sign In</span>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <span className="text-foreground font-medium">Sign Up</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Terms Modal */}
    <TermsModal
      isOpen={showTermsModal}
      onClose={() => setShowTermsModal(false)}
      type="terms"
    />

    {/* Privacy Modal */}
    <TermsModal
      isOpen={showPrivacyModal}
      onClose={() => setShowPrivacyModal(false)}
      type="privacy"
    />

    {/* Notification Toast */}
    <NotificationToast
      message={toastMessage}
      type={toastType}
      isOpen={showToast}
      onClose={() => setShowToast(false)}
    />
    </>
  );
}
