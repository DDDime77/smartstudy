import { ApiClient } from './client';

export interface Course {
  id: string;
  name: string;
  section: string | null;
  description: string | null;
  suggested_level: string | null;
  suggested_category: string | null;
}

export interface ImportSubjectRequest {
  course_id: string;
  course_name: string;
  current_grade: string;
  target_grade: string;
  level: string | null;
  category: string | null;
}

export interface ImportResponse {
  success: boolean;
  message: string;
  subjects: any[];
}

export const GoogleClassroomService = {
  async saveApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    return ApiClient.post('/google-classroom/save-key', { api_key: apiKey });
  },

  async getCourses(): Promise<Course[]> {
    return ApiClient.get<Course[]>('/google-classroom/courses');
  },

  async importSubjects(subjects: ImportSubjectRequest[]): Promise<ImportResponse> {
    return ApiClient.post<ImportResponse>('/google-classroom/import', subjects);
  },

  async disconnect(): Promise<{ success: boolean; message: string }> {
    return ApiClient.delete('/google-classroom/disconnect');
  },
};
