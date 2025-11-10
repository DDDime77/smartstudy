/**
 * Study Assistant API
 * Uses ML predictions + LLM to generate personalized recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { assistantContext } from '@/lib/services/studyAssistantContext';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { studentId, query, conversationHistory } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Build comprehensive context with ML predictions
    const context = await assistantContext.buildContext(studentId);

    // Check if we have any data
    const hasData = context.exams.length > 0 ||
                    context.assignments.length > 0 ||
                    context.studySessions.length > 0 ||
                    context.taskHistory.length > 0;

    // If no data, return helpful onboarding message
    if (!hasData && !query) {
      return NextResponse.json({
        recommendation: `Welcome to your AI Study Assistant! 🎓

I'm here to help you optimize your learning and achieve your academic goals.

To get started, I recommend:

1. **Start a Study Session** - Use the Study Timer to begin tracking your study time
2. **Generate Practice Tasks** - Create AI-powered practice problems to test your knowledge
3. **Set Your Goals** - Define what you want to achieve this semester
4. **Add Upcoming Exams** - Track important deadlines and get personalized prep plans

Once you start studying and completing tasks, I'll be able to:
- Analyze your performance trends
- Predict optimal study times
- Recommend what to focus on next
- Help you prioritize your workload

Ready to begin? Head to the Study Timer page and start your first session!`,
        taskAssignments: [
          {
            type: 'getting_started',
            title: 'Start Your First Study Session',
            description: 'Begin tracking your study time to help me learn your patterns',
            priority: 80,
            estimatedMinutes: 25
          },
          {
            type: 'getting_started',
            title: 'Generate Your First Practice Task',
            description: 'Try the AI task generator to create personalized practice problems',
            priority: 70,
            estimatedMinutes: 15
          }
        ],
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
            duration: 25,
            subject: 'Getting Started',
            topics: ['Setup', 'First Session'],
            reasoning: 'Start with a 25-minute session to get familiar with the platform'
          }
        }
      });
    }

    const contextText = assistantContext.formatContextForLLM(context);

    // System prompt for the assistant
    const systemPrompt = `You are an AI Study Assistant helping a student optimize their learning and achieve their academic goals.

You have access to:
1. ML-powered predictions about exam performance, task priorities, and time estimates
2. Complete history of the student's study sessions and task performance
3. Upcoming exams, assignments, and personal goals

Your role:
- Provide actionable, specific recommendations based on data
- Help prioritize tasks using the ML priority scores
- Suggest study sessions with specific subjects and topics
- Warn about potential issues (declining performance, approaching deadlines)
- Encourage and motivate while being realistic about challenges
- Use the ML predictions to make data-driven suggestions

Guidelines:
- Be concise and direct - students are busy
- Always explain WHY you're recommending something (reference the data)
- Provide 2-4 specific action items when asked "what should I do?"
- Use the ML time estimates to help students plan realistically
- Flag urgent items (exams <3 days, assignments <24h)
- Celebrate improvements and acknowledge challenges

Context for this student:
${contextText}
`;

    // Build messages
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current query or generate dashboard summary
    if (query) {
      messages.push({ role: 'user', content: query });
    } else {
      // No query = generate dashboard summary
      messages.push({
        role: 'user',
        content: 'Analyze my current situation and provide a brief overview with 3-4 specific action items for what I should focus on right now. Be direct and actionable.'
      });
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const recommendation = response.choices[0].message.content;

    // Also generate specific task assignments
    const taskAssignments = await generateTaskAssignments(context);

    return NextResponse.json({
      recommendation,
      taskAssignments,
      context: {
        summary: context.summary,
        topPriorities: {
          exams: context.predictions.examPriorities.slice(0, 3),
          assignments: context.predictions.assignmentPriorities.slice(0, 3)
        },
        nextSession: context.predictions.nextSessionSuggestion
      }
    });

  } catch (error) {
    console.error('Study assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Generate specific task assignments based on ML analysis
 */
