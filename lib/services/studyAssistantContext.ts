/**
 * Study Assistant Context Aggregator
 * Pulls all student data and runs ML models to create comprehensive context for LLM
 */

import {
  timeEstimator,
  performanceAnalyzer,
  priorityScorer,
  sessionOptimizer
} from '../ml/studyAssistantML';
import { db } from '@/lib/db';

export interface StudentContext {
  // Raw data
  student: {
    id: string;
    name: string;
  };
  exams: Array<{
    id: string;
    subject: string;
    title: string;
    exam_date: Date;
    exam_type: string;
    units: string[];
    start_time: string | null;
    finish_time: string | null;
    weight: number;
    days_until: number;
  }>;
  assignments: Array<{
    id: string;
    subject: string;
    title: string;
    due_date: Date;
    estimated_hours: number;
    completion_percentage: number;
    hours_until: number;
  }>;
  goals: Array<{
    subject: string;
    goal_type: string;
    target_value: string;
    current_value: string;
    progress_percentage: number;
  }>;
  studySessions: Array<{
    subject: string;
    duration_minutes: number;
    topics_covered: string[];
    created_at: Date;
  }>;
  taskHistory: Array<{
    subject: string;
    topic: string;
    difficulty: string;
    is_correct: boolean;
    time_spent_seconds: number;
    estimated_time_minutes: number;
    created_at: Date;
  }>;

  // ML predictions
  predictions: {
    examPriorities: Array<{
      exam_id: string;
      title: string;
      priority_score: number;
      predicted_prep_hours: number;
      predicted_performance: number;
      outlook: string;
    }>;
    assignmentPriorities: Array<{
      assignment_id: string;
      title: string;
      priority_score: number;
    }>;
    performanceTrends: Record<string, {
      trend: 'improving' | 'stable' | 'declining';
      recent_success_rate: number;
      confidence: number;
    }>;
    nextSessionSuggestion: {
      duration: number;
      subject: string;
      topics: string[];
      reasoning: string;
    };
    timeEstimates: Record<string, number>; // subject -> avg completion time multiplier
  };

  // Summary stats
  summary: {
    total_study_hours_this_week: number;
    total_study_hours_this_month: number;
    upcoming_exams_count: number;
    pending_assignments_count: number;
    overall_success_rate: number;
    goals_on_track: number;
    goals_behind: number;
  };
}

export class StudyAssistantContextService {
  /**
   * Aggregates all student data and runs ML models
   */
  async buildContext(studentId: string): Promise<StudentContext> {
    try {
      // Fetch all data in parallel
      const [
        student,
        exams,
        assignments,
        goals,
        studySessions,
        taskHistory
      ] = await Promise.all([
        this.getStudent(studentId),
        this.getUpcomingExams(studentId),
        this.getPendingAssignments(studentId),
        this.getGoals(studentId),
        this.getRecentStudySessions(studentId),
        this.getTaskHistory(studentId)
      ]);

      // Run ML predictions
      const predictions = this.runMLPredictions(
        exams,
        assignments,
        studySessions,
        taskHistory
      );

      // Calculate summary stats
      const summary = this.calculateSummary(
        studySessions,
        taskHistory,
        exams,
        assignments,
        goals
      );

      return {
        student,
        exams,
        assignments,
        goals,
        studySessions,
        taskHistory,
        predictions,
        summary
      };
    } catch (error) {
      console.error('Error building context:', error);
      // Return empty context on error
      return {
        student: { id: studentId, name: 'Student' },
        exams: [],
        assignments: [],
        goals: [],
        studySessions: [],
        taskHistory: [],
        predictions: {
          examPriorities: [],
          assignmentPriorities: [],
          performanceTrends: {},
          nextSessionSuggestion: {
            duration: 25,
            subject: 'Getting Started',
            topics: [],
            reasoning: 'Start your first study session'
          },
          timeEstimates: {}
        },
        summary: {
          total_study_hours_this_week: 0,
          total_study_hours_this_month: 0,
          upcoming_exams_count: 0,
          pending_assignments_count: 0,
          overall_success_rate: 0,
          goals_on_track: 0,
          goals_behind: 0
        }
      };
    }
  }

