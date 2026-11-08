import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChatMessage, ChatRequest, ChatResponse } from '../models/chat.model';

const API = 'http://localhost:5230/api/chat';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpClient) {}

  async sendMessage(message: string, history: ChatMessage[]): Promise<string> {
    const body: ChatRequest = { message, history };
    const res = await firstValueFrom(
      this.http.post<ChatResponse>(API, body)
    );
    return res.reply;
  }
}
