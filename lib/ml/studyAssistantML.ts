/**
 * Lightweight ML models for Study Assistant
 * These run fast and provide predictions to feed into the LLM
 */

interface StudySession {
  id: string;
  subject: string;
  duration_minutes: number;
  topics_covered: string[];
  created_at: Date;
}

interface TaskAttempt {
  subject: string;
  topic: string;
  difficulty: string;
  is_correct: boolean;
  time_spent_seconds: number;
  estimated_time_minutes: number;
  created_at: Date;
}

interface Exam {
  id: string;
  subject: string;
  title: string;
  exam_date: Date;
  weight: number;
}

interface Assignment {
  id: string;
  subject: string;
  title: string;
  due_date: Date;
  estimated_hours: number;
  priority: string;
  completion_percentage: number;
}

interface Goal {
  subject: string;
  goal_type: string;
  target_value: string;
  current_value: string;
  progress_percentage: number;
}

// ============================================================================
// 1. PERSONALIZED TIME ESTIMATOR
// ============================================================================

export class PersonalizedTimeEstimator {
  /**
   * Predicts how long a student will take on a task
   * Uses simple moving average with exponential weighting
   */
  predictTaskTime(
    baseEstimate: number,
    subject: string,
    difficulty: string,
    studentHistory: TaskAttempt[]
  ): { estimate: number; confidence: number } {
    const relevant = studentHistory.filter(
      a => a.subject === subject && a.difficulty === difficulty
    );

    if (relevant.length < 2) {
      return { estimate: baseEstimate, confidence: 0.3 };
    }

    // Calculate exponentially weighted average (recent tasks weighted more)
    let weightedSum = 0;
    let weightSum = 0;

    relevant.slice(-10).forEach((task, idx) => {
      const weight = Math.exp(idx / 5); // Recent tasks have higher weight
      const actualMinutes = task.time_spent_seconds / 60;
      weightedSum += actualMinutes * weight;
      weightSum += weight;
    });

    const avgActual = weightedSum / weightSum;

    // Blend with base estimate (regression to mean)
    const confidence = Math.min(relevant.length / 10, 0.9);
    const estimate = avgActual * confidence + baseEstimate * (1 - confidence);

    return {
      estimate: Math.round(estimate),
      confidence
    };
  }

  /**
   * Predict total study time needed for an exam
   */
  predictExamPrepTime(
    exam: Exam,
    studentHistory: TaskAttempt[],
    sessions: StudySession[]
  ): { hours: number; confidence: number } {
    const subjectHistory = studentHistory.filter(a => a.subject === exam.subject);
    const subjectSessions = sessions.filter(s => s.subject === exam.subject);

    if (subjectHistory.length < 5) {
      // Not enough data - use heuristic
      return { hours: exam.weight * 0.2, confidence: 0.2 }; // 20% of weight = hours
    }

    // Calculate average success rate
    const successRate = subjectHistory.filter(a => a.is_correct).length / subjectHistory.length;

    // Base time: inversely proportional to success rate
    // If 90% success → need less time (0.5x)
    // If 50% success → need more time (2x)
    const difficultyMultiplier = 1 / (successRate + 0.2);

    // Weight-based estimate
    const baseHours = exam.weight * 0.15; // 15% rule of thumb

    const estimatedHours = baseHours * difficultyMultiplier;

    return {
      hours: Math.round(estimatedHours * 10) / 10,
      confidence: Math.min(subjectHistory.length / 20, 0.8)
    };
  }
}

// ============================================================================
// 2. PERFORMANCE TREND ANALYZER
// ============================================================================

export class PerformanceTrendAnalyzer {
  /**
   * Analyzes if student's performance is improving, declining, or stable
   * Uses simple linear regression
   */
  analyzeTrend(
    studentHistory: TaskAttempt[],
    subject?: string
  ): {
    trend: 'improving' | 'stable' | 'declining';
    slope: number;
    recentSuccessRate: number;
    confidence: number;
  } {
    let history = studentHistory;
    if (subject) {
      history = studentHistory.filter(a => a.subject === subject);
    }

    if (history.length < 5) {
      return {
        trend: 'stable',
        slope: 0,
        recentSuccessRate: 0.5,
        confidence: 0.1
      };
    }

    // Use last 20 attempts for trend
    const recent = history.slice(-20);

    // Linear regression on success rate over time
    const points = recent.map((a, idx) => ({
      x: idx,
      y: a.is_correct ? 1 : 0
    }));

    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const recentSuccessRate = sumY / n;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining';
    if (slope > 0.02) trend = 'improving';
    else if (slope < -0.02) trend = 'declining';
    else trend = 'stable';

    return {
      trend,
      slope,
      recentSuccessRate,
      confidence: Math.min(history.length / 30, 0.9)
    };
  }

