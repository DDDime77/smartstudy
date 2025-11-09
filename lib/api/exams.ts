import { ApiClient } from './client';

export interface ExamInput {
  subject_id: string;
  exam_date: string; // ISO date format YYYY-MM-DD
  exam_type: string; // Paper type (Paper 1, Paper 2, IA, etc.)
  units?: string[]; // Units covered in exam (max 5)
}

export interface UpdateExam {
  subject_id?: string;
  exam_date?: string;
  exam_type?: string;
  units?: string[];
}

export interface ExamResponse {
  id: string;
  user_id: string;
  subject_id: string;
  exam_date: string;
  exam_type: string;
  units: string[] | null;
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
