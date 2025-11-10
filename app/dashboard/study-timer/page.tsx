'use client';

import { useState, useEffect, useRef } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Play, Pause, RotateCcw, Coffee, Brain, Target, TrendingUp, Calendar, Clock, Zap, BookOpen, Award, X, Check, ChevronDown, History, MessageCircle, Send } from 'lucide-react';
import { SubjectsService, SubjectResponse } from '@/lib/api/subjects';
import { SessionsService, StudySessionResponse, WeeklyStats } from '@/lib/api/sessions';
import { PracticeTasksService, PracticeTask } from '@/lib/api/practice-tasks';
import { OnboardingService } from '@/lib/api/onboarding';
import { handleApiError } from '@/lib/api/client';

export default function StudyTimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState('pomodoro');
  const [sessionGoal, setSessionGoal] = useState(60); // Goal in minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // Countdown timer in seconds
  const [initialTimeRemaining, setInitialTimeRemaining] = useState(25 * 60); // Store initial duration for progress calculation
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Actual elapsed time
  const elapsedSecondsRef = useRef(0); // Ref to always have current value for auto-save
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const interruptionsRef = useRef(0); // Ref for interruptions

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
    estimatedTime?: number;
    predicted_correct?: number;
    predicted_time_seconds?: number;
    lnirt_model_version?: string;
  } | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskLoadedAt, setTaskLoadedAt] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Inline topic/difficulty form state
  const [inlineTopic, setInlineTopic] = useState('');
  const [inlineDifficulty, setInlineDifficulty] = useState('medium');
  const [inlineGrade, setInlineGrade] = useState('9');

  // Assignment session tracking
  const [assignmentSession, setAssignmentSession] = useState<any>(null);
  const [assignmentTasksCompleted, setAssignmentTasksCompleted] = useState(0);
  const hasAssignmentSessionRef = useRef(false);

  // Next task difficulty selector
  const [nextTaskDifficulty, setNextTaskDifficulty] = useState('medium');
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  // Task history panel
  const [taskHistory, setTaskHistory] = useState<PracticeTask[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Streaming state
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [answerText, setAnswerText] = useState('');

  // AI Chat Modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  // Store chat history per task ID
  const [taskChatHistory, setTaskChatHistory] = useState<Record<string, { role: 'user' | 'assistant'; content: string }[]>>({});

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

  // Keep refs synced with state for auto-save (avoids stale closures)
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    interruptionsRef.current = interruptions;
  }, [interruptions]);

  // Fetch data on mount
  useEffect(() => {
    // Load user grade and subjects first, THEN check for active session from server
    const initializeData = async () => {
      // Fetch user grade first so it's available for task generation
      await fetchUserGrade();
      await fetchSubjects();
      await fetchRecentSessions();
      await fetchWeeklyStats();

      // Fetch active session from server instead of sessionStorage
      try {
        const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
        const activeSession = await ActiveSessionsService.get();

        if (activeSession) {
          hasAssignmentSessionRef.current = true;

          // Map server session to local state
          setAssignmentSession({
            assignmentId: activeSession.assignment_id,
            subject: activeSession.subject_name,
            subjectId: activeSession.subject_id,
            topic: activeSession.topic,
            difficulty: activeSession.difficulty,
            estimatedMinutes: activeSession.estimated_minutes || activeSession.initial_duration_seconds / 60,
            requiredTasks: activeSession.required_tasks,
            currentTasks: activeSession.tasks_completed,
            timeSpent: activeSession.time_spent_minutes,
          });

          setAssignmentTasksCompleted(activeSession.tasks_completed);
          setSelectedSubject(activeSession.subject_id || '');
          setInlineTopic(activeSession.topic || '');
          setInlineDifficulty(activeSession.difficulty || 'medium');

          // Set timer, elapsed time, and session goal based on active session
          const totalSeconds = activeSession.initial_duration_seconds;
          const alreadySpentSeconds = activeSession.time_spent_minutes * 60;
          const remainingSeconds = Math.max(0, totalSeconds - alreadySpentSeconds);

          setSessionGoal(activeSession.estimated_minutes || Math.floor(totalSeconds / 60));
          setTimeRemaining(remainingSeconds);
          setInitialTimeRemaining(totalSeconds);
          setElapsedSeconds(alreadySpentSeconds);

          // Restore current task if it exists
          if (activeSession.current_task) {
            setCurrentTask(activeSession.current_task);
          }

          // Auto-generate first task if no current task and we have topic
          if (!activeSession.current_task && activeSession.subject_name && activeSession.topic) {
            // Use a small delay to ensure inlineGrade state has updated
            setTimeout(() => {
              startTaskGeneration({
                subject: activeSession.subject_name,
                topic: activeSession.topic,
                difficulty: activeSession.difficulty,
                studySystem: activeSession.study_system || 'IB',
                grade: inlineGrade || '9',
              });
            }, 100);
          }

          // Check if there are pending task params
          if (activeSession.pending_task_params) {
            startTaskGeneration(activeSession.pending_task_params);
          }
        }
      } catch (error) {
        console.error('Failed to fetch active session:', error);
      }
    };

    // Call the async initialization function
    initializeData();
  }, []);

  // Load chat history when modal opens or task changes
  useEffect(() => {
    if (showChatModal && currentTaskId) {
      const savedMessages = taskChatHistory[currentTaskId] || [];
      setChatMessages(savedMessages);
    }
  }, [showChatModal, currentTaskId, taskChatHistory]);

  // Save chat history when messages change
  useEffect(() => {
    if (currentTaskId && chatMessages.length > 0) {
      setTaskChatHistory(prev => ({
        ...prev,
        [currentTaskId]: chatMessages
      }));
    }
  }, [chatMessages, currentTaskId]);

  const startTaskGeneration = async (params: { subject: string, topic: string, difficulty: string, studySystem: string, grade?: string }) => {
    setIsGenerating(true);
    setTaskError('');
    setTaskText('');
    setSolutionText('');
    setAnswerText('');
    setShowSolution(false);
    setShowAnswer(false);

    try {
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error('Failed to generate task');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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

                // Parse and update all sections in real-time
                const timeMatch = accumulatedText.match(/# TIME_ESTIMATE\s*([\s\S]*?)(?=# TASK|$)/i);
                const taskMatch = accumulatedText.match(/# TASK\s*([\s\S]*?)(?=# SOLUTION|$)/i);
                const solutionMatch = accumulatedText.match(/# SOLUTION\s*([\s\S]*?)(?=# ANSWER|$)/i);
                const answerMatch = accumulatedText.match(/# ANSWER\s*([\s\S]*?)$/i);

                if (taskMatch) setTaskText(taskMatch[1].trim());
                if (solutionMatch) setSolutionText(solutionMatch[1].trim());
                if (answerMatch) setAnswerText(answerMatch[1].trim());
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

                // Parse final sections
                const timeMatch = cleanedText.match(/# TIME_ESTIMATE\s*([\s\S]*?)(?=# TASK|$)/i);
                const taskMatch = cleanedText.match(/# TASK\s*([\s\S]*?)(?=# SOLUTION|$)/i);
                const solutionMatch = cleanedText.match(/# SOLUTION\s*([\s\S]*?)(?=# ANSWER|$)/i);
                const answerMatch = cleanedText.match(/# ANSWER\s*([\s\S]*?)$/i);

                const estimatedTime = timeMatch ? parseInt(timeMatch[1].trim()) : undefined;
                const finalTask = taskMatch ? taskMatch[1].trim() : '';
                const finalSolution = solutionMatch ? solutionMatch[1].trim() : '';
                const finalAnswer = answerMatch ? answerMatch[1].trim() : '';

                // Create and store task
                const newTask = {
                  subject: params.subject,
                  topic: params.topic,
                  difficulty: params.difficulty,
                  estimatedTime,
                  task: finalTask,
                  solution: finalSolution,
                  answer: finalAnswer,
                };

                setCurrentTask(newTask);
                setIsGenerating(false);

                // Save current task to active session on server (only if in assignment mode)
                if (hasAssignmentSessionRef.current) {
                  try {
                    const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
                    await ActiveSessionsService.update({
                      current_task: newTask,
                    });
                  } catch (err) {
                    console.error('Failed to save task to active session:', err);
                  }
                }

                // Clear streaming states
                setTaskText('');
                setSolutionText('');
                setAnswerText('');

                // Save task to database
                try {
                  const savedTask = await PracticeTasksService.create({
                    subject: params.subject,
                    topic: params.topic,
                    difficulty: params.difficulty,
                    task_content: finalTask,
                    solution_content: finalSolution,
                    answer_content: finalAnswer,
                    estimated_time_minutes: estimatedTime,
                    study_session_id: currentSessionId || undefined,
                  });
                  setCurrentTaskId(savedTask.id);
                  setTaskLoadedAt(Date.now());
                  setNextTaskDifficulty(params.difficulty);

                  // Update currentTask with LNIRT predictions from API response
                  if (savedTask.predicted_correct !== undefined || savedTask.predicted_time_seconds !== undefined) {
                    setCurrentTask(prev => prev ? {
                      ...prev,
                      predicted_correct: savedTask.predicted_correct,
                      predicted_time_seconds: savedTask.predicted_time_seconds,
                      lnirt_model_version: savedTask.lnirt_model_version
                    } : prev);
                  }

                  // Refresh task history
                  await fetchTaskHistory(params.subject);
                } catch (err) {
                  console.error('Failed to save task to database:', err);
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err: any) {
      setTaskError(err.message || 'Failed to generate task');
      setIsGenerating(false);
    }
  };

  const fetchTaskHistory = async (subject: string) => {
    try {
      const history = await PracticeTasksService.getAll({ subject, limit: 10 });
      setTaskHistory(history);
    } catch (error) {
      console.error('Failed to fetch task history:', error);
    }
  };

  const loadLatestTaskForSubject = async (subjectName: string) => {
    try {
      const latestTask = await PracticeTasksService.getLatestForSubject(subjectName);
      if (latestTask) {
        // Load the task
        setCurrentTask({
          subject: latestTask.subject,
          topic: latestTask.topic,
          difficulty: latestTask.difficulty,
          task: latestTask.task_content,
          solution: latestTask.solution_content,
          answer: latestTask.answer_content,
        });
        setCurrentTaskId(latestTask.id);
        setTaskLoadedAt(Date.now());
        setNextTaskDifficulty(latestTask.difficulty);
        setShowSolution(false);
        setShowAnswer(false);

        // Fetch history for this subject
        await fetchTaskHistory(subjectName);
      }
    } catch (error) {
      // No task found, which is fine - user can generate one
      console.log('No latest task found for subject:', subjectName);
    }
  };

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId);

    // Find the subject name
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      // Load latest task for this subject
      await loadLatestTaskForSubject(subject.name);
    }
  };

  const handleGenerateInlineTask = () => {
    if (!inlineTopic.trim()) {
      alert('Please enter a topic');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) return;

    startTaskGeneration({
      subject: subject.name,
      topic: inlineTopic,
      difficulty: inlineDifficulty,
      studySystem: 'IB',
      grade: inlineGrade,
    });
  };

  const handleNextTask = () => {
    if (!currentTask) return;

    // Use the selected difficulty from the dropdown
    startTaskGeneration({
      subject: currentTask.subject,
      topic: currentTask.topic,
      difficulty: nextTaskDifficulty,
      studySystem: 'IB',
      grade: inlineGrade,
    });
  };

  const handleMarkCorrectIncorrect = async (isCorrect: boolean) => {
    if (!currentTaskId || !taskLoadedAt) return;

    const actualTimeSeconds = Math.floor((Date.now() - taskLoadedAt) / 1000);

    try {
      await PracticeTasksService.update(currentTaskId, {
        is_correct: isCorrect,
        completed: true,
        actual_time_seconds: actualTimeSeconds,
      });

      // Update assignment progress if this is an assignment session
      if (assignmentSession) {
        const newTasksCompleted = assignmentTasksCompleted + 1;
        setAssignmentTasksCompleted(newTasksCompleted);

        // Calculate time spent (elapsed seconds from timer / 60)
        const timeSpentMinutes = Math.floor(elapsedSeconds / 60);

        // Update assignment via API
        try {
          const { AssignmentsService } = await import('@/lib/api/assignments');
          await AssignmentsService.updateProgress(
            assignmentSession.assignmentId,
            newTasksCompleted,
            timeSpentMinutes
          );

          // Update active session on server
          const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
          await ActiveSessionsService.update({
            tasks_completed: newTasksCompleted,
            time_spent_minutes: timeSpentMinutes,
          });

          // Check if assignment is complete
          if (
            newTasksCompleted >= assignmentSession.requiredTasks &&
            timeSpentMinutes >= assignmentSession.estimatedMinutes
          ) {
            alert('🎉 Assignment completed! Great work!');
            // Delete active session from server
            await ActiveSessionsService.delete();
            setAssignmentSession(null);
          } else {
            // Update local state
            const updatedSession = {
              ...assignmentSession,
              currentTasks: newTasksCompleted,
              timeSpent: timeSpentMinutes
            };
            setAssignmentSession(updatedSession);
          }
        } catch (error) {
          console.error('Failed to update assignment progress:', error);
        }
      }

      // Load next task with same topic and selected difficulty
      if (currentTask) {
        startTaskGeneration({
          subject: currentTask.subject,
          topic: currentTask.topic,
          difficulty: nextTaskDifficulty,
          studySystem: 'IB',
          grade: inlineGrade,
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to mark task');
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !currentTask) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch('/api/chat-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          task: currentTask.task,
          solution: currentTask.solution,
          answer: currentTask.answer,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullMessage += chunk;
          setStreamingMessage(fullMessage);
        }

        // Add complete message to chat history
        setChatMessages(prev => [...prev, { role: 'assistant', content: fullMessage }]);
        setStreamingMessage('');
      }
    } catch (error) {
      handleApiError(error, 'Failed to get AI response');
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
      setStreamingMessage('');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleLoadHistoryTask = (task: PracticeTask) => {
    setCurrentTask({
      subject: task.subject,
      topic: task.topic,
      difficulty: task.difficulty,
      task: task.task_content,
      solution: task.solution_content,
      answer: task.answer_content,
      estimatedTime: task.estimated_time_minutes || undefined,
    });
    setCurrentTaskId(task.id);
    setTaskLoadedAt(Date.now());
    setNextTaskDifficulty(task.difficulty);
    setShowSolution(false);
    setShowAnswer(false);
  };

  const handleResetSession = async () => {
    // End current study session
    if (currentSessionId && elapsedSeconds > 0) {
      try {
        await SessionsService.update(currentSessionId, {
          end_time: new Date().toISOString(),
        });

        // Update assignment time if this is an assignment session
        if (assignmentSession) {
          await saveAssignmentTime();
        }
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    // Reset timer
    setIsRunning(false);
    const technique = techniques.find(t => t.id === selectedTechnique);
    if (technique) {
      const timerSeconds = technique.focusTime * 60;
      setTimeRemaining(timerSeconds);
      setInitialTimeRemaining(timerSeconds);
    }
    setElapsedSeconds(0);
    setInterruptions(0);
    setCurrentSessionId(null);

    // Clear current task
    setCurrentTask(null);
    setCurrentTaskId(null);
    setTaskLoadedAt(null);
    setShowSolution(false);
    setShowAnswer(false);

    // Refresh data
    fetchRecentSessions();
    fetchWeeklyStats();
  };

  // Update time remaining when technique changes
  useEffect(() => {
    // Don't override timer if we're in an assignment session (check ref for immediate sync)
    if (hasAssignmentSessionRef.current) {
      return;
    }
    const technique = techniques.find(t => t.id === selectedTechnique);
    if (technique && !isRunning) {
      const timerSeconds = technique.focusTime * 60;
      setTimeRemaining(timerSeconds);
      setInitialTimeRemaining(timerSeconds); // Store for progress calculation
    }
  }, [selectedTechnique, isRunning]);

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
  }, [isRunning, currentSessionId]); // Removed elapsedSeconds - it was causing re-renders every second!

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
      // Only set default subject if not loading from assignment session
      if (data.length > 0 && !selectedSubject && !hasAssignmentSessionRef.current) {
        setSelectedSubject(data[0].id);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load subjects');
    }
  };

  const fetchUserGrade = async () => {
    try {
      const profile = await OnboardingService.getProfile();
      if (profile.grade_level) {
        // Extract numeric grade from strings like "Year 1 (Grade 11)" or "Grade 11"
        const gradeMatch = profile.grade_level.match(/Grade (\d+)/i) || profile.grade_level.match(/(\d+)/);
        if (gradeMatch) {
          setInlineGrade(gradeMatch[1]);
        } else {
          setInlineGrade('9'); // Default fallback
        }
      } else {
        setInlineGrade('9'); // Default if no grade level set
      }
    } catch (error) {
      console.error('Failed to load user grade:', error);
      setInlineGrade('9'); // Default on error
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const data = await SessionsService.getRecent(20); // Fetch more to get all of today's sessions
      setRecentSessions(data.slice(0, 3)); // Only keep first 3 for display

      // Calculate today's minutes and completed sessions
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = data.filter(s => s.start_time.split('T')[0] === today);

      const todaySessionsMinutes = todaySessions
        .filter(s => s.duration_minutes)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      setTodayMinutes(todaySessionsMinutes);

      // Count completed sessions (those with end_time)
      const completedCount = todaySessions.filter(s => s.end_time).length;
      setCompletedSessions(completedCount);
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

    // Use refs to get current values (avoids stale closure in interval callback)
    const currentElapsed = elapsedSecondsRef.current;
    const currentInterruptions = interruptionsRef.current;

    try {
      await SessionsService.update(currentSessionId, {
        elapsed_seconds: currentElapsed,
        interruptions_count: currentInterruptions,
        ...(isFinal && { end_time: new Date().toISOString(), focus_rating: 3 })
      });

      // Also update assignment time and active session if this is an assignment session
      if (assignmentSession && currentElapsed > 0) {
        await saveAssignmentTime();
      }

      console.log(`💾 Auto-saved: ${currentElapsed}s elapsed, ${currentInterruptions} interruptions`);
    } catch (error) {
      if (!isFinal) {
        console.error('Failed to save elapsed time:', error);
      }
    }
  };

  const saveAssignmentTime = async () => {
    if (!assignmentSession) return;

    try {
      const currentElapsed = elapsedSecondsRef.current;
      const timeSpentMinutes = Math.floor(currentElapsed / 60);
      const { AssignmentsService } = await import('@/lib/api/assignments');
      await AssignmentsService.updateProgress(
        assignmentSession.assignmentId,
        assignmentTasksCompleted,
        timeSpentMinutes
      );

      // Update active session on server
      const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
      await ActiveSessionsService.update({
        tasks_completed: assignmentTasksCompleted,
        time_spent_minutes: timeSpentMinutes,
        elapsed_seconds: currentElapsed,
      });

      // Update local state
      const updatedSession = {
        ...assignmentSession,
        currentTasks: assignmentTasksCompleted,
        timeSpent: timeSpentMinutes
      };
      setAssignmentSession(updatedSession);
    } catch (error) {
      console.error('Failed to save assignment time:', error);
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

      // Update assignment time if this is an assignment session
      if (assignmentSession) {
        await saveAssignmentTime();

        // Check if assignment is complete
        const timeSpentMinutes = Math.floor(elapsedSeconds / 60);
        if (
          assignmentTasksCompleted >= assignmentSession.requiredTasks &&
          timeSpentMinutes >= assignmentSession.estimatedMinutes
        ) {
          alert('🎉 Assignment completed! Great work!');
          // Delete active session from server
          try {
            const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
            await ActiveSessionsService.delete();
          } catch (error) {
            console.error('Failed to delete active session:', error);
          }
          setAssignmentSession(null);
        }
      }

      // Refresh data
      fetchRecentSessions();
      fetchWeeklyStats();
    }

    // Reset state
    const technique = techniques.find(t => t.id === selectedTechnique);
    if (technique) {
      const timerSeconds = technique.focusTime * 60;
      setTimeRemaining(timerSeconds);
      setInitialTimeRemaining(timerSeconds);
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

        // Update assignment time if this is an assignment session
        if (assignmentSession && elapsedSeconds > 0) {
          await saveAssignmentTime();

          // Check if assignment is complete
          const timeSpentMinutes = Math.floor(elapsedSeconds / 60);
          if (
            assignmentTasksCompleted >= assignmentSession.requiredTasks &&
            timeSpentMinutes >= assignmentSession.estimatedMinutes
          ) {
            alert('🎉 Assignment completed! Great work!');
            // Delete active session from server
            const { ActiveSessionsService } = await import('@/lib/api/active-sessions');
            await ActiveSessionsService.delete();
            setAssignmentSession(null);
          }
        }

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
          const timerSeconds = nextTechnique.focusTime * 60;
          setTimeRemaining(timerSeconds);
          setInitialTimeRemaining(timerSeconds);
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

  // Calculate progress based on elapsed time (more reliable than timeRemaining)
  const progress = initialTimeRemaining > 0 ? Math.min(1, elapsedSeconds / initialTimeRemaining) : 0;
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
                        onClick={() => handleSubjectChange(subject.id)}
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
                <Button variant="ghost" size="lg" onClick={handleResetSession}>
                  <X className="w-5 h-5 mr-2" />
                  Reset Session
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

              {/* Assignment Goals - Show when in assignment session */}
              {assignmentSession && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">Assignment Goals</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Subject:</span>
                      <span className="text-white font-medium">{assignmentSession.subject}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Topic:</span>
                      <span className="text-white font-medium">{assignmentSession.topic}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Tasks to Complete:</span>
                      <span className="text-white font-medium">
                        {assignmentTasksCompleted} / {assignmentSession.requiredTasks}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Target Time:</span>
                      <span className="text-white font-medium">{assignmentSession.estimatedMinutes} min</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            ((assignmentTasksCompleted / assignmentSession.requiredTasks) * 50 +
                            (Math.floor(elapsedSeconds / 60) / assignmentSession.estimatedMinutes) * 50),
                            100
                          )}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-center text-white/60 mt-1">
                      {Math.round(
                        (assignmentTasksCompleted / assignmentSession.requiredTasks) * 50 +
                        (Math.floor(elapsedSeconds / 60) / assignmentSession.estimatedMinutes) * 50
                      )}% Complete
                    </div>
                  </div>
                </div>
              )}

              {/* Session Goal */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-3">Daily Goal</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSessionGoal(Math.max(15, sessionGoal - 15))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <span className="text-white">-</span>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{sessionGoal}</span>
                    <span className="text-white/60 ml-2">minutes</span>
                  </div>
                  <button
                    onClick={() => setSessionGoal(sessionGoal + 15)}
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
                  <span className="text-white">{todayMinutes} / {sessionGoal} min</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
                    style={{ width: `${Math.min((todayMinutes / sessionGoal) * 100, 100)}%` }}
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

        {/* Practice Task Section - Always Visible */}
        <GlassCard className="mb-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Action Buttons - Top Left */}
                {currentTask && !isGenerating && (
                  <div className="flex items-center gap-2 mr-4">
                    <button
                      onClick={() => handleMarkCorrectIncorrect(true)}
                      className="w-10 h-10 rounded-full bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500/50 hover:border-green-500 flex items-center justify-center transition-all hover:scale-110"
                      title="Mark Correct"
                    >
                      <Check className="w-5 h-5 text-green-400" />
                    </button>
                    <button
                      onClick={() => handleMarkCorrectIncorrect(false)}
                      className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 hover:border-red-500 flex items-center justify-center transition-all hover:scale-110"
                      title="Mark Incorrect"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>
                    <button
                      onClick={handleNextTask}
                      className="w-10 h-10 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border-2 border-blue-500/50 hover:border-blue-500 flex items-center justify-center transition-all hover:scale-110"
                      title="Skip to Next Task"
                    >
                      <ChevronDown className="w-5 h-5 text-blue-400 rotate-[-90deg]" />
                    </button>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <Brain className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {isGenerating ? 'Generating Practice Task...' : 'Practice Task'}
                  </h3>
                  {currentTask && (
                    <>
                      <p className="text-white/60 text-sm">
                        {currentTask.subject} - {currentTask.topic} ({currentTask.difficulty})
                        {currentTask.estimatedTime && (
                          <span className="text-white/40 ml-2">• Estimated time: {currentTask.estimatedTime} min</span>
                        )}
                      </p>
                      {currentTask.predicted_correct !== undefined && currentTask.predicted_time_seconds !== undefined && (
                        <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <p className="text-xs text-blue-300/80 mb-1">LNIRT ML Predictions:</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-white">
                              <span className="text-white/60">Success:</span> {(currentTask.predicted_correct * 100).toFixed(1)}%
                            </span>
                            <span className="text-white">
                              <span className="text-white/60">Time:</span> {Math.floor(currentTask.predicted_time_seconds / 60)}m {currentTask.predicted_time_seconds % 60}s
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isGenerating && (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {taskHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content Grid with History Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Task Area */}
              <div className={showHistoryPanel ? "lg:col-span-2" : "lg:col-span-3"}>
                {!currentTask && !isGenerating ? (
                  /* Inline Topic/Difficulty Form */
                  <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                    <h4 className="text-white font-semibold mb-4">Generate New Practice Task</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Topic</label>
                        <input
                          type="text"
                          value={inlineTopic}
                          onChange={(e) => setInlineTopic(e.target.value)}
                          placeholder="Enter topic (e.g., Quadratic equations)"
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Difficulty</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'easy', label: 'Easy' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'hard', label: 'Hard' },
                          ].map((diff) => (
                            <button
                              key={diff.value}
                              onClick={() => setInlineDifficulty(diff.value)}
                              className={`px-3 py-2 rounded-lg border transition-all ${
                                inlineDifficulty === diff.value
                                  ? 'bg-white/20 border-white/40'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <span className="text-white text-sm">{diff.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleGenerateInlineTask}
                        disabled={!inlineTopic.trim() || !selectedSubject}
                        className="w-full"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Task
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Task Display */}
                    <div className="bg-black/20 rounded-lg p-6 border border-white/10 mb-4">
                      {isGenerating ? (
                        taskText ? (
                          <MarkdownRenderer content={taskText} />
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <p className="text-white/40">Waiting for response...</p>
                          </div>
                        )
                      ) : (
                        currentTask && <MarkdownRenderer content={currentTask.task} />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button
                        variant={showSolution ? "secondary" : "ghost"}
                        onClick={() => setShowSolution(!showSolution)}
                        className="flex-1 min-w-[120px]"
                        disabled={isGenerating && !solutionText}
                      >
                        {showSolution ? 'Hide Solution' : 'Show Solution'}
                      </Button>
                      <Button
                        variant={showAnswer ? "secondary" : "ghost"}
                        onClick={() => setShowAnswer(!showAnswer)}
                        className="flex-1 min-w-[120px]"
                        disabled={isGenerating && !answerText}
                      >
                        {showAnswer ? 'Hide Answer' : 'Show Answer'}
                      </Button>
                    </div>

                    {/* Ask Question Button */}
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        onClick={() => setShowChatModal(true)}
                        disabled={isGenerating}
                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 flex items-center justify-center"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="ml-2">Ask Question</span>
                      </Button>
                    </div>

                    {/* Difficulty Selector for Next Task */}
                    <div className="mb-4 relative">
                      <button
                        onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                        className="text-white/60 hover:text-white/80 text-sm flex items-center gap-1 transition-colors"
                      >
                        Difficulty: <span className="capitalize">{nextTaskDifficulty}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showDifficultyDropdown && (
                        <div className="absolute top-full mt-2 bg-black/90 border border-white/20 rounded-lg p-2 z-10 min-w-[150px]">
                          {[
                            { value: 'easy', label: 'Easy' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'hard', label: 'Hard' },
                          ].map((diff) => (
                            <button
                              key={diff.value}
                              onClick={() => {
                                setNextTaskDifficulty(diff.value);
                                setShowDifficultyDropdown(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                                nextTaskDifficulty === diff.value
                                  ? 'bg-white/20 text-white'
                                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {diff.label}
                            </button>
                          ))}
                        </div>
                      )}
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
                        {isGenerating ? (
                          solutionText ? (
                            <MarkdownRenderer content={solutionText} />
                          ) : (
                            <p className="text-white/40 text-sm">Generating solution...</p>
                          )
                        ) : (
                          currentTask && <MarkdownRenderer content={currentTask.solution} />
                        )}
                      </div>
                    )}

                    {/* Answer Display */}
                    {showAnswer && (
                      <div className="bg-black/20 rounded-lg p-6 border border-white/10">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          Answer
                        </h4>
                        {isGenerating ? (
                          answerText ? (
                            <MarkdownRenderer content={answerText} />
                          ) : (
                            <p className="text-white/40 text-sm">Generating answer...</p>
                          )
                        ) : (
                          currentTask && <MarkdownRenderer content={currentTask.answer} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Task History Panel */}
              {showHistoryPanel && taskHistory.length > 0 && (
                <div className="lg:col-span-1">
                  <div className="bg-black/20 rounded-lg p-4 border border-white/10 max-h-[600px] overflow-y-auto">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      History
                    </h4>
                    <div className="space-y-2">
                      {taskHistory.map((task) => {
                        return (
                          <button
                            key={task.id}
                            onClick={() => handleLoadHistoryTask(task)}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                              currentTaskId === task.id
                                ? 'bg-white/20 border-white/40'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white text-sm font-medium truncate">
                                {task.topic}
                              </span>
                              {task.is_correct !== null && (
                                <span className={task.is_correct ? 'text-green-400' : 'text-red-400'}>
                                  {task.is_correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              <span className="capitalize">{task.difficulty}</span>
                              <span>•</span>
                              <span>{new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

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

      {/* AI Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ask About This Task</h3>
                  <p className="text-sm text-white/60">Get help understanding the problem and solution</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-white/40 py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg">Ask me anything about this task!</p>
                  <p className="text-sm mt-2">I can help explain concepts, walk through the solution, or clarify any doubts.</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-500/20 text-white border border-blue-500/30'
                          : 'bg-white/10 text-white/90 border border-white/20'
                      }`}
                    >
                      <MarkdownRenderer content={msg.content} />
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 font-bold">You</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {/* Streaming Message */}
              {streamingMessage && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 text-white/90 border border-white/20">
                    <MarkdownRenderer content={streamingMessage} />
                  </div>
                </div>
              )}
              {/* Loading Indicator - only show when not streaming */}
              {isChatLoading && !streamingMessage && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-white/20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && handleSendChatMessage()}
                  placeholder="Type your question..."
                  disabled={isChatLoading}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="w-12 h-12 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
