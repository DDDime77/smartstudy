import { ApiClient } from './client';

// ===== Task Types =====

export type TaskType = 'assignment' | 'exam_prep' | 'reading' | 'practice' | 'revision' | 'project';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type StageType = 'acknowledgement' | 'preparation' | 'practice';
export type QuestionType = 'multiple_choice' | 'written' | 'calculation';

export interface TaskInput {
  subject_id?: string;
  title: string;
  description?: string;
  task_type?: TaskType;
  difficulty?: number; // 1-5
  deadline?: string; // ISO datetime
  tags?: string[];
}

export interface UpdateTask {
  subject_id?: string;
  title?: string;
  description?: string;
  task_type?: TaskType;
  difficulty?: number;
  estimated_duration?: number;
  actual_duration?: number;
  deadline?: string;
  priority_score?: number;
  status?: TaskStatus;
  tags?: string[];
}

export interface TaskResponse {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  difficulty: number | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  deadline: string | null;
  priority_score: number | null;
  status: TaskStatus;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ===== Task Stage Types =====

export interface ResourceInput {
  type: string; // "video", "article", "pdf", etc.
  url: string;
  title: string;
  duration_minutes?: number;
}

export interface TaskStageInput {
  task_id: string;
  stage_type: StageType;
  difficulty?: number;
  topic?: string;
  resources?: ResourceInput[];
}

export interface StartStageInput {
  time_of_day?: string; // morning, afternoon, evening, night
  energy_level?: number; // 1-5
}

export interface CompleteStageInput {
  focus_rating?: number; // 1-5
  energy_level?: number; // 1-5
}

export interface TaskStageResponse {
  id: string;
  task_id: string;
  user_id: string;
  stage_type: StageType;
  difficulty: number | null;
  topic: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  time_of_day: string | null;
  total_questions: number;
  correct_answers: number;
  success_rate: number | null;
  focus_rating: number | null;
  energy_level: number | null;
  completed: boolean;
  completed_at: string | null;
  resources: ResourceInput[] | null;
  created_at: string;
  updated_at: string;
}

// ===== Question Types =====

export interface QuestionInput {
  stage_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty?: number;
  options?: string[]; // For multiple choice
  correct_answer?: string; // For multiple choice
  sample_solution?: string; // For written/calculation
  marking_criteria?: string[];
}

export interface QuestionResponse {
  id: string;
  stage_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: number | null;
  options: string[] | null;
  correct_answer: string | null;
  sample_solution: string | null;
  marking_criteria: string[] | null;
  created_at: string;
}

// ===== Answer Types =====

export interface AnswerInput {
  question_id: string;
  user_answer: string;
  time_spent_seconds?: number;
}

export interface GradeAnswerInput {
  is_correct?: boolean;
  points_earned?: number;
  max_points?: number;
  feedback?: string;
}

export interface UserAnswerResponse {
  id: string;
  question_id: string;
  user_id: string;
  user_answer: string;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  points_earned: number | null;
  max_points: number | null;
  feedback: string | null;
  submitted_at: string;
}

// ===== Combined Types =====

export interface TaskWithStagesResponse {
  task: TaskResponse;
  stages: TaskStageResponse[];
}

export interface StageWithQuestionsResponse {
  stage: TaskStageResponse;
  questions: QuestionResponse[];
  user_answers: UserAnswerResponse[];
}

// ===== API Service =====

export const TasksService = {
  // Task CRUD
  async getAll(status?: TaskStatus, subjectId?: string): Promise<TaskResponse[]> {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (subjectId) params.append('subject_id', subjectId);
    const queryString = params.toString();
    return ApiClient.get<TaskResponse[]>(`/tasks${queryString ? '?' + queryString : ''}`);
  },

  async getById(taskId: string): Promise<TaskResponse> {
    return ApiClient.get<TaskResponse>(`/tasks/${taskId}`);
  },

  async getWithStages(taskId: string): Promise<TaskWithStagesResponse> {
    return ApiClient.get<TaskWithStagesResponse>(`/tasks/${taskId}/with-stages`);
  },

  async create(data: TaskInput): Promise<TaskResponse> {
    return ApiClient.post<TaskResponse>('/tasks', data);
  },

  async update(taskId: string, data: UpdateTask): Promise<TaskResponse> {
    return ApiClient.put<TaskResponse>(`/tasks/${taskId}`, data);
  },

  async delete(taskId: string): Promise<void> {
    return ApiClient.delete(`/tasks/${taskId}`);
  },

  // Task Stages
  async createStage(data: TaskStageInput): Promise<TaskStageResponse> {
    return ApiClient.post<TaskStageResponse>('/tasks/stages', data);
  },

  async getStage(stageId: string): Promise<StageWithQuestionsResponse> {
    return ApiClient.get<StageWithQuestionsResponse>(`/tasks/stages/${stageId}`);
  },

  async startStage(stageId: string, data: StartStageInput): Promise<TaskStageResponse> {
    return ApiClient.post<TaskStageResponse>(`/tasks/stages/${stageId}/start`, data);
  },

  async completeStage(stageId: string, data: CompleteStageInput): Promise<TaskStageResponse> {
    return ApiClient.post<TaskStageResponse>(`/tasks/stages/${stageId}/complete`, data);
  },

  // Questions
  async createQuestion(data: QuestionInput): Promise<QuestionResponse> {
    return ApiClient.post<QuestionResponse>('/tasks/questions', data);
  },

  async getQuestion(questionId: string): Promise<QuestionResponse> {
    return ApiClient.get<QuestionResponse>(`/tasks/questions/${questionId}`);
  },

  async deleteQuestion(questionId: string): Promise<void> {
    return ApiClient.delete(`/tasks/questions/${questionId}`);
  },

  // Answers
  async submitAnswer(data: AnswerInput): Promise<UserAnswerResponse> {
    return ApiClient.post<UserAnswerResponse>('/tasks/answers', data);
  },

  async gradeAnswer(answerId: string, data: GradeAnswerInput): Promise<UserAnswerResponse> {
    return ApiClient.put<UserAnswerResponse>(`/tasks/answers/${answerId}/grade`, data);
  },
};