  private async getStudent(studentId: string) {
    try {
      const result = await db.query(
        'SELECT id, full_name as name FROM users WHERE id = $1',
        [studentId]
      );
      return result.rows[0] || { id: studentId, name: 'Student' };
    } catch (error) {
      console.warn('Users table not found or error fetching user:', error);
      return { id: studentId, name: 'Student' };
    }
  }

  private async getUpcomingExams(studentId: string) {
    try {
      const result = await db.query(`
        SELECT
          e.id,
          COALESCE(s.name, 'Unknown Subject') as subject,
          COALESCE(e.exam_type, 'Exam') as title,
          COALESCE(e.exam_type, 'Exam') as exam_type,
          e.exam_date,
          e.units,
          e.start_time,
          e.finish_time,
          50 as weight,
          EXTRACT(DAY FROM (e.exam_date - NOW())) as days_until
        FROM exams e
        LEFT JOIN subjects s ON e.subject_id = s.id
        WHERE e.user_id = $1
          AND e.exam_date > NOW()
        ORDER BY e.exam_date ASC
        LIMIT 20
      `, [studentId]);

      return result.rows.map(row => ({
        ...row,
        exam_date: new Date(row.exam_date),
        days_until: parseFloat(row.days_until),
        units: row.units || [],
        start_time: row.start_time,
        finish_time: row.finish_time
      }));
    } catch (error) {
      console.warn('Exams table not found or error fetching exams:', error);
      return [];
    }
  }