  /**
   * Predict performance on upcoming exam
   */
  predictExamPerformance(
    exam: Exam,
    studentHistory: TaskAttempt[]
  ): { predictedGrade: number; confidence: number; outlook: string } {
    const subjectHistory = studentHistory.filter(a => a.subject === exam.subject);

    if (subjectHistory.length < 3) {
      return {
        predictedGrade: 70,
        confidence: 0.1,
        outlook: 'insufficient data'
      };
    }

    const trend = this.analyzeTrend(subjectHistory);

    // Base prediction on recent success rate
    let predictedGrade = trend.recentSuccessRate * 100;

    // Adjust for trend
    if (trend.trend === 'improving') {
      predictedGrade += 5;
    } else if (trend.trend === 'declining') {
      predictedGrade -= 5;
    }

    // Determine outlook
    let outlook: string;
    if (predictedGrade >= 85) outlook = 'excellent';
    else if (predictedGrade >= 75) outlook = 'good';
    else if (predictedGrade >= 65) outlook = 'concerning';
    else outlook = 'needs urgent attention';

    return {
      predictedGrade: Math.round(predictedGrade),
      confidence: trend.confidence,
      outlook
    };
  }
}

// ============================================================================
// 3. PRIORITY SCORER
// ============================================================================

export class PriorityScorer {
  /**
   * Scores tasks/exams/assignments by urgency and importance
   * Returns 0-100 priority score
   */
  scoreExam(
    exam: Exam,
    studentHistory: TaskAttempt[],
    currentPreparation: StudySession[]
  ): { score: number; factors: Record<string, number> } {
    const now = new Date();
    const daysUntil = (exam.exam_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Factor 1: Urgency (0-40 points)
    let urgencyScore = 0;
    if (daysUntil < 1) urgencyScore = 40;
    else if (daysUntil < 3) urgencyScore = 35;
    else if (daysUntil < 7) urgencyScore = 30;
    else if (daysUntil < 14) urgencyScore = 20;
    else if (daysUntil < 30) urgencyScore = 10;

    // Factor 2: Weight/Importance (0-30 points)
    const weightScore = (exam.weight / 100) * 30;

    // Factor 3: Preparation Gap (0-30 points)
    const subjectSessions = currentPreparation.filter(s => s.subject === exam.subject);
    const totalPrepMinutes = subjectSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const estimator = new PersonalizedTimeEstimator();
    const needed = estimator.predictExamPrepTime(exam, studentHistory, currentPreparation);
    const gapScore = Math.min(30, Math.max(0, (needed.hours * 60 - totalPrepMinutes) / 60 * 5));

    const totalScore = urgencyScore + weightScore + gapScore;

    return {
      score: Math.min(100, Math.round(totalScore)),
      factors: {
        urgency: urgencyScore,
        weight: weightScore,
        preparationGap: gapScore
      }
    };
  }

  scoreAssignment(
    assignment: Assignment
  ): { score: number; factors: Record<string, number> } {
    const now = new Date();
    const hoursUntil = (assignment.due_date.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Factor 1: Urgency (0-40 points)
    let urgencyScore = 0;
    if (hoursUntil < 6) urgencyScore = 40;
    else if (hoursUntil < 24) urgencyScore = 35;
    else if (hoursUntil < 72) urgencyScore = 30;
    else if (hoursUntil < 168) urgencyScore = 20; // 1 week
    else urgencyScore = 10;

    // Factor 2: Completion status (0-30 points)
    const completionScore = (1 - assignment.completion_percentage / 100) * 30;

    // Factor 3: Estimated effort (0-30 points)
    const effortScore = Math.min(30, (assignment.estimated_hours || 2) * 5);

    const totalScore = urgencyScore + completionScore + effortScore;

    return {
      score: Math.min(100, Math.round(totalScore)),
      factors: {
        urgency: urgencyScore,
        completion: completionScore,
        effort: effortScore
      }
    };
  }

  /**
   * Rank all tasks by priority
   */
  rankTasks(
    exams: Exam[],
    assignments: Assignment[],
    studentHistory: TaskAttempt[],
    sessions: StudySession[]
  ): Array<{
    type: 'exam' | 'assignment';
    id: string;
    title: string;
    score: number;
    factors: Record<string, number>;
  }> {
    const rankedExams = exams.map(exam => ({
      type: 'exam' as const,
      id: exam.id,
      title: `${exam.subject}: ${exam.title}`,
      ...this.scoreExam(exam, studentHistory, sessions)
    }));

    const rankedAssignments = assignments.map(assignment => ({
      type: 'assignment' as const,
      id: assignment.id,
      title: `${assignment.subject}: ${assignment.title}`,
      ...this.scoreAssignment(assignment)
    }));

    return [...rankedExams, ...rankedAssignments]
      .sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 4. STUDY SESSION OPTIMIZER
// ============================================================================

export class StudySessionOptimizer {
  /**
   * Suggests optimal study session duration and topics
   * Based on spaced repetition and cognitive load theory
   */
  suggestNextSession(
    studentHistory: TaskAttempt[],
    sessions: StudySession[],
    upcomingExams: Exam[]
  ): {
    recommendedDuration: number;
    suggestedSubject: string;
    suggestedTopics: string[];
    reasoning: string;
  } {
    // Optimal study session: 25-50 minutes (Pomodoro-based)
    const recentSessions = sessions.slice(-5);
    const avgDuration = recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / recentSessions.length
      : 30;

    // Adjust based on effectiveness
    let recommendedDuration = avgDuration;
    if (avgDuration < 20) recommendedDuration = 25;
    else if (avgDuration > 60) recommendedDuration = 45; // Prevent burnout

    // Find subject that needs attention
    const subjectPerformance = new Map<string, number>();
    studentHistory.forEach(task => {
      const current = subjectPerformance.get(task.subject) || { correct: 0, total: 0 };
      subjectPerformance.set(task.subject, {
        correct: current.correct + (task.is_correct ? 1 : 0),
        total: current.total + 1
      });
    });

    // Priority: upcoming exams with low performance
    let suggestedSubject = '';
    let maxPriority = 0;

    upcomingExams.forEach(exam => {
      const perf = subjectPerformance.get(exam.subject);
      if (!perf) {
        suggestedSubject = exam.subject;
        return;
      }

      const successRate = perf.correct / perf.total;
      const daysUntil = (exam.exam_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      // Priority = urgency * need
      const priority = (1 / Math.max(daysUntil, 0.5)) * (1 - successRate) * exam.weight;

      if (priority > maxPriority) {
        maxPriority = priority;
        suggestedSubject = exam.subject;
      }
    });

    // Find topics within subject that need review
    const subjectHistory = studentHistory.filter(a => a.subject === suggestedSubject);
    const topicPerformance = new Map<string, { correct: number; total: number; lastSeen: Date }>();

    subjectHistory.forEach(task => {
      const current = topicPerformance.get(task.topic) || { correct: 0, total: 0, lastSeen: task.created_at };
      topicPerformance.set(task.topic, {
        correct: current.correct + (task.is_correct ? 1 : 0),
        total: current.total + 1,
        lastSeen: task.created_at > current.lastSeen ? task.created_at : current.lastSeen
      });
    });

    // Suggest topics: low performance OR not seen recently
    const suggestedTopics = Array.from(topicPerformance.entries())
      .map(([topic, stats]) => ({
        topic,
        successRate: stats.correct / stats.total,
        daysSince: (Date.now() - stats.lastSeen.getTime()) / (1000 * 60 * 60 * 24),
        needScore: (1 - stats.correct / stats.total) + (stats.daysSince / 7) // Need = low perf + time since
      }))
      .sort((a, b) => b.needScore - a.needScore)
      .slice(0, 3)
      .map(t => t.topic);

    return {
      recommendedDuration: Math.round(recommendedDuration),
      suggestedSubject: suggestedSubject || 'General Review',
      suggestedTopics,
      reasoning: `Focus on ${suggestedSubject} - ${
        maxPriority > 5 ? 'urgent exam preparation needed' :
        maxPriority > 2 ? 'moderate preparation recommended' :
        'maintenance and review'
      }`
    };
  }
}

// ============================================================================
// Export singleton instances
// ============================================================================

export const timeEstimator = new PersonalizedTimeEstimator();
export const performanceAnalyzer = new PerformanceTrendAnalyzer();
export const priorityScorer = new PriorityScorer();
export const sessionOptimizer = new StudySessionOptimizer();
