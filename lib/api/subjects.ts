import { ApiClient } from './client';
import { SubjectResponse, SubjectInput, UpdateSubject } from './onboarding';

export interface SubjectStats {
  subject_id: string;
  subject_name: string;
  subject_level: string | null;
  subject_color: string | null;
  current_grade: string | null;
  target_grade: string | null;
  total_study_hours: number;
  study_hours_this_week: number;
  study_hours_this_month: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  total_sessions: number;
  average_focus_rating: number | null;
}

export const SubjectsService = {
  async getAll(): Promise<SubjectResponse[]> {
    return ApiClient.get<SubjectResponse[]>('/subjects');
  },

  async getById(subjectId: string): Promise<SubjectResponse> {
    return ApiClient.get<SubjectResponse>(`/subjects/${subjectId}`);
  },

  async getStats(subjectId: string): Promise<SubjectStats> {
    return ApiClient.get<SubjectStats>(`/subjects/${subjectId}/stats`);
  },

  async update(subjectId: string, data: UpdateSubject): Promise<SubjectResponse> {
    return ApiClient.put<SubjectResponse>(`/subjects/${subjectId}`, data);
  },

  async delete(subjectId: string): Promise<void> {
    return ApiClient.delete(`/subjects/${subjectId}`);
  },
};
