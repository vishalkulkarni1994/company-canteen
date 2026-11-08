import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!open) {
      <button class="chat-fab" (click)="open = true" title="AI Order Assistant">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    }

    @if (open) {
      <div class="chat-window">
        <div class="chat-header">
          <span class="chat-title">AI Order Assistant</span>
          <button class="close-btn" (click)="open = false">&times;</button>
        </div>
        <div class="chat-body" #chatBody>
          @if (messages.length === 0) {
            <div class="welcome">
              <p class="welcome-title">Hi! I'm your ordering assistant.</p>
              <p class="welcome-text">Ask me what's on the menu today, or tell me what you'd like to order!</p>
            </div>
          }
          @for (msg of messages; track $index) {
            <div [class]="msg.role === 'user' ? 'msg-user' : 'msg-assistant'">
              <div [class]="msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'">{{ msg.content }}</div>
            </div>
          }
          @if (loading) {
            <div class="msg-assistant">
              <div class="bubble-assistant typing">Thinking...</div>
            </div>
          }
        </div>
        <div class="chat-input-area">
          <input
            class="chat-input"
            [(ngModel)]="input"
            (keydown.enter)="send()"
            placeholder="Type a message..."
            [disabled]="loading"
          />
          <button class="send-btn" (click)="send()" [disabled]="!input.trim() || loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #0f766e;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
      transition: transform 0.2s;
    }
    .chat-fab:hover { transform: scale(1.1); }
    .chat-window {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      overflow: hidden;
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: #0f766e;
      color: #fff;
    }
    .chat-title { font-weight: 700; font-size: 15px; }
    .close-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .welcome { text-align: center; padding: 20px 0; }
    .welcome-title { font-weight: 700; font-size: 16px; margin: 0 0 6px; color: #333; }
    .welcome-text { font-size: 13px; color: #888; margin: 0; }
    .msg-user { display: flex; justify-content: flex-end; }
    .msg-assistant { display: flex; justify-content: flex-start; }
    .bubble-user {
      background: #0f766e;
      color: #fff;
      padding: 8px 14px;
      border-radius: 16px 16px 4px 16px;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .bubble-assistant {
      background: #f1f5f9;
      color: #333;
      padding: 8px 14px;
      border-radius: 16px 16px 16px 4px;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .typing { color: #888; font-style: italic; }
    .chat-input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    .chat-input:focus { border-color: #0f766e; }
    .chat-input:disabled { background: #f9fafb; }
    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #0f766e;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .send-btn:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class ChatComponent {
  open = false;
  input = '';
  loading = false;
  messages: ChatMessage[] = [];

  constructor(private chatService: ChatService) {}

  async send(): Promise<void> {
    const text = this.input.trim();
    if (!text || this.loading) return;

    this.messages = [...this.messages, { role: 'user', content: text }];
    this.input = '';
    this.loading = true;

    try {
      const history = this.messages.slice(0, -1);
      const reply = await this.chatService.sendMessage(text, history);
      this.messages = [...this.messages, { role: 'assistant', content: reply }];
    } catch {
      this.messages = [...this.messages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }];
    } finally {
      this.loading = false;
    }
  }
}
