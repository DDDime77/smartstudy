import { ApiClient } from './client';

export interface SubjectInput {
  id?: string;
  name: string;
  level?: string;
  category?: string;
  current_grade?: string;
  target_grade?: string;
  color?: string;
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
  import_method: string;
  subjects: SubjectInput[];
  availability: DayAvailability[];
  study_goal?: string;
}

export interface ProfileResponse {
  id: string;
  user_id: string;
  education_system: string;
  education_program: string | null;
  timezone: string;
  study_goal: string | null;
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
};
