'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedText from '@/components/AnimatedText';
import Button from '@/components/Button';
import GlassCard from '@/components/GlassCard';
import GridBackground from '@/components/GridBackground';
import LoginModal from '@/components/LoginModal';
import MagicBento, { FeatureBentoCard } from '@/components/MagicBento';
import GradientText from '@/components/GradientText';
import Badge from '@/components/Badge';
import StepCard from '@/components/StepCard';
import { ApiClient } from '@/lib/api/client';

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const router = useRouter();

  // Auto-redirect to dashboard if user is already logged in
  // BUT skip redirect if returning from Google Classroom OAuth
  useEffect(() => {
    console.log('🔵 [Home Page] ====== Page loaded, checking auth state ======');
    const urlParams = new URLSearchParams(window.location.search);
    const isClassroomCallback = urlParams.get('classroom') === 'success';
    console.log('🔵 [Home Page] OAuth callback detected:', isClassroomCallback);

    if (isClassroomCallback) {
      console.log('✅ [Home Page] Classroom OAuth callback - opening login modal');
      setIsLoginOpen(true);
      return;
    }

    const token = ApiClient.getToken();
    console.log('🔵 [Home Page] User token exists:', !!token);
    if (token) {
      console.log('✅ [Home Page] User authenticated - redirecting to dashboard');
      router.push('/dashboard');
    } else {
      console.log('🔵 [Home Page] No token - staying on home page');
    }
  }, [router]);

  return (
    <main className="min-h-screen">
      <GridBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-effect border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-black text-xl">
              S
            </div>
            <span className="text-xl font-bold">StudySmart AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/80 hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/80 hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/80 hover:text-white transition-colors"
            >
              About
            </button>
          </div>

          <Button onClick={() => setIsLoginOpen(true)} size="sm">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-32 pb-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <AnimatedText
              text="Study Smarter,"
              className="block text-5xl md:text-7xl font-bold"
              variant="slide"
            />
            <GradientText gradient="from-blue-400 via-purple-400 to-pink-400">
              <AnimatedText
                text="Not Harder"
                className="block text-5xl md:text-7xl font-bold"
                variant="slide"
                delay={200}
              />
            </GradientText>
          </div>

          <AnimatedText
            text="AI-powered study planner that learns your habits, optimizes your schedule, and helps you achieve academic excellence"
            className="block text-xl md:text-2xl text-white/70 max-w-2xl mx-auto"
            variant="fade"
            delay={400}
          />

          <div className="flex flex-wrap gap-4 justify-center pt-8">
            <Button
              onClick={() => setIsLoginOpen(true)}
              size="lg"
              className="animate-slide-up"
              style={{ animationDelay: '600ms' }}
            >
              Start Learning Smarter
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="animate-slide-up"
              style={{ animationDelay: '700ms' }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 pt-16 max-w-2xl mx-auto">
            {[
              { number: '50%', label: 'Time Saved' },
              { number: '90%', label: 'On-Time Completion' },
              { number: '85%', label: 'Grade Improvement' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="animate-slide-up"
                style={{ animationDelay: `${800 + index * 100}ms` }}
              >
                <div className="text-3xl md:text-5xl font-bold glow-text">{stat.number}</div>
                <div className="text-white/60 text-sm md:text-base mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Intelligent Features</h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Powered by machine learning algorithms that adapt to your unique learning style
          </p>
        </div>

        <MagicBento>
          <FeatureBentoCard
            icon="🧠"
            title="Adaptive Learning"
            description="AI learns your pace and predicts task durations with increasing accuracy over time"
            size="large"
            gradient="from-blue-500/10 to-cyan-500/10"
            delay={0}
          />
          <FeatureBentoCard
            icon="📊"
            title="Smart Prioritization"
            description="Automatically prioritizes tasks based on deadlines, difficulty, and your past performance"
            size="medium"
            gradient="from-purple-500/10 to-pink-500/10"
            delay={100}
          />
          <FeatureBentoCard
            icon="⏰"
            title="Optimal Time Slots"
            description="Discovers when you're most productive and schedules study sessions accordingly"
            size="medium"
            gradient="from-orange-500/10 to-red-500/10"
            delay={200}
          />
          <FeatureBentoCard
            icon="📈"
            title="Progress Tracking"
            description="Visualize your improvement with detailed analytics and learning insights"
            size="medium"
            gradient="from-green-500/10 to-emerald-500/10"
            delay={300}
          />
          <FeatureBentoCard
            icon="🔄"
            title="Spaced Repetition"
            description="Science-backed revision schedules that optimize long-term memory retention"
            size="large"
            gradient="from-indigo-500/10 to-violet-500/10"
            delay={400}
          />
          <FeatureBentoCard
            icon="🎯"
            title="Goal Management"
            description="Set targets, track achievements, and stay motivated with personalized milestones"
            size="medium"
            gradient="from-rose-500/10 to-pink-500/10"
            delay={500}
          />
        </MagicBento>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Get started in minutes and watch the AI learn your habits
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <StepCard
            step="01"
            title="Set Up Your Profile"
            description="Choose your program (IB, A-Level, American), add subjects, and set your academic goals"
            delay={0}
          />
          <StepCard
            step="02"
            title="Input Your Tasks"
            description="Add assignments, deadlines, and exams. The AI provides initial time estimates"
            delay={150}
          />
          <StepCard
            step="03"
            title="Complete Study Sessions"
            description="Use our timer to track how long tasks actually take and rate your focus"
            delay={300}
          />
          <StepCard
            step="04"
            title="Watch AI Improve"
            description="After just 10 tasks, predictions become 50% more accurate and personalized to you"
            delay={450}
          />
        </div>
      </section>

      {/* Technical Section */}
      <section id="about" className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <GlassCard glow>
            <div className="text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">Built with Intelligence</h2>
              <p className="text-white/70 text-lg">
                StudySmart AI combines proven machine learning techniques with modern web technology
              </p>

              <div className="grid md:grid-cols-3 gap-6 pt-8">
                <div className="text-center p-4">
                  <Badge variant="gradient" className="mb-3">
                    Linear Regression
                  </Badge>
                  <p className="text-white/60 text-sm">
                    Predicts task durations based on your historical performance
                  </p>
                </div>
                <div className="text-center p-4">
                  <Badge variant="gradient" className="mb-3">
                    Bandit Algorithms
                  </Badge>
                  <p className="text-white/60 text-sm">
                    Discovers your optimal study times through exploration
                  </p>
                </div>
                <div className="text-center p-4">
                  <Badge variant="gradient" className="mb-3">
                    Heuristic Scoring
                  </Badge>
                  <p className="text-white/60 text-sm">
                    Balances urgency, difficulty, and importance intelligently
                  </p>
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <p className="text-white/80">
                  <span className="font-semibold">Privacy-First:</span> Your data stays local.
                  Models train on your device, never shared with third parties.
                </p>
                <p className="text-white/80">
                  <span className="font-semibold">Evidence-Based:</span> Using spaced repetition (SM-2),
                  epsilon-greedy exploration, and exponential moving averages.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold">
            Ready to Transform Your Study Habits?
          </h2>
          <p className="text-white/70 text-xl">
            Join thousands of students using AI to achieve their academic goals
          </p>
          <Button
            onClick={() => setIsLoginOpen(true)}
            size="lg"
            className="text-xl px-12 py-6"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-black">
                  S
                </div>
                <span className="font-bold">StudySmart AI</span>
              </div>
              <p className="text-white/60 text-sm">
                AI-powered study planning for the modern student
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li>
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li>
                  <button
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-white transition-colors"
                  >
                    About
                  </button>
                </li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/40 text-sm">
            <p>&copy; 2025 StudySmart AI. Built for RIT Dubai Engineering Competition.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </main>
  );
}
