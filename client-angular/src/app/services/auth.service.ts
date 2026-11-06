import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, AuthState } from '../models/auth.model';

const API = 'http://localhost:5230/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSignal = signal<AuthState | null>(this.loadFromStorage());

  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.userSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'Admin');

  constructor(private http: HttpClient) {}

  private loadFromStorage(): AuthState | null {
    try {
      const stored = localStorage.getItem('auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API}/login`, { email, password })
    );
    this.setAuth(res);
  }

  async register(email: string, password: string, name: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API}/register`, { email, password, name })
    );
    this.setAuth(res);
  }

  private setAuth(res: AuthResponse): void {
    const state: AuthState = { token: res.token, email: res.email, name: res.name, role: res.role };
    localStorage.setItem('auth', JSON.stringify(state));
    this.userSignal.set(state);
  }

  logout(): void {
    localStorage.removeItem('auth');
    this.userSignal.set(null);
  }

  getToken(): string {
    return this.userSignal()?.token ?? '';
  }
}
