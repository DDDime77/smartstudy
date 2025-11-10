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
      model: 'gpt-4',
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

    const systemPrompt = `You are an AI Study Assistant. Help the student with their question.

Student Context:
${contextText}

You have access to a function to generate personalized study plan assignments.
Use it when the student asks for a study plan, schedule, or wants you to create assignments.

Be conversational, helpful, and reference their specific data when relevant.`;

    // Define function for study plan generation
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
      }
    ];

    // First API call to get function calling decision
    const initialResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: tools as any,
      tool_choice: 'auto',
      temperature: 0.7,
    });

    const responseMessage = initialResponse.choices[0].message;

    // Check if AI wants to call the function
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];

      if (toolCall.function.name === 'generate_study_plan') {
        // Execute the function
        return await generateStudyPlan(studentId);
      }
    }

    // If no function call, stream normal response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
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
