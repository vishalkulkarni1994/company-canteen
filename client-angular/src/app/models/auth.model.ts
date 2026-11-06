export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthState {
  token: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
