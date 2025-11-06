import { ApiClient } from './client';

export interface ExamInput {
  subject_id: string;
  exam_date: string; // ISO date format YYYY-MM-DD
  exam_type: string; // Paper 1, Paper 2, Paper 3, IA, etc.
  title?: string;
  description?: string;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  duration_minutes?: string;
  location?: string;
}

export interface UpdateExam {
  subject_id?: string;
  exam_date?: string;
  exam_type?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: string;
  location?: string;
}

export interface ExamResponse {
  id: string;
  user_id: string;
  subject_id: string;
  exam_date: string;
  exam_type: string;
  title: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: string | null;
  location: string | null;
}

export const ExamsService = {
  async getAll(): Promise<ExamResponse[]> {
    return ApiClient.get<ExamResponse[]>('/exams');
  },

  async getById(examId: string): Promise<ExamResponse> {
    return ApiClient.get<ExamResponse>(`/exams/${examId}`);
  },

  async getByDateRange(startDate?: string, endDate?: string): Promise<ExamResponse[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return ApiClient.get<ExamResponse[]>(`/exams/by-date${queryString ? '?' + queryString : ''}`);
  },

  async create(data: ExamInput): Promise<ExamResponse> {
    return ApiClient.post<ExamResponse>('/exams', data);
  },

  async update(examId: string, data: UpdateExam): Promise<ExamResponse> {
    return ApiClient.put<ExamResponse>(`/exams/${examId}`, data);
  },

  async delete(examId: string): Promise<void> {
    return ApiClient.delete(`/exams/${examId}`);
  },
};
