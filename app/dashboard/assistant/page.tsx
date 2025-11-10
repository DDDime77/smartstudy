'use client';

import { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Wrench,
  Check
} from 'lucide-react';
import { AuthService } from '@/lib/api/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

// Content segment types for inline MCP calls
interface ContentSegment {
  type: 'text' | 'tool_call';
  content?: string;
  toolCall?: { name: string; args: any; status: 'calling' | 'complete' };
}

interface ChatMessage {
  role: string;
  segments: ContentSegment[];
}

export default function StudyAssistantPage() {
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingSegments, setStreamingSegments] = useState<ContentSegment[]>([]);
  const [currentTextBuffer, setCurrentTextBuffer] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStudentAndData();
  }, []);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (within 100px)
    const chatContainer = chatEndRef.current?.parentElement;
    if (chatContainer) {
      const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
      if (isNearBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [chatMessages, streamingSegments]);

  const loadStudentAndData = async () => {
    try {
      // Get the actual student ID from auth
      const user = await AuthService.getCurrentUser();
      setStudentId(user.id);
      await loadAssistantData(user.id, true);
    } catch (error) {
      console.error('Error loading student:', error);
    }
  };

  // Load context (statistics) first - instant, no OpenAI
  const loadContext = async (id: string) => {
    try {
      console.log('🔍 Loading context for student:', id);
      const response = await fetch(`/api/study-assistant/context?studentId=${id}`);

      if (!response.ok) {
        throw new Error(`Failed to load context: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Context loaded:', data);

      // Set the context data immediately (shows page with statistics)
      setAssistantData({
        recommendation: '', // Empty initially, will be filled by streaming
        taskAssignments: data.taskAssignments,
        context: data.context
      });

      return data.hasData;
    } catch (error) {
      console.error('❌ Error loading context:', error);
      throw error;
    }
  };

  // Stream the AI recommendation after context is loaded
  const loadRecommendation = async (id: string) => {
    try {
      console.log('🔍 Streaming recommendation for student:', id);
      const response = await fetch('/api/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id })
      });

      if (!response.ok) {
        throw new Error(`Failed to load recommendation: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Update recommendation as it streams
          setAssistantData(prev => ({
            ...prev!,
            recommendation: buffer
          }));
        }
      }

      console.log('✅ Recommendation loaded');
    } catch (error) {
      console.error('❌ Error loading recommendation:', error);
      // Don't throw - context is already loaded, just show error in recommendation
      setAssistantData(prev => ({
        ...prev!,
        recommendation: 'Unable to load AI recommendation. Please try refreshing the page.'
      }));
    }
  };

  // Main load function - calls both in sequence
  const loadAssistantData = async (id: string, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      // Step 1: Load context (instant)
      const hasData = await loadContext(id);

      // If initial load, hide loading spinner after context is ready
      if (isInitial) {
        setIsLoading(false);
      }

      // Step 2: Stream recommendation (takes time)
      await loadRecommendation(id);
    } catch (error) {
      console.error('❌ Error loading assistant:', error);
      // Set a minimal default data structure so the page doesn't crash
      setAssistantData({
        recommendation: 'Unable to load recommendations. Please check your internet connection and try again.',
        taskAssignments: [],
        context: {
          summary: {
            total_study_hours_this_week: 0,
            total_study_hours_this_month: 0,
            overall_success_rate: 0,
            upcoming_exams_count: 0,
            pending_assignments_count: 0,
            goals_on_track: 0,
            goals_behind: 0
          },
          topPriorities: {
            exams: [],
            assignments: []
          },
          nextSession: {
            duration: 0,
            subject: 'No data',
            topics: [],
            reasoning: 'Unable to load session data'
          }
        }
      });
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      segments: [{ type: 'text', content: userMessage }]
    };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);
    setStreamingSegments([]);
    setCurrentTextBuffer('');

    try {
      // Convert chat messages to OpenAI format (only text content, no tool calls)
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.segments
          .filter(seg => seg.type === 'text')
          .map(seg => seg.content)
          .join('\n')
      }));

      // Build query string with conversation history
      const params = new URLSearchParams({
        studentId,
        message: userMessage,
        conversationHistory: JSON.stringify(conversationHistory)
      });

      const response = await fetch(`/api/study-assistant?${params.toString()}`);

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let segments: ContentSegment[] = [];
      let currentText = '';
      let isProcessingTools = false;
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Check for complete lines (for tool markers only)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();

            // Check for tool call start
            if (trimmedLine === '__TOOL_CALL_START__') {
              // Save any accumulated text as a segment
              if (currentText) {
                segments.push({ type: 'text', content: currentText });
                currentText = '';
              }
              isProcessingTools = true;
              setStreamingSegments([...segments]);
              continue;
            }

            // Check for tool call end
            if (trimmedLine === '__TOOL_CALL_END__') {
              isProcessingTools = false;
              // Update last tool call status to 'complete'
              setStreamingSegments(prev => {
                const updated = [...prev];
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].type === 'tool_call' && updated[i].toolCall) {
                    updated[i] = {
                      ...updated[i],
                      toolCall: { ...updated[i].toolCall!, status: 'complete' }
                    };
                    break;
                  }
                }
                return updated;
              });
              continue;
            }

            // Parse tool call data
            if (trimmedLine.startsWith('__TOOL_DATA__:')) {
              try {
                const toolData = JSON.parse(trimmedLine.replace('__TOOL_DATA__:', ''));
                const toolSegment: ContentSegment = {
                  type: 'tool_call',
                  toolCall: {
                    name: toolData.name,
                    args: toolData.args,
                    status: 'calling'
                  }
                };
                segments.push(toolSegment);
                setStreamingSegments([...segments]);
              } catch (e) {
                console.error('Failed to parse tool data:', e);
              }
              continue;
            }

            // Regular message content - add the line
            if (!isProcessingTools && line) {
              currentText += line + '\n';
            }
          }

          // Stream regular text immediately (even incomplete lines!)
          if (!isProcessingTools) {
            // Add the incomplete buffer to current text for streaming display
            const streamingText = currentText + buffer;
            const currentStreamingSegments = streamingText
              ? [...segments, { type: 'text' as const, content: streamingText }]
              : segments;
            setStreamingSegments(currentStreamingSegments);
          }
        }

        // Add remaining buffer to final text
        if (buffer && !isProcessingTools) {
          currentText += buffer;
        }

        // Save final message with text segment
        if (currentText) {
          segments.push({ type: 'text', content: currentText });
        }

        setChatMessages(prev => [...prev, { role: 'assistant', segments }]);
        setStreamingSegments([]);
        setCurrentTextBuffer('');

        // Reload assistant data if tasks were created
        const hasToolCalls = segments.some(seg => seg.type === 'tool_call');
        if (hasToolCalls && studentId) {
          await loadAssistantData(studentId);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', segments: [{ type: 'text', content: 'Sorry, I encountered an error. Please try again.' }] }
      ]);
      setStreamingSegments([]);
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

  // Show loading spinner OR error (but only client-side to avoid SSR mismatch)
  if (!assistantData) {
    if (isLoading) {
      return (
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            <p className="text-white/60">Loading your study data...</p>
          </div>
        </div>
      );
    } else {
      // Only show error if client-side and load failed
      if (typeof window !== 'undefined') {
        return (
          <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="w-12 h-12 text-orange-400" />
              <p className="text-white">Failed to load assistant data</p>
              <p className="text-white/60 text-sm">Please try refreshing the page</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
      }
      // Server-side: show nothing (loading spinner will appear after hydration)
      return null;
    }
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
          {/* Left Column - Chat (Now Large) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chat with Assistant - Now Primary */}
            <div className="bg-white/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 h-[800px] flex flex-col">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-400" />
                Ask Your Assistant
              </h2>

              {/* Chat messages */}
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 ml-12 border border-blue-500/30'
                        : 'bg-white/5 mr-12 border border-white/10'
                    }`}
                  >
                    {msg.segments.map((segment, sidx) => (
                      <div key={sidx}>
                        {segment.type === 'text' && segment.content && (
                          <div className="prose prose-invert max-w-none text-white/90 text-sm">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                code: ({node, inline, ...props}: any) =>
                                  inline ? (
                                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300" {...props} />
                                  ) : (
                                    <code className="block bg-black/30 p-3 rounded-lg my-2 overflow-x-auto" {...props} />
                                  ),
                                strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1" {...props} />,
                              }}
                            >
                              {segment.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {segment.type === 'tool_call' && segment.toolCall && (
                          <div className="text-sm my-2">
                            <div className="flex items-start gap-2">
                              <span className="text-white/60 select-none">*</span>
                              <div className="flex-1">
                                <span className="font-medium text-white/60">
                                  Called mcp tool <span className="font-mono">{segment.toolCall.name}</span>
                                </span>

                                {/* Task Details */}
                                <div className="mt-1.5 ml-2 space-y-0.5">
                                  <p className="leading-relaxed text-white/50">
                                    {segment.toolCall.args.subject && segment.toolCall.args.topic && (
                                      <>
                                        <span className="font-medium">{segment.toolCall.args.subject}</span>
                                        {' - '}
                                        <span>{segment.toolCall.args.topic}</span>
                                      </>
                                    )}
                                  </p>
                                  <p className="text-xs leading-relaxed text-white/40">
                                    {segment.toolCall.args.due_date && (
                                      <>Scheduled: {new Date(segment.toolCall.args.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                    )}
                                    {segment.toolCall.args.time_of_day && (
                                      <>, {segment.toolCall.args.time_of_day}</>
                                    )}
                                    {segment.toolCall.args.estimated_minutes && (
                                      <> · {segment.toolCall.args.estimated_minutes} minutes</>
                                    )}
                                    {segment.toolCall.args.difficulty && (
                                      <> · {segment.toolCall.args.difficulty}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {streamingSegments.length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 mr-12 border border-white/10">
                    {streamingSegments.map((segment, sidx) => (
                      <div key={sidx}>
                        {segment.type === 'text' && segment.content && (
                          <div className="prose prose-invert max-w-none text-white/90 text-sm">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                code: ({node, inline, ...props}: any) =>
                                  inline ? (
                                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300" {...props} />
                                  ) : (
                                    <code className="block bg-black/30 p-3 rounded-lg my-2" {...props} />
                                  ),
                              }}
                            >
                              {segment.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {segment.type === 'tool_call' && segment.toolCall && (
                          <div className="text-sm my-2">
                            <div className="flex items-start gap-2">
                              <span className="text-white/60 select-none">*</span>
                              <div className="flex-1">
                                <span className={`font-medium ${segment.toolCall.status === 'calling' ? 'text-white/50 animate-pulse' : 'text-white/60'}`}>
                                  {segment.toolCall.status === 'calling' ? 'Calling' : 'Called'} mcp tool{' '}
                                  <span className="font-mono">{segment.toolCall.name}</span>
                                </span>

                                {/* Task Details - Dropdown paragraph */}
                                <div className={`mt-1.5 ml-2 space-y-0.5 ${segment.toolCall.status === 'calling' ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}>
                                  <p className={`leading-relaxed ${segment.toolCall.status === 'calling' ? 'text-white/40' : 'text-white/50'}`}>
                                    {segment.toolCall.args.subject && segment.toolCall.args.topic && (
                                      <>
                                        <span className="font-medium">{segment.toolCall.args.subject}</span>
                                        {' - '}
                                        <span>{segment.toolCall.args.topic}</span>
                                      </>
                                    )}
                                  </p>
                                  <p className={`text-xs leading-relaxed ${segment.toolCall.status === 'calling' ? 'text-white/30' : 'text-white/40'}`}>
                                    {segment.toolCall.args.due_date && (
                                      <>Scheduled: {new Date(segment.toolCall.args.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                    )}
                                    {segment.toolCall.args.time_of_day && (
                                      <>, {segment.toolCall.args.time_of_day}</>
                                    )}
                                    {segment.toolCall.args.estimated_minutes && (
                                      <> · {segment.toolCall.args.estimated_minutes} minutes</>
                                    )}
                                    {segment.toolCall.args.difficulty && (
                                      <> · {segment.toolCall.args.difficulty}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask for help, request tasks, or get study advice..."
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-all"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg transition-all font-medium"
                >
                  {isChatLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
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

          {/* Right Column - Recommendations & Priorities */}
          <div className="space-y-6">
            {/* AI Recommendation - Now Smaller */}
            <div className="bg-white/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Recommendation
              </h3>
              <div className="prose prose-invert max-w-none text-white/80 text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                  }}
                >
                  {assistantData?.recommendation}
                </ReactMarkdown>
              </div>
            </div>

            {/* Top Exam Priorities */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Top Exam Priorities
              </h3>
              <div className="space-y-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}
