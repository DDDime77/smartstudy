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
 * Chat with assistant (streaming)
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

Be conversational, helpful, and reference their specific data when relevant.`;

    // Stream response
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
