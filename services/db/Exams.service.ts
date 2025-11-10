import { db } from '@/lib/db';

export interface Exam {
  id: string;
  student_id: string;
  subject: string;
  title: string;
  description?: string;
  exam_date: Date;
  weight: number;
  status: 'upcoming' | 'in_progress' | 'completed';
  created_at: Date;
}

export class ExamsService {
  static async create(data: {
    student_id: string;
    subject: string;
    title: string;
    description?: string;
    exam_date: Date;
    weight: number;
  }): Promise<Exam> {
    const result = await db.query(
      `INSERT INTO exams (student_id, subject, title, description, exam_date, weight)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.student_id, data.subject, data.title, data.description, data.exam_date, data.weight]
    );
    return result.rows[0];
  }

  static async getByStudent(studentId: string): Promise<Exam[]> {
    const result = await db.query(
      `SELECT * FROM exams WHERE student_id = $1 ORDER BY exam_date ASC`,
      [studentId]
    );
    return result.rows;
  }

  static async updateStatus(id: string, status: 'upcoming' | 'in_progress' | 'completed'): Promise<Exam> {
    const result = await db.query(
      `UPDATE exams SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await db.query('DELETE FROM exams WHERE id = $1', [id]);
  }
}