  private async getPendingAssignments(studentId: string) {
    try {
      const result = await db.query(`
        SELECT
          id,
          subject_name as subject,
          title,
          scheduled_date as due_date,
          estimated_minutes / 60.0 as estimated_hours,
          COALESCE(progress_percentage, 0) as completion_percentage,
          topic,
          scheduled_time
        FROM ai_assignments
        WHERE user_id = $1
          AND status IN ('pending', 'in_progress')
        ORDER BY scheduled_date ASC, scheduled_time ASC
        LIMIT 20
      `, [studentId]);

      return result.rows.map((row: any) => {
        const dueDate = new Date(`${row.due_date}T${row.scheduled_time || '00:00:00'}`);
        const now = new Date();
        const hoursUntil = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        return {
          id: row.id, // This will be the UUID from the database
          subject: row.subject,
          subject_name: row.subject,
          topic: row.topic,
          title: row.title || `${row.subject} - ${row.topic}`,
          due_date: dueDate,
          estimated_hours: row.estimated_hours || 1,
          completion_percentage: row.completion_percentage,
          hours_until: hoursUntil
        };
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  private async getGoals(studentId: string) {
    // Student goals table doesn't exist yet - return empty array
    console.warn('Student goals feature not yet implemented in database');
    return [];
  }

  private async getRecentStudySessions(studentId: string) {
    try {
      const result = await db.query(`
        SELECT
          COALESCE(s.name, 'Unknown Subject') as subject,
          ss.duration_minutes,
          ARRAY[]::text[] as topics_covered,
          ss.created_at
        FROM study_sessions ss
        LEFT JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.user_id = $1
          AND ss.created_at > NOW() - INTERVAL '30 days'
        ORDER BY ss.created_at DESC
        LIMIT 100
      `, [studentId]);

      return result.rows.map(row => ({
        ...row,
        created_at: new Date(row.created_at),
        duration_minutes: row.duration_minutes || 0,
        topics_covered: row.topics_covered || []
      }));
    } catch (error) {
      console.warn('Study sessions table not found or error fetching sessions:', error);
      return [];
    }
  }

  private async getTaskHistory(studentId: string) {
    try {
      const result = await db.query(`
        SELECT
          subject,
          topic,
          difficulty,
          is_correct,
          actual_time_seconds as time_spent_seconds,
          estimated_time_minutes,
          created_at
        FROM practice_tasks
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '60 days'
        ORDER BY created_at DESC
        LIMIT 500
      `, [studentId]);

      return result.rows.map(row => ({
        ...row,
        created_at: new Date(row.created_at),
        time_spent_seconds: row.time_spent_seconds || 0,
        is_correct: row.is_correct || false
      }));
    } catch (error) {
      console.warn('Task history not found or error fetching tasks:', error);
      return [];
    }
  }

  private runMLPredictions(exams: any[], assignments: any[], sessions: any[], taskHistory: any[]) {
    // Exam priorities and predictions
    const examPriorities = exams.map(exam => {
      const priorityData = priorityScorer.scoreExam(exam, taskHistory, sessions);
      const prepTime = timeEstimator.predictExamPrepTime(exam, taskHistory, sessions);
      const performance = performanceAnalyzer.predictExamPerformance(exam, taskHistory);

      return {
        exam_id: exam.id,
        title: exam.title,
        priority_score: priorityData.score,
        predicted_prep_hours: prepTime.hours,
        predicted_performance: performance.predictedGrade,
        outlook: performance.outlook
      };
    });

    // Assignment priorities
    const assignmentPriorities = assignments.map(assignment => {
      const priorityData = priorityScorer.scoreAssignment(assignment);

      return {
        assignment_id: assignment.id,
        title: assignment.title,
        priority_score: priorityData.score
      };
    });

    // Performance trends by subject
    const subjects = [...new Set(taskHistory.map(t => t.subject))];
    const performanceTrends: Record<string, any> = {};

    subjects.forEach(subject => {
      const trend = performanceAnalyzer.analyzeTrend(taskHistory, subject);
      performanceTrends[subject] = {
        trend: trend.trend,
        recent_success_rate: Math.round(trend.recentSuccessRate * 100),
        confidence: Math.round(trend.confidence * 100)
      };
    });

    // Next session suggestion
    const nextSessionSuggestion = sessionOptimizer.suggestNextSession(
      taskHistory,
      sessions,
      exams
    );

    // Time estimate multipliers by subject
    const timeEstimates: Record<string, number> = {};
    subjects.forEach(subject => {
      const subjectHistory = taskHistory.filter(t => t.subject === subject);
      if (subjectHistory.length > 0) {
        const avgActual = subjectHistory.reduce((sum, t) => sum + t.time_spent_seconds / 60, 0) / subjectHistory.length;
        const avgEstimated = subjectHistory.reduce((sum, t) => sum + t.estimated_time_minutes, 0) / subjectHistory.length;
        timeEstimates[subject] = avgActual / avgEstimated;
      }
    });

    return {
      examPriorities: examPriorities.sort((a, b) => b.priority_score - a.priority_score),
      assignmentPriorities: assignmentPriorities.sort((a, b) => b.priority_score - a.priority_score),
      performanceTrends,
      nextSessionSuggestion: {
        duration: nextSessionSuggestion.recommendedDuration,
        subject: nextSessionSuggestion.suggestedSubject,
        topics: nextSessionSuggestion.suggestedTopics,
        reasoning: nextSessionSuggestion.reasoning
      },
      timeEstimates
    };
  }

  private calculateSummary(
    sessions: any[],
    taskHistory: any[],
    exams: any[],
    assignments: any[],
    goals: any[]
  ) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weekSessions = sessions.filter(s => s.created_at > oneWeekAgo);
    const monthSessions = sessions.filter(s => s.created_at > oneMonthAgo);

    const total_study_hours_this_week = weekSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;
    const total_study_hours_this_month = monthSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60;

    const upcoming_exams_count = exams.length;
    const pending_assignments_count = assignments.filter(a => a.completion_percentage < 100).length;

    const overall_success_rate = taskHistory.length > 0
      ? (taskHistory.filter(t => t.is_correct).length / taskHistory.length) * 100
      : 0;

    const goals_on_track = goals.filter(g => g.progress_percentage >= 70).length;
    const goals_behind = goals.filter(g => g.progress_percentage < 70).length;

    return {
      total_study_hours_this_week: Math.round(total_study_hours_this_week * 10) / 10,
      total_study_hours_this_month: Math.round(total_study_hours_this_month * 10) / 10,
      upcoming_exams_count,
      pending_assignments_count,
      overall_success_rate: Math.round(overall_success_rate),
      goals_on_track,
      goals_behind
    };
  }

  /**
   * Converts context to a concise text format for LLM
   */
  formatContextForLLM(context: StudentContext): string {
    return `
# STUDENT CONTEXT

## Summary
- Study time this week: ${context.summary.total_study_hours_this_week}h
- Study time this month: ${context.summary.total_study_hours_this_month}h
- Overall success rate: ${context.summary.overall_success_rate}%
- Upcoming exams: ${context.summary.upcoming_exams_count}
- Pending assignments: ${context.summary.pending_assignments_count}
- Goals on track: ${context.summary.goals_on_track} | Behind: ${context.summary.goals_behind}

## Complete Exam Schedule (All Upcoming Exams)
${context.exams.length > 0 ? context.exams.map(exam => {
  const unitsText = exam.units && exam.units.length > 0 ? exam.units.join(', ') : 'No specific topics';
  const examDate = new Date(exam.exam_date);
  const dateStr = examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = exam.start_time && exam.finish_time
    ? `${exam.start_time} - ${exam.finish_time}`
    : exam.start_time
    ? `Starts at ${exam.start_time}`
    : 'Time TBD';
  const priority = context.predictions.examPriorities.find(e => e.exam_id === exam.id);

  return `- **${exam.subject} - ${exam.exam_type}**
    * Date: ${dateStr} (${exam.days_until.toFixed(0)} days away)
    * Time: ${timeStr}
    * Topics/Units: ${unitsText}
    ${priority ? `* ML Priority Score: ${priority.priority_score}/100
    * Predicted prep needed: ${priority.predicted_prep_hours}h
    * Expected performance: ${priority.predicted_performance}% (${priority.outlook})` : ''}
`;
}).join('\n') : 'No upcoming exams scheduled.'}

## Pending Assignments (Top 5)
${context.predictions.assignmentPriorities.slice(0, 5).map(a => {
  const assignment = context.assignments.find(as => as.id === a.assignment_id);
  return `- [ID: ${a.assignment_id}] ${a.title} (Priority: ${a.priority_score}/100, ${assignment?.hours_until.toFixed(0)}h until due)
    * Subject: ${assignment?.subject_name}
    * Topic: ${assignment?.topic || 'General'}
    * Completion: ${assignment?.completion_percentage}%
`;
}).join('\n')}

## Performance Trends
${Object.entries(context.predictions.performanceTrends).map(([subject, trend]) =>
  `- ${subject}: ${trend.trend.toUpperCase()} (${trend.recent_success_rate}% success rate)
`).join('\n')}

## Goals
${context.goals.slice(0, 5).map(g =>
  `- ${g.subject}: ${g.goal_type} target ${g.target_value} (${g.progress_percentage}% progress, current: ${g.current_value})
`).join('\n')}

## ML Recommendation for Next Session
- Duration: ${context.predictions.nextSessionSuggestion.duration} minutes
- Subject: ${context.predictions.nextSessionSuggestion.subject}
- Suggested topics: ${context.predictions.nextSessionSuggestion.topics.join(', ')}
- Reasoning: ${context.predictions.nextSessionSuggestion.reasoning}
`.trim();
  }
}

export const assistantContext = new StudyAssistantContextService();