async function generateTaskAssignments(context: any) {
  const assignments: Array<{
    type: string;
    title: string;
    description: string;
    priority: number;
    estimatedMinutes: number;
    dueBy?: string;
  }> = [];

  // 1. Urgent exam preparation
  context.predictions.examPriorities.forEach((exam: any, idx: number) => {
    if (idx < 2 && exam.priority_score > 60) {
      const examData = context.exams.find((e: any) => e.id === exam.exam_id);
      assignments.push({
        type: 'exam_prep',
        title: `Prepare for ${exam.title}`,
        description: `Study session for ${examData?.subject}. Predicted prep needed: ${exam.predicted_prep_hours}h. Expected performance: ${exam.predicted_performance}%`,
        priority: exam.priority_score,
        estimatedMinutes: Math.round(exam.predicted_prep_hours * 60),
        dueBy: examData?.exam_date
      });
    }
  });

  // 2. High-priority assignments
  context.predictions.assignmentPriorities.forEach((assignment: any, idx: number) => {
    if (idx < 2 && assignment.priority_score > 50) {
      const assignmentData = context.assignments.find((a: any) => a.id === assignment.assignment_id);
      assignments.push({
        type: 'assignment',
        title: `Complete ${assignment.title}`,
        description: `${assignmentData?.completion_percentage}% done. Estimated time: ${assignmentData?.estimated_hours}h`,
        priority: assignment.priority_score,
        estimatedMinutes: Math.round((assignmentData?.estimated_hours || 2) * 60),
        dueBy: assignmentData?.due_date
      });
    }
  });

  // 3. Recommended practice session
  const nextSession = context.predictions.nextSessionSuggestion;
  assignments.push({
    type: 'practice_session',
    title: `Practice: ${nextSession.subject}`,
    description: `${nextSession.reasoning}. Focus on: ${nextSession.topics.join(', ')}`,
    priority: 50,
    estimatedMinutes: nextSession.duration
  });

  // 4. Review weak areas
  Object.entries(context.predictions.performanceTrends).forEach(([subject, trend]: [string, any]) => {
    if (trend.trend === 'declining' && trend.recent_success_rate < 60) {
      assignments.push({
        type: 'review',
        title: `Review ${subject} fundamentals`,
        description: `Performance declining (${trend.recent_success_rate}% success rate). Review core concepts.`,
        priority: 70,
        estimatedMinutes: 30
      });
    }
  });

  // Sort by priority and return top 5
  return assignments
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

/**
 * Chat with assistant (streaming with function calling)
 */
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('studentId');
    const message = req.nextUrl.searchParams.get('message');

    if (!studentId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Build context
    const context = await assistantContext.buildContext(studentId);
    const contextText = assistantContext.formatContextForLLM(context);

    // Get current date for context
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDateFormatted = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `You are an AI Study Assistant. You help students prepare for exams and manage their study schedule.

Current Date: ${currentDateFormatted} (${currentDate})

Student Context:
${contextText}

You have access to tools for managing study assignments:
- **create_assignment**: Create new study tasks (can call multiple times)
- **delete_assignment**: Delete tasks by ID when user asks to remove/cancel them
- **generate_study_plan**: Create a week-long study plan

You can call tools multiple times in a single response if needed.

CRITICAL INTELLIGENCE GUIDELINES:

1. **Exam Preparation Strategy:**
   - When a student asks to prepare for an exam (e.g., "Math summative in mid-December"), be SMART:
   - Calculate time until exam (days/weeks)
   - Create MULTIPLE study sessions spread over time, NOT just one
   - For 1 month away: create 4-6 sessions (weekly)
   - For 2 weeks away: create 3-4 sessions (every few days)
   - For 1 week away: create 2-3 sessions (every other day)
   - Break topics into chunks (e.g., "Derivatives", "Integrals", "Applications" instead of just "Calculus")

2. **Topic Breakdown:**
   - If the student mentions a broad topic (e.g., "Calculus"), break it down into subtopics
   - Examples:
     * Calculus → "Limits & Continuity", "Derivatives", "Integration", "Applications"
     * Physics → "Kinematics", "Dynamics", "Energy & Work"
   - Use the exam's units field from context if available

3. **Timing Intelligence:**
   - Space sessions appropriately - don't cram everything in one day
   - Use time_of_day: "morning"/"afternoon"/"evening" based on student preferences
   - Create earlier sessions for foundational topics, later sessions for practice/review

4. **When to Ask Questions:**
   - If request is vague, ask clarifying questions BEFORE creating tasks
   - Examples: "What specific topics?" "How many sessions would you like?" "Any particular dates?"

5. **Date Calculation:**
   - Today is ${currentDate}
   - "mid-December" = around December 15-20
   - "next week" = 7 days from now
   - Calculate YYYY-MM-DD format for due_date parameter

Be conversational and explain your reasoning. If you create multiple tasks, explain the study plan strategy.`;

    // Define functions for study plan generation and individual assignments
    const tools = [
      {
        type: 'function',
        function: {
          name: 'generate_study_plan',
          description: 'Generate a personalized study plan with assignments for the next 7 days based on the student\'s subjects, schedule, and upcoming exams',
          parameters: {
            type: 'object',
            properties: {
              days: {
                type: 'number',
                description: 'Number of days to plan for (default: 7)',
                default: 7
              }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_assignment',
          description: 'Create a single study assignment for a specific subject/topic. You can call this function MULTIPLE TIMES in one response to create a series of study sessions spread over time. For exam preparation, create 3-6 sessions with different subtopics and dates.',
          parameters: {
            type: 'object',
            properties: {
              subject: {
                type: 'string',
                description: 'The subject name (e.g., "Mathematics", "Physics")'
              },
              topic: {
                type: 'string',
                description: 'The specific topic to study. For exam preparation, extract the actual topics from the exam\'s units field in the context (e.g., if exam has units ["Circular Motion", "Gravitation"], use "Circular Motion, Gravitation"). DO NOT use generic terms like "Unit 1, Unit 2" or "Exam Preparation".'
              },
              exam_name: {
                type: 'string',
                description: 'Optional: Name/title of the exam this assignment is preparing for (e.g., "Physics Paper 2"). When provided, the system will look up the exam\'s topic automatically.'
              },
              due_date: {
                type: 'string',
                description: 'Optional: Specific date for the assignment in YYYY-MM-DD format (e.g., "2024-11-20"). If not provided, the system will find the next available time slot.'
              },
              time_of_day: {
                type: 'string',
                enum: ['morning', 'afternoon', 'evening'],
                description: 'Optional: Time of day preference. "morning" = 9 AM, "afternoon" = 2 PM, "evening" = 6 PM. If not provided, uses user\'s availability schedule.'
              },
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard'],
                description: 'Difficulty level of the assignment'
              },
              estimated_minutes: {
                type: 'number',
                description: 'Estimated time to complete in minutes (default: 45)'
              },
              required_tasks_count: {
                type: 'number',
                description: 'Number of practice tasks to complete (default: 5)'
              }
            },
            required: ['subject', 'topic']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_assignment',
          description: 'Delete a study assignment by its ID. Use this when the user asks to remove, delete, or cancel a specific task or assignment.',
          parameters: {
            type: 'object',
            properties: {
              assignment_id: {
                type: 'number',
                description: 'The ID of the assignment to delete'
              }
            },
            required: ['assignment_id']
          }
        }
      }
    ];

    // Stream the initial API call to get real-time response
    const initialStream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: tools as any,
      tool_choice: 'auto',
      parallel_tool_calls: true,
      temperature: 0.7,
      stream: true, // Enable streaming for initial response!
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Accumulate the response content and tool calls from stream
          let fullContent = '';
          const toolCalls: any[] = [];
          const toolCallsMap = new Map<number, any>();
          let lastProcessedIndex = -1;

          // Helper function to execute a completed tool call
          const executeToolCall = async (toolCall: any) => {
            console.log('Executing tool:', toolCall.function.name, toolCall.function.arguments);

            // Send tool call start marker
            controller.enqueue(encoder.encode('\n__TOOL_CALL_START__\n'));

            // Send tool data for frontend
            controller.enqueue(encoder.encode(`__TOOL_DATA__:${JSON.stringify({ name: toolCall.function.name, args: JSON.parse(toolCall.function.arguments) })}\n`));

            // Execute the tool
            if (toolCall.function.name === 'generate_study_plan') {
              await generateStudyPlanInline(studentId, controller, encoder);
            } else if (toolCall.function.name === 'create_assignment') {
              const args = JSON.parse(toolCall.function.arguments);
              await createSingleAssignmentInline(studentId, args, controller, encoder);
            } else if (toolCall.function.name === 'delete_assignment') {
              const args = JSON.parse(toolCall.function.arguments);
              await deleteAssignmentInline(studentId, args, controller, encoder);
            }

            // Send tool call end marker
            controller.enqueue(encoder.encode('\n__TOOL_CALL_END__\n'));
          };

          // Stream the initial response and execute tools live
          for await (const chunk of initialStream) {
            const delta = chunk.choices[0]?.delta;

            // Stream content as it arrives
            if (delta?.content) {
              fullContent += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }

            // Process tool call deltas
            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                // If we're starting a new tool call, execute the previous one
                if (index > lastProcessedIndex + 1 && toolCallsMap.has(lastProcessedIndex + 1)) {
                  const completedToolCall = toolCallsMap.get(lastProcessedIndex + 1);
                  toolCalls.push(completedToolCall);
                  await executeToolCall(completedToolCall);
                  lastProcessedIndex++;
                }

                // Accumulate current tool call
                if (!toolCallsMap.has(index)) {
                  toolCallsMap.set(index, {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: {
                      name: toolCallDelta.function?.name || '',
                      arguments: toolCallDelta.function?.arguments || ''
                    }
                  });
                } else {
                  const existing = toolCallsMap.get(index);
                  if (toolCallDelta.id) existing.id = toolCallDelta.id;
                  if (toolCallDelta.function?.name) existing.function.name = toolCallDelta.function.name;
                  if (toolCallDelta.function?.arguments) existing.function.arguments += toolCallDelta.function.arguments;
                }
              }
            }
          }

          // Execute any remaining tool calls after stream completes
          for (let i = lastProcessedIndex + 1; i < toolCallsMap.size; i++) {
            if (toolCallsMap.has(i)) {
              const completedToolCall = toolCallsMap.get(i);
              toolCalls.push(completedToolCall);
              await executeToolCall(completedToolCall);
            }
          }

          // Generate follow-up response from AI after tool execution (if tools were called)
          if (toolCalls.length > 0) {
            const toolResults = toolCalls.map((tc: any) => ({
              role: 'tool',
              content: 'Tasks created successfully',
              tool_call_id: tc.id
            }));

            const followUpStream = await openai.chat.completions.create({
              model: 'gpt-4-turbo',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
                { role: 'assistant', content: fullContent, tool_calls: toolCalls },
                ...toolResults
              ],
              temperature: 0.7,
              max_tokens: 300,
              stream: true,
            });

            // Stream the follow-up response
            controller.enqueue(encoder.encode('\n\n'));
            for await (const chunk of followUpStream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Tool execution error:', error);
          controller.enqueue(encoder.encode('\n\n❌ Error creating tasks. Please try again.'));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

/**
 * Generate study plan and create assignments
 */
async function generateStudyPlan(studentId: string) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const { db } = await import('@/lib/db');

        controller.enqueue(encoder.encode('📅 Analyzing your schedule and subjects...\n\n'));

        // Get user's subjects, profile, and exams
        const [subjectsResult, profileResult, examsResult] = await Promise.all([
          db.query('SELECT * FROM subjects WHERE user_id = $1', [studentId]),
          db.query('SELECT * FROM user_profiles WHERE user_id = $1', [studentId]),
          db.query('SELECT * FROM exams WHERE user_id = $1 AND exam_date > NOW() ORDER BY exam_date LIMIT 5', [studentId])
        ]);

        const subjects = subjectsResult.rows;
        const profile = profileResult.rows[0];
        const upcomingExams = examsResult.rows;

        if (subjects.length === 0) {
          controller.enqueue(encoder.encode('⚠️ You need to add subjects first before I can create a study plan.\n'));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`✓ Found ${subjects.length} subjects\n`));

        // Get user's availability from profile, or use default schedule
        let availability = profile?.preferred_study_times || [];

        // If no availability set, create default schedule (weekdays 4-6 PM)
        if (!availability || availability.length === 0) {
          controller.enqueue(encoder.encode('ℹ️ Using default study schedule (Mon-Fri, 4-6 PM)\n'));
          availability = [
            { day: 1, slots: [{ start: '16:00', end: '18:00' }] }, // Monday
            { day: 2, slots: [{ start: '16:00', end: '18:00' }] }, // Tuesday
            { day: 3, slots: [{ start: '16:00', end: '18:00' }] }, // Wednesday
            { day: 4, slots: [{ start: '16:00', end: '18:00' }] }, // Thursday
            { day: 5, slots: [{ start: '16:00', end: '18:00' }] }, // Friday
          ];
        }

        const today = new Date();
        const assignmentsCreated: any[] = [];

        controller.enqueue(encoder.encode('\n🎯 Creating personalized study assignments...\n\n'));

        // Generate assignments for the next 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + dayOffset);
          const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

          // Check if user has availability for this day
          const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

          if (!dayAvailability || !dayAvailability.slots || dayAvailability.slots.length === 0) {
            continue; // Skip days with no availability
          }

          // Select subjects for this day (rotate through subjects)
          const subjectsForDay = subjects.filter((_: any, idx: number) =>
            (idx + dayOffset) % Math.ceil(7 / subjects.length) === 0
          ).slice(0, 2); // Max 2 subjects per day

          for (const subject of subjectsForDay) {
            const slot = dayAvailability.slots[0]; // Use first available slot
            const dateStr = targetDate.toISOString().split('T')[0];

            // Check if there's an upcoming exam for this subject
            const subjectExam = upcomingExams.find((e: any) => e.subject_id === subject.id);
            const difficulty = subjectExam ? 'medium' : 'easy';
            const estimatedMinutes = 45;

            // Create assignment
            const result = await db.query(
              `INSERT INTO ai_assignments (
                user_id, subject_id, title, subject_name, topic, difficulty,
                scheduled_date, scheduled_time, estimated_minutes, required_tasks_count
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *`,
              [
                studentId,
                subject.id,
                `Study Session: ${subject.name}`,
                subject.name,
                subjectExam ? 'Exam Preparation' : 'Practice & Review',
                difficulty,
                dateStr,
                slot.start,
                estimatedMinutes,
                5
              ]
            );

            const assignment = result.rows[0];
            assignmentsCreated.push(assignment);

            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
            controller.enqueue(encoder.encode(
              `✓ Created Task ${assignmentsCreated.length}: ${subject.name} - ${dayName} ${targetDate.getDate()}/${targetDate.getMonth()+1} at ${slot.start}\n`
            ));
          }
        }

        controller.enqueue(encoder.encode(`\n✅ Successfully created ${assignmentsCreated.length} study assignments!\n\n`));
        controller.enqueue(encoder.encode('📌 Your assignments are now visible in the Preparation calendar.\n'));
        controller.enqueue(encoder.encode('💡 Click on any assignment in the calendar to start your study session!\n'));

        controller.close();
      } catch (error) {
        console.error('Study plan generation error:', error);
        controller.enqueue(encoder.encode('\n❌ Error creating study plan. Please try again.\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Create a single assignment for a specific subject/topic/exam
 */
async function createSingleAssignment(studentId: string, params: {
  subject: string;
  topic: string;
  exam_name?: string;
  due_date?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening';
  difficulty?: string;
  estimated_minutes?: number;
  required_tasks_count?: number;
}) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const { db } = await import('@/lib/db');

        controller.enqueue(encoder.encode(`📝 Creating assignment for ${params.subject}...\n\n`));

        // Get user's subjects to find matching subject
        const subjectsResult = await db.query(
          'SELECT * FROM subjects WHERE user_id = $1',
          [studentId]
        );
        const subjects = subjectsResult.rows;

        // Find matching subject (case-insensitive)
        const matchingSubject = subjects.find((s: any) =>
          s.name.toLowerCase().includes(params.subject.toLowerCase()) ||
          params.subject.toLowerCase().includes(s.name.toLowerCase())
        );

        if (!matchingSubject) {
          controller.enqueue(encoder.encode(`⚠️ Could not find subject matching "${params.subject}". Available subjects: ${subjects.map((s: any) => s.name).join(', ')}\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`✓ Found subject: ${matchingSubject.name}\n`));

        // Get user's profile for availability
        const profileResult = await db.query(
          'SELECT * FROM user_profiles WHERE user_id = $1',
          [studentId]
        );
        const profile = profileResult.rows[0];
        let availability = profile?.preferred_study_times || [];

        // Default schedule if none set
        if (!availability || availability.length === 0) {
          availability = [
            { day: 1, slots: [{ start: '16:00', end: '18:00' }] }, // Monday
            { day: 2, slots: [{ start: '16:00', end: '18:00' }] }, // Tuesday
            { day: 3, slots: [{ start: '16:00', end: '18:00' }] }, // Wednesday
            { day: 4, slots: [{ start: '16:00', end: '18:00' }] }, // Thursday
            { day: 5, slots: [{ start: '16:00', end: '18:00' }] }, // Friday
          ];
        }

        // Determine scheduled date and time
        const today = new Date();
        let scheduledDate: Date | null = null;
        let scheduledTime: string | null = null;

        // Convert time_of_day to actual time
        const getTimeFromTimeOfDay = (timeOfDay?: string): string => {
          switch (timeOfDay) {
            case 'morning': return '09:00';
            case 'afternoon': return '14:00';
            case 'evening': return '18:00';
            default: return '';
          }
        };

        // If user specified a due_date, use that
        if (params.due_date) {
          try {
            scheduledDate = new Date(params.due_date);
            const dayOfWeek = scheduledDate.getDay();
            const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

            // If time_of_day is specified, use that directly
            if (params.time_of_day) {
              scheduledTime = getTimeFromTimeOfDay(params.time_of_day);
              controller.enqueue(encoder.encode(`✓ Using requested time: ${scheduledTime} (${params.time_of_day})\n`));
            }
            // Otherwise use the first available time slot for that day, or default to 16:00
            else if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
              // Try each slot to find one that's not occupied
              for (const slot of dayAvailability.slots) {
                const dateStr = scheduledDate.toISOString().split('T')[0];
                const existingResult = await db.query(
                  'SELECT COUNT(*) as count FROM ai_assignments WHERE user_id = $1 AND scheduled_date = $2 AND scheduled_time = $3',
                  [studentId, dateStr, slot.start]
                );

                if (existingResult.rows[0].count === '0') {
                  scheduledTime = slot.start;
                  break;
                }
              }

              // If all slots are occupied, just use the first one (allow multiple assignments)
              if (!scheduledTime) {
                scheduledTime = dayAvailability.slots[0].start;
              }
            } else {
              // No availability configured for this day, use default 16:00
              scheduledTime = '16:00';
            }

            controller.enqueue(encoder.encode(`✓ Using requested date: ${params.due_date}\n`));
          } catch (error) {
            controller.enqueue(encoder.encode(`⚠️ Invalid date format: ${params.due_date}. Using next available slot.\n`));
          }
        }

        // If no date specified or parsing failed, find next available slot
        if (!scheduledDate || !scheduledTime) {
          // If time_of_day is specified but no date, find the next date with that time
          if (params.time_of_day && !scheduledTime) {
            const preferredTime = getTimeFromTimeOfDay(params.time_of_day);

            for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
              const targetDate = new Date(today);
              targetDate.setDate(today.getDate() + dayOffset);
              const dateStr = targetDate.toISOString().split('T')[0];

              const existingResult = await db.query(
                'SELECT COUNT(*) as count FROM ai_assignments WHERE user_id = $1 AND scheduled_date = $2 AND scheduled_time = $3',
                [studentId, dateStr, preferredTime]
              );

              if (existingResult.rows[0].count === '0') {
                scheduledDate = targetDate;
                scheduledTime = preferredTime;
                controller.enqueue(encoder.encode(`✓ Found next available ${params.time_of_day} slot\n`));
                break;
              }
            }
          }

          // Otherwise, find next available slot based on availability schedule
          if (!scheduledTime) {
            for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
              const targetDate = new Date(today);
              targetDate.setDate(today.getDate() + dayOffset);
              const dayOfWeek = targetDate.getDay();

              const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

              if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
                // Try each slot to find an empty one
                for (const slot of dayAvailability.slots) {
                  const dateStr = targetDate.toISOString().split('T')[0];

                  const existingResult = await db.query(
                    'SELECT COUNT(*) as count FROM ai_assignments WHERE user_id = $1 AND scheduled_date = $2 AND scheduled_time = $3',
                    [studentId, dateStr, slot.start]
                  );

                  if (existingResult.rows[0].count === '0') {
                    scheduledDate = targetDate;
                    scheduledTime = slot.start;
                    break;
                  }
                }

                // If we found a slot, break out of the day loop
                if (scheduledTime) break;
              }
            }
          }

          if (!scheduledDate || !scheduledTime) {
            controller.enqueue(encoder.encode('⚠️ Could not find an available time slot in the next 2 weeks. All slots appear to be occupied. Consider adjusting your availability or removing old assignments.\n'));
            controller.close();
            return;
          }
        }

        const dateStr = scheduledDate.toISOString().split('T')[0];
        const difficulty = params.difficulty || 'medium';
        const estimatedMinutes = params.estimated_minutes || 45;
        const requiredTasksCount = params.required_tasks_count || 5;

        // Determine the topic - if exam_name is provided, look up the exam's units/topics
        let topicToUse = params.topic;
        if (params.exam_name) {
          // Try to find the exam in the database to get its units (topics)
          const examResult = await db.query(
            'SELECT units FROM exams WHERE user_id = $1 AND exam_type ILIKE $2 LIMIT 1',
            [studentId, `%${params.exam_name}%`]
          );

          if (examResult.rows.length > 0 && examResult.rows[0].units) {
            // units is a JSON array, join them into a comma-separated string
            const units = examResult.rows[0].units;
            if (Array.isArray(units) && units.length > 0) {
              topicToUse = units.filter((u: string) => u && u.trim()).join(', ');
              controller.enqueue(encoder.encode(`✓ Using exam topics: ${topicToUse}\n`));
            }
          }
        }

        // Create title based on whether it's exam prep or general study
        const title = params.exam_name
          ? `Prepare for ${params.exam_name}`
          : `Study Session: ${matchingSubject.name}`;

        // Create the assignment
        const result = await db.query(
          `INSERT INTO ai_assignments (
            user_id, subject_id, title, subject_name, topic, difficulty,
            scheduled_date, scheduled_time, estimated_minutes, required_tasks_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            studentId,
            matchingSubject.id,
            title,
            matchingSubject.name,
            topicToUse,
            difficulty,
            dateStr,
            scheduledTime,
            estimatedMinutes,
            requiredTasksCount
          ]
        );

        const assignment = result.rows[0];
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledDate.getDay()];

        controller.enqueue(encoder.encode(`\n✨ Created assignment: ${title}\n`));
        controller.enqueue(encoder.encode(`📚 Subject: ${matchingSubject.name}\n`));
        controller.enqueue(encoder.encode(`📖 Topic: ${params.topic}\n`));
        controller.enqueue(encoder.encode(`📅 Scheduled: ${dayName}, ${scheduledDate.getDate()}/${scheduledDate.getMonth()+1}/${scheduledDate.getFullYear()} at ${scheduledTime}\n`));
        controller.enqueue(encoder.encode(`⏱️ Estimated time: ${estimatedMinutes} minutes\n`));
        controller.enqueue(encoder.encode(`🎯 Tasks to complete: ${requiredTasksCount}\n`));
        controller.enqueue(encoder.encode(`💪 Difficulty: ${difficulty}\n`));
        controller.enqueue(encoder.encode('\n✅ Assignment created successfully!\n'));
        controller.enqueue(encoder.encode('📌 Check the Preparation calendar to see your new assignment.\n'));
        controller.enqueue(encoder.encode('💡 Click on the assignment to start your study session!\n'));

        controller.close();
      } catch (error) {
        console.error('Single assignment creation error:', error);
        controller.enqueue(encoder.encode('\n❌ Error creating assignment. Please try again.\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Inline version of createSingleAssignment for streaming responses
 */
async function createSingleAssignmentInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  const subjectsResult = await db.query(
    'SELECT * FROM subjects WHERE user_id = $1',
    [studentId]
  );
  const subjects = subjectsResult.rows;

  const matchingSubject = subjects.find((s: any) =>
    s.name.toLowerCase().includes(params.subject.toLowerCase()) ||
    params.subject.toLowerCase().includes(s.name.toLowerCase())
  );

  if (!matchingSubject) {
    controller.enqueue(encoder.encode('⚠️ Could not find subject "' + params.subject + '"\n'));
    return;
  }

  const profileResult = await db.query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [studentId]
  );
  const profile = profileResult.rows[0];
  let availability = profile?.preferred_study_times || [];

  if (!availability || availability.length === 0) {
    availability = [
      { day: 1, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 2, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 3, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 4, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 5, slots: [{ start: '16:00', end: '18:00' }] },
    ];
  }

  const today = new Date();
  let scheduledDate: Date | null = null;
  let scheduledTime: string | null = null;

  if (params.due_date) {
    scheduledDate = new Date(params.due_date);
    const dayOfWeek = scheduledDate.getDay();
    const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

    if (params.time_of_day) {
      const timeMap: any = { 'morning': '09:00', 'afternoon': '14:00', 'evening': '18:00' };
      scheduledTime = timeMap[params.time_of_day] || '16:00';
    } else if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
      scheduledTime = dayAvailability.slots[0].start;
    } else {
      scheduledTime = '16:00';
    }
  } else {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();

      const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

      if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
        scheduledDate = targetDate;
        scheduledTime = dayAvailability.slots[0].start;
        break;
      }
    }
  }

  if (!scheduledDate || !scheduledTime) {
    controller.enqueue(encoder.encode('⚠️ Could not find an available time slot\n'));
    return;
  }

  const dateStr = scheduledDate.toISOString().split('T')[0];
  const difficulty = params.difficulty || 'medium';
  const estimatedMinutes = params.estimated_minutes || 45;
  const requiredTasksCount = params.required_tasks_count || 5;
  const title = 'Study Session: ' + matchingSubject.name;

  await db.query(
    'INSERT INTO ai_assignments (user_id, subject_id, title, subject_name, topic, difficulty, scheduled_date, scheduled_time, estimated_minutes, required_tasks_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      studentId,
      matchingSubject.id,
      title,
      matchingSubject.name,
      params.topic,
      difficulty,
      dateStr,
      scheduledTime,
      estimatedMinutes,
      requiredTasksCount
    ]
  );

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledDate.getDay()];
  controller.enqueue(encoder.encode(
    'Created: ' + matchingSubject.name + ' - ' + params.topic + ' on ' + dayName + ' ' + scheduledDate.getDate() + '/' + (scheduledDate.getMonth()+1) + ' at ' + scheduledTime + '\n'
  ));
}

