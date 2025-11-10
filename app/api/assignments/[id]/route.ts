import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/api/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    const { id } = params;

    const result = await db.query(
      'SELECT * FROM ai_assignments WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    const { id } = params;
    const body = await req.json();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'title',
      'topic',
      'difficulty',
      'scheduled_date',
      'scheduled_time',
      'estimated_minutes',
      'required_tasks_count',
      'status',
      'tasks_completed',
      'time_spent_minutes',
      'progress_percentage',
      'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(body[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add completed_at if status is being changed to completed
    if (body.status === 'completed') {
      updates.push(`completed_at = NOW()`);
    }

    values.push(id, user.id);

    const result = await db.query(
      `UPDATE ai_assignments
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    const { id } = params;

    const result = await db.query(
      'DELETE FROM ai_assignments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment', details: error.message },
      { status: 500 }
    );
  }
}
