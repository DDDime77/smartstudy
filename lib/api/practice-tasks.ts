import { ApiClient } from './client';

export interface PracticeTask {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  difficulty: string;
  difficulty_numeric?: number;
  task_content: string;
  solution_content: string;
  answer_content: string;
  estimated_time_minutes?: number;
  actual_time_seconds?: number;
  completed: boolean;
  completed_at?: string;
  is_correct?: boolean;
  study_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePracticeTask {
  subject: string;
  topic: string;
  difficulty: string;
  task_content: string;
  solution_content: string;
  answer_content: string;
  estimated_time_minutes?: number;
  study_session_id?: string;
}

export interface UpdatePracticeTask {
  actual_time_seconds?: number;
  completed?: boolean;
  is_correct?: boolean;
  study_session_id?: string;
}

export const PracticeTasksService = {
  /**
   * Create a new practice task
   */
  async create(data: CreatePracticeTask): Promise<PracticeTask> {
    return ApiClient.post('/practice-tasks', data);
  },

  /**
   * Get all practice tasks with optional filtering
   */
  async getAll(params?: { subject?: string; topic?: string; limit?: number }): Promise<PracticeTask[]> {
    const queryParams = new URLSearchParams();
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.topic) queryParams.append('topic', params.topic);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/practice-tasks?${queryString}` : '/practice-tasks';
    return ApiClient.get(endpoint);
  },

  /**
   * Get latest task for a specific subject
   */
  async getLatestForSubject(subject: string): Promise<PracticeTask> {
    return ApiClient.get(`/practice-tasks/subject/${encodeURIComponent(subject)}/latest`);
  },

  /**
   * Get a specific practice task by ID
   */
  async getById(taskId: string): Promise<PracticeTask> {
    return ApiClient.get(`/practice-tasks/${taskId}`);
  },

  /**
   * Update a practice task (mark correct/incorrect, add completion time, etc.)
   */
  async update(taskId: string, data: UpdatePracticeTask): Promise<PracticeTask> {
    return ApiClient.patch(`/practice-tasks/${taskId}`, data);
  },

  /**
   * Delete a practice task
   */
  async delete(taskId: string): Promise<void> {
    return ApiClient.delete(`/practice-tasks/${taskId}`);
  },
};