/**
 * Delete an assignment by ID
 */
async function deleteAssignmentInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  try {
    // First, get the assignment details before deleting
    const assignmentResult = await db.query(
      'SELECT * FROM ai_assignments WHERE id = $1 AND user_id = $2',
      [params.assignment_id, studentId]
    );

    if (assignmentResult.rows.length === 0) {
      controller.enqueue(encoder.encode('⚠️ Assignment not found or does not belong to you\n'));
      return;
    }

    const assignment = assignmentResult.rows[0];

    // Delete the assignment
    await db.query(
      'DELETE FROM ai_assignments WHERE id = $1 AND user_id = $2',
      [params.assignment_id, studentId]
    );

    controller.enqueue(encoder.encode(
      `Deleted: ${assignment.subject_name} - ${assignment.topic} (scheduled for ${assignment.scheduled_date})\n`
    ));
  } catch (error) {
    console.error('Error deleting assignment:', error);
    controller.enqueue(encoder.encode('❌ Error deleting assignment\n'));
  }
}

/**
 * Inline version of generateStudyPlan for streaming responses
 */
async function generateStudyPlanInline(
  studentId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  controller.enqueue(encoder.encode('__TOOL_DATA__:' + JSON.stringify({
    name: 'generate_study_plan',
    args: { days: 7 }
  }) + '\n'));

  const [subjectsResult, profileResult] = await Promise.all([
    db.query('SELECT * FROM subjects WHERE user_id = $1', [studentId]),
    db.query('SELECT * FROM user_profiles WHERE user_id = $1', [studentId])
  ]);

  const subjects = subjectsResult.rows;
  const profile = profileResult.rows[0];

  if (subjects.length === 0) {
    controller.enqueue(encoder.encode('⚠️ No subjects found. Please add subjects first.\n'));
    return;
  }

  let availability = profile?.preferred_study_times || [];
  if (!availability || availability.length === 0) {
    availability = [
      { day: 1, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 2, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 3, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 4, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 5, slots: [{ start: '16:00', end: '18:00' }] },
    ];
  }

  const today = new Date();
  let assignmentsCount = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayOffset);
    const dayOfWeek = targetDate.getDay();

    const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);
    if (!dayAvailability || !dayAvailability.slots || dayAvailability.slots.length === 0) continue;

    const subjectsForDay = subjects.filter((_: any, idx: number) =>
      (idx + dayOffset) % Math.ceil(7 / subjects.length) === 0
    ).slice(0, 2);

    for (const subject of subjectsForDay) {
      const slot = dayAvailability.slots[0];
      const dateStr = targetDate.toISOString().split('T')[0];

      await db.query(
        'INSERT INTO ai_assignments (user_id, subject_id, title, subject_name, topic, difficulty, scheduled_date, scheduled_time, estimated_minutes, required_tasks_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          studentId,
          subject.id,
          'Study Session: ' + subject.name,
          subject.name,
          'Practice & Review',
          'medium',
          dateStr,
          slot.start,
          45,
          5
        ]
      );

      assignmentsCount++;
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      controller.enqueue(encoder.encode(
        'Created ' + assignmentsCount + ': ' + subject.name + ' on ' + dayName + ' ' + targetDate.getDate() + '/' + (targetDate.getMonth()+1) + ' at ' + slot.start + '\n'
      ));
    }
  }

  controller.enqueue(encoder.encode('\nTotal assignments created: ' + assignmentsCount + '\n'));
}
