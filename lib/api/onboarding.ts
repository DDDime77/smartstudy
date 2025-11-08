import { ApiClient } from './client';

export interface SubjectInput {
  id?: string;
  name: string;
  level?: string;
  category?: string;
  current_grade?: string;
  target_grade?: string;
  color?: string;
  priority_coefficient?: number;
}

export interface UpdateSubject {
  name?: string;
  level?: string;
  category?: string;
  current_grade?: string;
  target_grade?: string;
  color?: string;
  priority_coefficient?: number;
}

export interface TimeSlot {
  start: string; // "14:00"
  end: string;   // "16:00"
}

export interface DayAvailability {
  day: number; // 0-6 (Monday=0, Sunday=6)
  slots: TimeSlot[];
}

export interface OnboardingData {
  timezone: string;
  education_system: string;
  education_program: string;
  grade_level?: string; // Grade or year level
  import_method: string;
  subjects: SubjectInput[];
  availability: DayAvailability[];
  study_goal?: number; // Study goal in hours per week
}

export interface ProfileResponse {
  id: string;
  user_id: string;
  education_system: string;
  education_program: string | null;
  timezone: string;
  study_goal: number | null; // Study goal in hours per week
}

export interface SubjectResponse {
  id: string;
  user_id: string;
  name: string;
  level: string | null;
  category: string | null;
  current_grade: string | null;
  target_grade: string | null;
  color: string | null;
}

export interface UpdateProfileData {
  timezone?: string;
  education_system?: string;
  education_program?: string;
  study_goal?: number; // Study goal in hours per week
}

export const OnboardingService = {
  async completeOnboarding(data: OnboardingData): Promise<ProfileResponse> {
    return ApiClient.post<ProfileResponse>('/onboarding/complete', data);
  },

  async getSubjects(): Promise<SubjectResponse[]> {
    return ApiClient.get<SubjectResponse[]>('/onboarding/subjects');
  },

  async getProfile(): Promise<ProfileResponse> {
    return ApiClient.get<ProfileResponse>('/onboarding/profile');
  },

  async updateProfile(data: UpdateProfileData): Promise<ProfileResponse> {
    return ApiClient.put<ProfileResponse>('/onboarding/profile', data);
  },

  async addSubject(subject: SubjectInput): Promise<SubjectResponse> {
    return ApiClient.post<SubjectResponse>('/onboarding/subjects', subject);
  },

  async deleteSubject(subjectId: string): Promise<void> {
    return ApiClient.delete(`/onboarding/subjects/${subjectId}`);
  },
};
