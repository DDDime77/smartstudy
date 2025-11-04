'use client';

import { useState } from 'react';
import Button from './Button';
import GlassCard from './GlassCard';
import OnboardingModal from './OnboardingModal';
import { AuthService } from '@/lib/api/auth';
import { OnboardingService } from '@/lib/api/onboarding';
import { OnboardingData } from '@/lib/api/onboarding';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
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
          alert('Welcome back! Dashboard coming soon...');
          onClose();
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
      // Success! Close everything
      alert('Setup complete! Dashboard coming soon...');
      setShowOnboarding(false);
      onClose();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard glow>
          <div className="relative">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 glow-text">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-white/60">
                {isSignUp
                  ? 'Start your journey to smarter studying'
                  : 'Continue optimizing your study schedule'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                    Full Name (Optional)
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-white/20"
                    />
                    <span className="text-white/60">Remember me</span>
                  </label>
                  <a href="#" className="text-white/80 hover:text-white transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-white/40 text-sm">OR</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* Social login */}
            <div className="space-y-3">
              <button
                type="button"
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg hover:bg-black/60 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg hover:bg-black/60 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            {/* Toggle sign up/sign in */}
            <div className="mt-6 text-center text-sm">
              <span className="text-white/60">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              {' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white hover:underline font-semibold"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
