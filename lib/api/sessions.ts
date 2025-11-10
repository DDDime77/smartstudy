import { ApiClient } from './client';

export interface StudySessionCreate {
  subject_id?: string;
  task_id?: string;
  start_time: string;
  focus_rating?: number;
  notes?: string;
}

export interface StudySessionUpdate {
  end_time?: string;
  duration_minutes?: number;
  elapsed_seconds?: number;
  focus_rating?: number;
  break_time_minutes?: number;
  interruptions_count?: number;
  notes?: string;
  is_paused?: boolean;
}

export interface StudySessionResponse {
  id: string;
  user_id: string;
  subject_id?: string;
  task_id?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  focus_rating?: number;
  break_time_minutes: number;
  interruptions_count: number;
  productivity_score?: number;
  notes?: string;
  time_of_day?: string;
  created_at: string;
  subject_name?: string;
  subject_color?: string;
}

export interface WeeklyStats {
  day: string;
  hours: number;
  date: string;
}

export interface WeeklySummary {
  total_sessions: number;
  avg_duration_minutes: number;
  total_hours: number;
}

export const SessionsService = {
  async create(data: StudySessionCreate): Promise<StudySessionResponse> {
    return ApiClient.post<StudySessionResponse>('/sessions', data);
  },

  async update(sessionId: string, data: StudySessionUpdate): Promise<StudySessionResponse> {
    return ApiClient.put<StudySessionResponse>(`/sessions/${sessionId}`, data);
  },

  async getRecent(limit: number = 10): Promise<StudySessionResponse[]> {
    return ApiClient.get<StudySessionResponse[]>(`/sessions?limit=${limit}`);
  },

  async getWeeklyStats(): Promise<WeeklyStats[]> {
    return ApiClient.get<WeeklyStats[]>('/sessions/weekly-stats');
  },

  async getWeeklySummary(): Promise<WeeklySummary> {
    return ApiClient.get<WeeklySummary>('/sessions/weekly-summary');
  },

  async delete(sessionId: string): Promise<void> {
    return ApiClient.delete(`/sessions/${sessionId}`);
  },
};
