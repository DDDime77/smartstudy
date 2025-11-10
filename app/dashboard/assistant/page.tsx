'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AuthService } from '@/lib/api/auth';

interface TaskAssignment {
  type: string;
  title: string;
  description: string;
  priority: number;
  estimatedMinutes: number;
  dueBy?: string;
}

interface AssistantResponse {
  recommendation: string;
  taskAssignments: TaskAssignment[];
  context: {
    summary: {
      total_study_hours_this_week: number;
      total_study_hours_this_month: number;
      overall_success_rate: number;
      upcoming_exams_count: number;
      pending_assignments_count: number;
      goals_on_track: number;
      goals_behind: number;
    };
    topPriorities: {
      exams: Array<{
        exam_id: string;
        title: string;
        priority_score: number;
        predicted_prep_hours: number;
        predicted_performance: number;
        outlook: string;
      }>;
      assignments: Array<{
        assignment_id: string;
        title: string;
        priority_score: number;
      }>;
    };
    nextSession: {
      duration: number;
      subject: string;
      topics: string[];
      reasoning: string;
    };
  };
}

export default function StudyAssistantPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    loadStudentAndData();
  }, []);

  const loadStudentAndData = async () => {
    try {
      // Get the actual student ID from auth
      const user = await AuthService.getCurrentUser();
      setStudentId(user.id);
      await loadAssistantData(user.id);
    } catch (error) {
      console.error('Error loading student:', error);
      setIsLoading(false);
    }
  };

  const loadAssistantData = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id })
      });

      if (!response.ok) throw new Error('Failed to load assistant data');

      const data = await response.json();
      setAssistantData(data);
    } catch (error) {
      console.error('Error loading assistant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch(
        `/api/study-assistant?studentId=${studentId}&message=${encodeURIComponent(userMessage)}`
      );

      if (!response.ok) throw new Error('Failed to get response');

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

        setChatMessages(prev => [...prev, { role: 'assistant', content: fullMessage }]);
        setStreamingMessage('');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-white/40" />;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'border-red-500/50 bg-red-500/10';
    if (priority >= 60) return 'border-orange-500/50 bg-orange-500/10';
    if (priority >= 40) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-blue-500/50 bg-blue-500/10';
  };

  const getOutlookColor = (outlook: string) => {
    if (outlook === 'excellent') return 'text-green-400';
    if (outlook === 'good') return 'text-blue-400';
    if (outlook === 'concerning') return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <p className="text-white/60">Analyzing your study data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-400" />
            Study Assistant
          </h1>
          <p className="text-white/60">AI-powered insights and recommendations for your learning journey</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">This Week</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {assistantData?.context.summary.total_study_hours_this_week}h
            </p>
            <p className="text-white/40 text-xs">Study time</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Success Rate</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {assistantData?.context.summary.overall_success_rate}%
            </p>
            <p className="text-white/40 text-xs">Overall performance</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Upcoming</span>
              <Calendar className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {assistantData?.context.summary.upcoming_exams_count}
            </p>
            <p className="text-white/40 text-xs">Exams</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Goals</span>
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {assistantData?.context.summary.goals_on_track}/{assistantData?.context.summary.goals_on_track + assistantData?.context.summary.goals_behind}
            </p>
            <p className="text-white/40 text-xs">On track</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recommendations & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Recommendation */}
            <div className="bg-white/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Recommendation
              </h2>
              <div className="text-white/80 whitespace-pre-line leading-relaxed">
                {assistantData?.recommendation}
              </div>
            </div>

            {/* Task Assignments */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Assigned Tasks
              </h2>
              <div className="space-y-3">
                {assistantData?.taskAssignments.map((task, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{task.title}</h3>
                        <p className="text-white/60 text-sm">{task.description}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white">
                        Priority: {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes} min
                      </span>
                      {task.dueBy && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueBy).toLocaleDateString()}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-white/10 capitalize">
                        {task.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Session Suggestion */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Recommended Next Session
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{assistantData?.context.nextSession.subject}</p>
                    <p className="text-white/60 text-sm">{assistantData?.context.nextSession.reasoning}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{assistantData?.context.nextSession.duration}</p>
                    <p className="text-white/60 text-xs">minutes</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assistantData?.context.nextSession.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white/20 text-white text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Priorities & Chat */}
          <div className="space-y-6">
            {/* Top Exam Priorities */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Top Exam Priorities
              </h3>
              <div className="space-y-3">
                {assistantData?.context.topPriorities.exams.map((exam, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-sm font-medium flex-1">{exam.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">
                        {exam.priority_score}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>Prep needed: {exam.predicted_prep_hours}h</p>
                      <p className={getOutlookColor(exam.outlook)}>
                        Expected: {exam.predicted_performance}% ({exam.outlook})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat with Assistant */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Ask Your Assistant
              </h3>

              {/* Chat messages */}
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 ml-8'
                        : 'bg-white/5 mr-8'
                    }`}
                  >
                    <p className="text-white/80 text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="p-3 rounded-lg bg-white/5 mr-8">
                    <p className="text-white/80 text-sm whitespace-pre-line">{streamingMessage}</p>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask for help or advice..."
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg transition-all"
                >
                  {isChatLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
