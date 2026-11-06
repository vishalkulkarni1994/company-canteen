import { Injectable, signal, OnDestroy } from '@angular/core';
import { OrderService } from './order.service';
import { AuthService } from './auth.service';
import { OrderResponse } from '../models/order.model';
import { effect } from '@angular/core';

export interface ToastMessage {
  id: string;
  text: string;
}

const POLL_INTERVAL = 10_000;

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly toasts = signal<ToastMessage[]>([]);
  private prevStatuses = new Map<number, string>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private orderService: OrderService,
    private authService: AuthService
  ) {
    effect(() => {
      const loggedIn = this.authService.isLoggedIn();
      if (loggedIn) {
        this.startPolling();
      } else {
        this.stopPolling();
        this.prevStatuses.clear();
        this.toasts.set([]);
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.check();
    this.intervalId = setInterval(() => this.check(), POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async check(): Promise<void> {
    try {
      const orders: OrderResponse[] = await this.orderService.getMyActiveOrders();
      const prev = this.prevStatuses;
      const next = new Map<number, string>();

      for (const order of orders) {
        const oldStatus = prev.get(order.id);
        next.set(order.id, order.status);

        if (oldStatus && oldStatus !== order.status && order.status === 'Ready') {
          const itemNames = order.items.map(i => i.name).join(', ');
          this.toasts.update(t => [
            ...t,
            {
              id: `ready-${order.id}-${Date.now()}`,
              text: `Order #${order.id} is ready for pickup! (${itemNames})`,
            },
          ]);
        }
      }

      this.prevStatuses = next;
    } catch {
      // silently ignore polling errors
    }
  }

  dismiss(id: string): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
