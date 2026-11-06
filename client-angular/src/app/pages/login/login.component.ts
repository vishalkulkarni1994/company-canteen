import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrapper">
      <form (ngSubmit)="handleSubmit()" class="login-form">
        <h2>{{ isRegister ? 'Create Account' : 'Sign In' }}</h2>
        <p class="subtitle">Company Canteen</p>

        @if (error) {
          <p class="error">{{ error }}</p>
        }

        @if (isRegister) {
          <input type="text" placeholder="Full name" [(ngModel)]="name" name="name" required class="input" />
        }
        <input type="email" placeholder="Email" [(ngModel)]="email" name="email" required class="input" />
        <input type="password" placeholder="Password" [(ngModel)]="password" name="password" required minlength="6" class="input" />

        <button type="submit" [disabled]="loading" class="btn-primary">
          {{ loading ? '...' : (isRegister ? 'Register' : 'Sign In') }}
        </button>

        <p class="toggle-text">
          {{ isRegister ? 'Already have an account?' : 'No account yet?' }}
          <button type="button" (click)="isRegister = !isRegister; error = ''" class="btn-link">
            {{ isRegister ? 'Sign in' : 'Register' }}
          </button>
        </p>
      </form>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .login-form {
      background: #fff;
      padding: 32px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      width: 360px;
    }
    h2 { margin-top: 0; }
    .subtitle { color: #666; font-size: 14px; }
    .error { color: red; font-size: 14px; }
    .input {
      display: block;
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .btn-primary {
      display: block;
      width: 100%;
      padding: 12px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.6; }
    .toggle-text { text-align: center; font-size: 14px; margin-bottom: 0; }
    .btn-link {
      background: none;
      border: none;
      color: #2563eb;
      cursor: pointer;
      padding: 0;
      font-size: 14px;
    }
  `],
})
export class LoginComponent {
  isRegister = false;
  email = '';
  password = '';
  name = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  async handleSubmit() {
    this.error = '';
    this.loading = true;
    try {
      if (this.isRegister) {
        await this.auth.register(this.email, this.password, this.name);
      } else {
        await this.auth.login(this.email, this.password);
      }
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error = err?.message || 'Something went wrong';
    } finally {
      this.loading = false;
    }
  }
}
