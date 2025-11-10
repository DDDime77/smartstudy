import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/api/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = `
      SELECT * FROM ai_assignments
      WHERE user_id = $1
    `;
    const params: any[] = [user.id];

    if (start && end) {
      query += ` AND scheduled_date BETWEEN $2 AND $3`;
      params.push(start, end);
    }

    query += ` ORDER BY scheduled_date ASC, scheduled_time ASC`;

    const result = await db.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    const body = await req.json();

    const {
      subject_id,
      title,
      subject_name,
      topic,
      difficulty,
      scheduled_date,
      scheduled_time,
      estimated_minutes,
      required_tasks_count = 5,
    } = body;

    if (!title || !topic || !difficulty || !scheduled_date || !estimated_minutes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO ai_assignments (
        user_id, subject_id, title, subject_name, topic, difficulty,
        scheduled_date, scheduled_time, estimated_minutes, required_tasks_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        user.id,
        subject_id || null,
        title,
        subject_name || null,
        topic,
        difficulty,
        scheduled_date,
        scheduled_time || null,
        estimated_minutes,
        required_tasks_count,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment', details: error.message },
      { status: 500 }
    );
  }
}
