import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/api/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    const { id } = params;
    const body = await req.json();

    const { tasks_completed, time_spent_minutes } = body;

    if (tasks_completed === undefined && time_spent_minutes === undefined) {
      return NextResponse.json(
        { error: 'Missing progress data' },
        { status: 400 }
      );
    }

    // Get current assignment data
    const current = await db.query(
      'SELECT * FROM ai_assignments WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (current.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = current.rows[0];
    const newTasksCompleted = tasks_completed ?? assignment.tasks_completed;
    const newTimeSpent = time_spent_minutes ?? assignment.time_spent_minutes;

    // Calculate progress percentage
    const taskProgress = (newTasksCompleted / assignment.required_tasks_count) * 100;
    const timeProgress = (newTimeSpent / assignment.estimated_minutes) * 100;
    const progressPercentage = Math.min(100, Math.round((taskProgress + timeProgress) / 2));

    // Determine status
    let newStatus = assignment.status;
    if (newStatus === 'pending' && (newTasksCompleted > 0 || newTimeSpent > 0)) {
      newStatus = 'in_progress';
    }
    if (
      newTasksCompleted >= assignment.required_tasks_count &&
      newTimeSpent >= assignment.estimated_minutes
    ) {
      newStatus = 'completed';
    }

    const result = await db.query(
      `UPDATE ai_assignments
       SET tasks_completed = $1,
           time_spent_minutes = $2,
           progress_percentage = $3,
           status = $4,
           completed_at = CASE WHEN $4 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [newTasksCompleted, newTimeSpent, progressPercentage, newStatus, id, user.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating assignment progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress', details: error.message },
      { status: 500 }
    );
  }
}
