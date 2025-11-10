import { db } from '@/lib/db';

export interface StudentGoal {
  id: string;
  student_id: string;
  subject: string;
  goal_type: string;
  target_value: string;
  current_value: string;
  deadline?: Date;
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export class GoalsService {
  static async create(data: {
    student_id: string;
    subject: string;
    goal_type: string;
    target_value: string;
    current_value?: string;
    deadline?: Date;
  }): Promise<StudentGoal> {
    const result = await db.query(
      `INSERT INTO student_goals (student_id, subject, goal_type, target_value, current_value, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.student_id,
        data.subject,
        data.goal_type,
        data.target_value,
        data.current_value || '0',
        data.deadline
      ]
    );
    return result.rows[0];
  }

  static async getByStudent(studentId: string): Promise<StudentGoal[]> {
    const result = await db.query(
      `SELECT * FROM student_goals WHERE student_id = $1 ORDER BY deadline ASC`,
      [studentId]
    );
    return result.rows;
  }

  static async updateProgress(id: string, currentValue: string, progressPercentage: number): Promise<StudentGoal> {
    const result = await db.query(
      `UPDATE student_goals
       SET current_value = $1, progress_percentage = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [currentValue, progressPercentage, id]
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await db.query('DELETE FROM student_goals WHERE id = $1', [id]);
  }
}
