import { Component } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (msg of notificationService.toasts(); track msg.id) {
        <div class="toast" role="alert">
          <span class="toast-icon">&#9996;</span>
          <span class="toast-text">{{ msg.text }}</span>
          <button class="toast-close" (click)="notificationService.dismiss(msg.id)">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 380px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #065f46;
      color: #fff;
      padding: 12px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .toast-icon { font-size: 20px; line-height: 1; }
    .toast-text { flex: 1; font-size: 14px; font-weight: 500; }
    .toast-close {
      background: none;
      border: none;
      color: #d1fae5;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
  `],
})
export class ToastComponent {
  constructor(public notificationService: NotificationService) {}
}
