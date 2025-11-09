'use client';

import { useState, useEffect, useRef } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Play, Pause, RotateCcw, Coffee, Brain, Target, TrendingUp, Calendar, Clock, Zap, BookOpen, Award, X } from 'lucide-react';
import { SubjectsService, SubjectResponse } from '@/lib/api/subjects';
import { SessionsService, StudySessionResponse, WeeklyStats } from '@/lib/api/sessions';
import { handleApiError } from '@/lib/api/client';

export default function StudyTimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState('pomodoro');
  const [sessionGoal, setSessionGoal] = useState(2);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // Countdown timer in seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Actual elapsed time
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [interruptions, setInterruptions] = useState(0);

  // Data from API
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySessionResponse[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);

  // Current task data
  const [currentTask, setCurrentTask] = useState<{
    subject: string;
    topic: string;
    difficulty: string;
    task: string;
    solution: string;
    answer: string;
  } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoadingNewTask, setIsLoadingNewTask] = useState(false);
  const [taskError, setTaskError] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0); // Timestamp when current session segment started
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const techniques = [
    {
      id: 'pomodoro',
      name: 'Pomodoro',
      description: '25 min focus, 5 min break',
      focusTime: 25,
      breakTime: 5,
      icon: '🍅',
      gradient: 'from-red-500/20 to-orange-500/10'
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      description: '90 min focus, 20 min break',
      focusTime: 90,
      breakTime: 20,
      icon: '🎯',
      gradient: 'from-purple-500/20 to-pink-500/10'
    },
    {
      id: 'timeboxing',
      name: 'Timeboxing',
      description: '45 min focus, 15 min break',
      focusTime: 45,
      breakTime: 15,
      icon: '📦',
      gradient: 'from-blue-500/20 to-cyan-500/10'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Set your own intervals',
      focusTime: 30,
      breakTime: 10,
      icon: '⚙️',
      gradient: 'from-green-500/20 to-emerald-500/10'
    },
  ];

  // Fetch data on mount
  useEffect(() => {
    fetchSubjects();
    fetchRecentSessions();
    fetchWeeklyStats();

    // Load current task from sessionStorage (client-side only)
    if (typeof window !== 'undefined') {
      const taskData = sessionStorage.getItem('currentTask');
      if (taskData) {
        try {
          const parsedTask = JSON.parse(taskData);
          setCurrentTask(parsedTask);
        } catch (e) {
          console.error('Failed to parse current task:', e);
        }
      }
    }
  }, []);

  const handleNextTask = async () => {
    if (!currentTask) return;

    setIsLoadingNewTask(true);
    setTaskError('');
    setShowSolution(false);
    setShowAnswer(false);

    try {
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: currentTask.subject,
          topic: currentTask.topic,
          difficulty: currentTask.difficulty,
          studySystem: 'IB', // Default to IB
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate new task');
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

                // Parse the three sections
                const taskMatch = cleanedText.match(/# TASK\s*([\s\S]*?)(?=# SOLUTION|$)/i);
                const solutionMatch = cleanedText.match(/# SOLUTION\s*([\s\S]*?)(?=# ANSWER|$)/i);
                const answerMatch = cleanedText.match(/# ANSWER\s*([\s\S]*?)$/i);

                const taskText = taskMatch ? taskMatch[1].trim() : '';
                const solutionText = solutionMatch ? solutionMatch[1].trim() : '';
                const answerText = answerMatch ? answerMatch[1].trim() : '';

                // Update current task with new data
                const newTask = {
                  subject: currentTask.subject,
                  topic: currentTask.topic,
                  difficulty: currentTask.difficulty,
                  task: taskText,
                  solution: solutionText,
                  answer: answerText,
                };

                setCurrentTask(newTask);

                // Update sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('currentTask', JSON.stringify(newTask));
                }

                setIsLoadingNewTask(false);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err: any) {
      setTaskError(err.message || 'Failed to generate new task');
      setIsLoadingNewTask(false);
    }
  };

  // Update time remaining when technique changes
  useEffect(() => {
    const technique = techniques.find(t => t.id === selectedTechnique);
    if (technique && !isRunning) {
      setTimeRemaining(technique.focusTime * 60);
    }
  }, [selectedTechnique]);

  // Timer countdown and elapsed time tracking
  useEffect(() => {
    if (isRunning) {
      sessionStartTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        // Update countdown
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });

        // Update elapsed time (actual time studied)
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Auto-save elapsed time every 10 seconds while running
  useEffect(() => {
    if (isRunning && currentSessionId) {
      saveTimeoutRef.current = setInterval(() => {
        saveElapsedTime(false);
      }, 10000); // Save every 10 seconds
    } else {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [isRunning, currentSessionId, elapsedSeconds]);

  // Handle page visibility changes (tab switch, minimize, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && currentSessionId) {
        // User switched tab or minimized - pause and save
        handlePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, currentSessionId, elapsedSeconds, interruptions]);

  // Handle page close/reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && currentSessionId) {
        // Save current session before page closes
        saveElapsedTime(true);

        // Show warning to user
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning, currentSessionId, elapsedSeconds, interruptions]);

  const fetchSubjects = async () => {
    try {
      const data = await SubjectsService.getAll();
      setSubjects(data);
      if (data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0].id);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load subjects');
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const data = await SessionsService.getRecent(3);
      setRecentSessions(data);

      // Calculate today's minutes
      const today = new Date().toISOString().split('T')[0];
      const todaySessionsMinutes = data
        .filter(s => s.start_time.split('T')[0] === today && s.duration_minutes)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      setTodayMinutes(todaySessionsMinutes);
    } catch (error) {
      handleApiError(error, 'Failed to load recent sessions');
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      const data = await SessionsService.getWeeklyStats();
      setWeeklyStats(data);
    } catch (error) {
      handleApiError(error, 'Failed to load weekly stats');
    }
  };

  const saveElapsedTime = async (isFinal: boolean = false) => {
    if (!currentSessionId) return;

    try {
      await SessionsService.update(currentSessionId, {
        elapsed_seconds: elapsedSeconds,
        interruptions_count: interruptions,
        ...(isFinal && { end_time: new Date().toISOString(), focus_rating: 3 })
      });
    } catch (error) {
      if (!isFinal) {
        console.error('Failed to save elapsed time:', error);
      }
    }
  };

  const handleStart = async () => {
    if (!selectedSubject) {
      alert('Please select a subject first');
      return;
    }

    try {
      if (currentSessionId) {
        // Resume existing session
        setIsRunning(true);
        sessionStartTimeRef.current = Date.now();
      } else {
        // Create new session
        const session = await SessionsService.create({
          subject_id: selectedSubject,
          start_time: new Date().toISOString(),
        });
        setCurrentSessionId(session.id);
        setElapsedSeconds(0);
        setInterruptions(0);
        setIsRunning(true);
        sessionStartTimeRef.current = Date.now();
      }
    } catch (error) {
      handleApiError(error, 'Failed to start session');
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    setInterruptions(prev => prev + 1);

    // Save current elapsed time
    await saveElapsedTime(false);
  };

  const handleReset = async () => {
    setIsRunning(false);

    // Save final state if session exists
    if (currentSessionId && elapsedSeconds > 0) {
      await saveElapsedTime(true);

      // Refresh data
      fetchRecentSessions();
      fetchWeeklyStats();
    }

    // Reset state
    const technique = techniques.find(t => t.id === selectedTechnique);
    if (technique) {
      setTimeRemaining(technique.focusTime * 60);
    }
    setElapsedSeconds(0);
    setInterruptions(0);
    setCurrentSessionId(null);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);

    if (currentSessionId) {
      try {
        // Save final session with actual elapsed time
        await SessionsService.update(currentSessionId, {
          end_time: new Date().toISOString(),
          elapsed_seconds: elapsedSeconds,
          interruptions_count: interruptions,
          focus_rating: 4, // Default good focus for completed sessions
        });

        setCompletedSessions(prev => prev + 1);

        // Reset for next session
        setCurrentSessionId(null);
        setElapsedSeconds(0);
        setInterruptions(0);

        // Refresh data
        fetchRecentSessions();
        fetchWeeklyStats();

        // Show completion message
        alert('Session completed! Great work! 🎉');

        // Reset timer for next session
        const nextTechnique = techniques.find(t => t.id === selectedTechnique);
        if (nextTechnique) {
          setTimeRemaining(nextTechnique.focusTime * 60);
        }
      } catch (error) {
        handleApiError(error, 'Failed to complete session');
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  const progress = timeRemaining === 0 ? 1 : 1 - (timeRemaining / (techniques.find(t => t.id === selectedTechnique)?.focusTime! * 60));
  const maxHours = Math.max(...weeklyStats.map(s => s.hours), 1);
  const totalWeekHours = weeklyStats.reduce((sum, stat) => sum + stat.hours, 0);

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <AnimatedText
            text="Study Timer"
            className="text-4xl md:text-5xl font-bold mb-2"
            variant="slide"
          />
          <p className="text-white/60 text-lg">
            Track your study sessions with focused time management
          </p>
        </div>

        {/* Main Timer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Timer Display */}
          <GlassCard className="lg:col-span-2">
            <div className="p-8 text-center">
              {/* Timer Circle */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 120}`}
                    strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <span className="text-6xl font-bold">{formatTime(timeRemaining)}</span>
                  </GradientText>
                  <p className="text-white/60 mt-2">Focus Time</p>
                  {elapsedSeconds > 0 && (
                    <p className="text-white/40 text-sm mt-1">
                      Studied: {formatTime(elapsedSeconds)}
                    </p>
                  )}
                </div>
              </div>

              {/* Subject Selector */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-3">Select Subject</label>
                <div className="flex flex-wrap justify-center gap-3">
                  {subjects.length === 0 ? (
                    <p className="text-white/40 text-sm">No subjects yet. Add subjects in onboarding.</p>
                  ) : (
                    subjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedSubject(subject.id)}
                        disabled={isRunning}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          selectedSubject === subject.id
                            ? 'bg-white/20 border-white/40 shadow-lg'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          borderLeftWidth: '3px',
                          borderLeftColor: subject.color || '#3b82f6'
                        }}
                      >
                        <span className="text-white">{subject.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  variant={isRunning ? "ghost" : "primary"}
                  size="lg"
                  onClick={isRunning ? handlePause : handleStart}
                  className="min-w-[140px]"
                  disabled={!selectedSubject}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      {currentSessionId ? 'Resume' : 'Start'}
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="lg" onClick={handleReset}>
                  <RotateCcw className="w-5 h-5 mr-2" />
                  {currentSessionId && elapsedSeconds > 0 ? 'Finish' : 'Reset'}
                </Button>
              </div>

              {/* Interruptions indicator */}
              {interruptions > 0 && (
                <div className="mt-4 text-white/60 text-sm">
                  Interruptions: {interruptions}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Session Settings */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Session Settings</h3>
              </div>

              {/* Session Goal */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-3">Session Goal</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSessionGoal(Math.max(1, sessionGoal - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <span className="text-white">-</span>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{sessionGoal}</span>
                    <span className="text-white/60 ml-2">sessions</span>
                  </div>
                  <button
                    onClick={() => setSessionGoal(sessionGoal + 1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <span className="text-white">+</span>
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Progress</span>
                  <span className="text-white">{completedSessions} / {sessionGoal}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
                    style={{ width: `${(completedSessions / sessionGoal) * 100}%` }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-white/80 text-sm">Today</span>
                  </div>
                  <span className="text-white font-bold">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/80 text-sm">Current</span>
                  </div>
                  <span className="text-white font-bold">{formatTime(elapsedSeconds)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-white/80 text-sm">Completed</span>
                  </div>
                  <span className="text-white font-bold">{completedSessions}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Study Techniques */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-4">Study Techniques</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {techniques.map((technique) => (
              <div
                key={technique.id}
                onClick={() => !isRunning && setSelectedTechnique(technique.id)}
                className={`cursor-pointer ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
              <GlassCard
                hover={!isRunning}
                glow={selectedTechnique === technique.id}
              >
                <div className={`bg-gradient-to-br ${technique.gradient} rounded-lg p-6`}>
                  <div className="text-4xl mb-3">{technique.icon}</div>
                  <h4 className="text-lg font-bold text-white mb-1">{technique.name}</h4>
                  <p className="text-white/60 text-sm mb-3">{technique.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="default">
                      {technique.focusTime} min focus
                    </Badge>
                    <Badge variant="gradient">
                      {technique.breakTime} min break
                    </Badge>
                  </div>
                </div>
              </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions & Weekly Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Recent Sessions</h3>
                </div>
              </div>

              <div className="space-y-3">
                {recentSessions.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">No study sessions yet. Start your first session!</p>
                ) : (
                  recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{session.subject_name || 'Unknown Subject'}</h4>
                        <Badge variant="gradient">{session.duration_minutes || 0} min</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">{formatDate(session.start_time)}</span>
                        <div className="flex items-center gap-2">
                          {session.interruptions_count > 0 && (
                            <span className="text-white/40 text-xs">
                              {session.interruptions_count} interruptions
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={star <= (session.focus_rating || 0) ? 'text-yellow-400' : 'text-white/20'}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlassCard>

          {/* Weekly Activity */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Weekly Activity</h3>
                </div>
                <Badge variant="glow">{totalWeekHours.toFixed(1)}h total</Badge>
              </div>

              <div className="flex items-end justify-between h-40 mb-4">
                {weeklyStats.map((stat) => (
                  <div key={stat.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[40px] bg-white/5 rounded-lg relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-400 to-purple-400 rounded-lg transition-all"
                        style={{
                          height: `${(stat.hours / maxHours) * 100}%`,
                          minHeight: stat.hours > 0 ? '4px' : '0'
                        }}
                      />
                      <div className="h-40 w-full" />
                    </div>
                    <span className="text-white/60 text-xs">{stat.day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Daily Avg</p>
                  <p className="text-white font-bold">{(totalWeekHours / 7).toFixed(1)}h</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Best Day</p>
                  <p className="text-white font-bold">
                    {weeklyStats.reduce((max, stat) => stat.hours > max.hours ? stat : max, weeklyStats[0] || { day: '-', hours: 0 }).day}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Sessions</p>
                  <p className="text-white font-bold">{recentSessions.length}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Current Task Section */}
        {currentTask && (
          <GlassCard className="mt-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Practice Task</h3>
                    <p className="text-white/60 text-sm">
                      {currentTask.subject} - {currentTask.topic} ({currentTask.difficulty})
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Display */}
              <div className="bg-black/20 rounded-lg p-6 border border-white/10 mb-4">
                <MarkdownRenderer content={currentTask.task} />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Button
                  variant={showSolution ? "secondary" : "ghost"}
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex-1 min-w-[150px]"
                >
                  {showSolution ? 'Hide Solution' : 'Show Solution'}
                </Button>
                <Button
                  variant={showAnswer ? "secondary" : "ghost"}
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="flex-1 min-w-[150px]"
                >
                  {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNextTask}
                  disabled={isLoadingNewTask}
                  className="flex-1 min-w-[150px]"
                >
                  {isLoadingNewTask ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Next Task'
                  )}
                </Button>
              </div>

              {/* Error Display */}
              {taskError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {taskError}
                </div>
              )}

              {/* Solution Display */}
              {showSolution && (
                <div className="bg-black/20 rounded-lg p-6 border border-white/10 mb-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    Solution
                  </h4>
                  <MarkdownRenderer content={currentTask.solution} />
                </div>
              )}

              {/* Answer Display */}
              {showAnswer && (
                <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Answer
                  </h4>
                  <MarkdownRenderer content={currentTask.answer} />
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Motivational Quote */}
        <GlassCard className="mt-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <div className="p-6 text-center">
            <Award className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <GradientText gradient="from-purple-400 to-pink-400">
              <p className="text-xl font-bold mb-2">"Success is the sum of small efforts repeated day in and day out."</p>
            </GradientText>
            <p className="text-white/60">— Robert Collier</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
