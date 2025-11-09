'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import Button from './Button';
import GlassCard from './GlassCard';
import MarkdownRenderer from './MarkdownRenderer';

interface TaskGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (subject: string, generatedTasks?: string) => void;
  studySystem?: string;
}

type Step = 'subject' | 'ask-generate' | 'task-details' | 'generating' | 'preview';

export default function TaskGenerationModal({
  isOpen,
  onClose,
  onComplete,
  studySystem = 'IB'
}: TaskGenerationModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('subject');
  const [subject, setSubject] = useState('');
  const [wantsGeneration, setWantsGeneration] = useState<boolean | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Common subjects based on study system
  const commonSubjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'Economics', 'History',
    'English Literature', 'Psychology', 'Geography'
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Easy', emoji: '🌱', description: 'Foundation concepts and basic practice' },
    { value: 'medium', label: 'Medium', emoji: '🎯', description: 'Standard difficulty with some challenges' },
    { value: 'hard', label: 'Hard', emoji: '🔥', description: 'Advanced problems and complex scenarios' },
    { value: 'expert', label: 'Expert', emoji: '⚡', description: 'Competition-level and exceptional difficulty' },
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentStep('subject');
      setSubject('');
      setWantsGeneration(null);
      setTopic('');
      setDifficulty('');
      setGeneratedTasks('');
      setIsGenerating(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubjectSubmit = () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    setError('');
    setCurrentStep('ask-generate');
  };

  const handleGenerationChoice = (choice: boolean) => {
    setWantsGeneration(choice);
    if (choice) {
      setCurrentStep('task-details');
    } else {
      // User doesn't want to generate tasks, proceed directly to study timer
      onComplete(subject);
      onClose();
    }
  };

  const handleGenerateTasks = async () => {
    if (!topic.trim() || !difficulty) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setCurrentStep('generating');
    setIsGenerating(true);
    setGeneratedTasks('');

    try {
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          studySystem,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tasks');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) {
                accumulatedText += data.delta;
                setGeneratedTasks(accumulatedText);
              }
              if (data.done) {
                // Clean up markdown code fences if present
                let cleanedText = accumulatedText.trim();
                if (cleanedText.startsWith('```markdown')) {
                  cleanedText = cleanedText.replace(/^```markdown\s*\n/, '');
                }
                if (cleanedText.startsWith('```')) {
                  cleanedText = cleanedText.replace(/^```\s*\n/, '');
                }
                if (cleanedText.endsWith('```')) {
                  cleanedText = cleanedText.replace(/\n```\s*$/, '');
                }
                setGeneratedTasks(cleanedText);
                setIsGenerating(false);
                setCurrentStep('preview');
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate tasks');
      setIsGenerating(false);
      setCurrentStep('task-details');
    }
  };

  const handleAcceptTasks = () => {
    onComplete(subject, generatedTasks);
    onClose();
  };

  const handleRegenerate = () => {
    setCurrentStep('task-details');
    setGeneratedTasks('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <GlassCard className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <div className="p-6">
            {/* Step 1: Subject Selection */}
            {currentStep === 'subject' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">📚</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Select Subject</h3>
                  <p className="text-white/60">What would you like to study?</p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-white/80">Choose a subject</label>

                  {/* Quick selection buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {commonSubjects.map((subj) => (
                      <button
                        key={subj}
                        onClick={() => setSubject(subj)}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          subject === subj
                            ? 'border-white/30 bg-white/10 text-white'
                            : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubjectSubmit()}
                      placeholder="Or type a custom subject..."
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSubjectSubmit} disabled={!subject.trim()}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Ask if user wants to generate tasks */}
            {currentStep === 'ask-generate' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">✨</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Generate Practice Tasks?</h3>
                  <p className="text-white/60">Would you like AI to generate personalized practice tasks for {subject}?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGenerationChoice(true)}
                    className="p-6 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                  >
                    <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">🤖</div>
                    <div className="text-white font-semibold mb-2">Yes, Generate Tasks</div>
                    <div className="text-white/60 text-sm">Get AI-powered practice questions</div>
                  </button>

                  <button
                    onClick={() => handleGenerationChoice(false)}
                    className="p-6 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all group"
                  >
                    <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">⏭️</div>
                    <div className="text-white font-semibold mb-2">No, Skip</div>
                    <div className="text-white/60 text-sm">Go directly to study timer</div>
                  </button>
                </div>

                <div className="flex justify-start">
                  <Button variant="secondary" onClick={() => setCurrentStep('subject')}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Task Details (Topic & Difficulty) */}
            {currentStep === 'task-details' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Task Details</h3>
                  <p className="text-white/60">Specify the topic and difficulty level</p>
                </div>

                <div className="space-y-4">
                  {/* Topic Input */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Topic <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Quadratic Equations, Thermodynamics, World War II..."
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  {/* Difficulty Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Difficulty Level <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {difficultyLevels.map((level) => (
                        <button
                          key={level.value}
                          onClick={() => setDifficulty(level.value)}
                          className={`p-4 rounded-lg border transition-all text-left ${
                            difficulty === level.value
                              ? 'border-white/30 bg-white/10'
                              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{level.emoji}</span>
                            <span className="font-semibold text-white">{level.label}</span>
                          </div>
                          <div className="text-xs text-white/60">{level.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Study System Info */}
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-sm text-white/80">
                      📖 Tasks will be generated for <span className="font-semibold text-white">{studySystem}</span> curriculum
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="secondary" onClick={() => setCurrentStep('ask-generate')}>
                    Back
                  </Button>
                  <Button onClick={handleGenerateTasks} disabled={!topic.trim() || !difficulty}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Tasks
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Generating (Loading with streaming preview) */}
            {currentStep === 'generating' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-5xl animate-bounce">🤖</div>
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Generating Tasks...</h3>
                  <p className="text-white/60">AI is creating personalized practice tasks for you</p>
                </div>

                <div className="max-h-96 overflow-y-auto border border-white/10 rounded-lg p-4 bg-black/20">
                  {generatedTasks ? (
                    <MarkdownRenderer content={generatedTasks} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-white/40 mb-2">Waiting for response...</p>
                      <p className="text-white/30 text-xs">This may take a few seconds</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Preview Generated Tasks */}
            {currentStep === 'preview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="text-xl font-bold text-white mb-1">Tasks Generated!</h3>
                  <p className="text-white/60 text-sm">Review your personalized practice tasks</p>
                </div>

                <div className="max-h-96 overflow-y-auto border border-white/10 rounded-lg p-4 bg-black/20">
                  <MarkdownRenderer content={generatedTasks} />
                </div>

                <div className="flex justify-between gap-3">
                  <Button variant="secondary" onClick={handleRegenerate}>
                    Regenerate
                  </Button>
                  <Button onClick={handleAcceptTasks}>
                    Accept & Continue
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
