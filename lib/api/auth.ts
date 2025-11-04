import { ApiClient } from './client';

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  profile_completed: boolean;
}

export interface GoogleAuthData {
  token: string;
}

export const AuthService = {
  async register(data: RegisterData): Promise<UserResponse> {
    return ApiClient.post<UserResponse>('/auth/register', data);
  },

  async login(data: LoginData): Promise<TokenResponse> {
    const response = await ApiClient.post<TokenResponse>('/auth/login', data);
    ApiClient.setToken(response.access_token);
    return response;
  },

  async googleAuth(data: GoogleAuthData): Promise<TokenResponse> {
    const response = await ApiClient.post<TokenResponse>('/auth/google', data);
    ApiClient.setToken(response.access_token);
    return response;
  },

  async getCurrentUser(): Promise<UserResponse> {
    return ApiClient.get<UserResponse>('/auth/me');
  },

  logout() {
    ApiClient.clearToken();
  },
};
