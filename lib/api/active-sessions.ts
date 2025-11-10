import { ApiClient } from './client';

export interface ActiveSession {
  id: string;
  user_id: string;
  session_type: 'assignment' | 'practice' | 'free_study';
  assignment_id?: string;
  subject_id?: string;
  subject_name?: string;
  topic?: string;
  difficulty: string;
  initial_duration_seconds: number;
  elapsed_seconds: number;
  is_running: boolean;
  study_technique: string;
  required_tasks?: number;
  tasks_completed: number;
  estimated_minutes?: number;
  time_spent_minutes: number;
  current_task?: any;
  pending_task_params?: any;
  grade_level?: string;
  study_system: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface CreateSessionRequest {
  session_type: 'assignment' | 'practice' | 'free_study';
  assignment_id?: string;
  subject_id?: string;
  subject_name?: string;
  topic?: string;
  difficulty?: string;
  initial_duration_seconds?: number;
  study_technique?: string;
  required_tasks?: number;
  estimated_minutes?: number;
  tasks_completed?: number;
  time_spent_minutes?: number;
  grade_level?: string;
  study_system?: string;
}

export interface UpdateSessionRequest {
  elapsed_seconds?: number;
  is_running?: boolean;
  tasks_completed?: number;
  time_spent_minutes?: number;
  current_task?: any;
  pending_task_params?: any;
}

export const ActiveSessionsService = {
  /**
   * Get the current user's active study session
   */
  async get(): Promise<ActiveSession | null> {
    return ApiClient.get<ActiveSession | null>('/active-session');
  },

  /**
   * Create or replace the current user's active study session
   */
  async create(data: CreateSessionRequest): Promise<ActiveSession> {
    return ApiClient.post<ActiveSession>('/active-session', data);
  },

  /**
   * Update the current user's active study session
   */
  async update(data: UpdateSessionRequest): Promise<ActiveSession> {
    return ApiClient.patch<ActiveSession>('/active-session', data);
  },

  /**
   * Delete the current user's active study session
   */
  async delete(): Promise<void> {
    return ApiClient.delete('/active-session');
  },
};
