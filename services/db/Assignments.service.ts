import { db } from '@/lib/db';

export interface Assignment {
  id: string;
  student_id: string;
  subject: string;
  title: string;
  description?: string;
  due_date: Date;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_percentage: number;
  created_at: Date;
  completed_at?: Date;
}

export class AssignmentsService {
  static async create(data: {
    student_id: string;
    subject: string;
    title: string;
    description?: string;
    due_date: Date;
    estimated_hours: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<Assignment> {
    const result = await db.query(
      `INSERT INTO assignments (student_id, subject, title, description, due_date, estimated_hours, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.student_id,
        data.subject,
        data.title,
        data.description,
        data.due_date,
        data.estimated_hours,
        data.priority || 'medium'
      ]
    );
    return result.rows[0];
  }

  static async getByStudent(studentId: string): Promise<Assignment[]> {
    const result = await db.query(
      `SELECT * FROM assignments WHERE student_id = $1 ORDER BY due_date ASC`,
      [studentId]
    );
    return result.rows;
  }

  static async updateProgress(id: string, percentage: number): Promise<Assignment> {
    const status = percentage >= 100 ? 'completed' : 'in_progress';
    const result = await db.query(
      `UPDATE assignments
       SET completion_percentage = $1, status = $2, completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END
       WHERE id = $3
       RETURNING *`,
      [percentage, status, id]
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await db.query('DELETE FROM assignments WHERE id = $1', [id]);
  }
}
