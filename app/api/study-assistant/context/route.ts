/**
 * Study Assistant Context API
 * Returns student statistics and ML predictions WITHOUT calling OpenAI
 * This loads instantly to show the page while recommendation streams separately
 */

import { NextRequest, NextResponse } from 'next/server';
import { assistantContext } from '@/lib/services/studyAssistantContext';

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('studentId');

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

    // Generate task assignments based on ML analysis
    const taskAssignments = await generateTaskAssignments(context);

    // Return context data without OpenAI recommendation
    return NextResponse.json({
      hasData,
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
    console.error('Study assistant context error:', error);
    return NextResponse.json(
      { error: 'Failed to load context' },
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
