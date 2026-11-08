import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { ChatComponent } from './components/chat/chat.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ChatComponent],
  template: `
    <app-toast />
    <router-outlet />
    @if (auth.isLoggedIn()) {
      <app-chat />
    }
  `,
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
