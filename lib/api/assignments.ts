import { ApiClient } from './client';

export interface AIAssignment {
  id: string;
  user_id: string;
  subject_id?: string;
  title: string;
  subject_name?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // HH:MM
  estimated_minutes: number;
  required_tasks_count: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tasks_completed: number;
  time_spent_minutes: number;
  progress_percentage: number;
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  notes?: string;
}

export interface CreateAssignmentInput {
  subject_id?: string;
  title: string;
  subject_name?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scheduled_date: string;
  scheduled_time?: string;
  estimated_minutes: number;
  required_tasks_count?: number;
}

export interface UpdateAssignmentInput {
  title?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scheduled_date?: string;
  scheduled_time?: string;
  estimated_minutes?: number;
  required_tasks_count?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tasks_completed?: number;
  time_spent_minutes?: number;
  progress_percentage?: number;
  notes?: string;
}

export const AssignmentsService = {
  async getAll(): Promise<AIAssignment[]> {
    return ApiClient.get<AIAssignment[]>('/assignments');
  },

  async getById(id: string): Promise<AIAssignment> {
    return ApiClient.get<AIAssignment>(`/assignments/${id}`);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<AIAssignment[]> {
    return ApiClient.get<AIAssignment[]>(`/assignments/range?start=${startDate}&end=${endDate}`);
  },

  async create(data: CreateAssignmentInput): Promise<AIAssignment> {
    return ApiClient.post<AIAssignment>('/assignments', data);
  },

  async update(id: string, data: UpdateAssignmentInput): Promise<AIAssignment> {
    return ApiClient.put<AIAssignment>(`/assignments/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return ApiClient.delete(`/assignments/${id}`);
  },

  async updateProgress(
    id: string,
    tasksCompleted: number,
    timeSpentMinutes: number
  ): Promise<AIAssignment> {
    return ApiClient.put<AIAssignment>(`/assignments/${id}/progress`, {
      tasks_completed: tasksCompleted,
      time_spent_minutes: timeSpentMinutes,
    });
  },
};
