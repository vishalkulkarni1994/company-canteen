import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { ActiveOrderResponse } from '../../models/order.model';

const NEXT_STATUS: Record<string, string> = {
  Placed: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Collected',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Placed: { bg: '#dbeafe', color: '#1d4ed8' },
  Preparing: { bg: '#fef3c7', color: '#92400e' },
  Ready: { bg: '#d1fae5', color: '#065f46' },
};

@Component({
  selector: 'app-kitchen',
  standalone: true,
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h1 class="title">Kitchen Orders</h1>
          <p class="subtitle">{{ orders.length }} active orders</p>
        </div>
        <div class="header-actions">
          <button class="back-btn" (click)="router.navigate(['/'])">Back</button>
          <button class="refresh-btn" (click)="loadOrders()">Refresh</button>
        </div>
      </div>

      @if (error) { <p class="error">{{ error }}</p> }

      @if (orders.length === 0 && !loading) {
        <div class="empty-state">
          <p class="empty-title">No active orders</p>
          <p class="empty-desc">Orders will appear here as they come in.</p>
        </div>
      } @else {
        <div class="columns">
          @for (status of statuses; track status) {
            <div class="column">
              <div class="column-header" [style.background]="getStatusColor(status).bg" [style.color]="getStatusColor(status).color">
                {{ status }} ({{ getOrdersByStatus(status).length }})
              </div>
              @for (order of getOrdersByStatus(status); track order.id) {
                <div class="order-card">
                  <div class="order-top">
                    <span class="order-id">#{{ order.id }}</span>
                    <span class="customer-name">{{ order.customerName }}</span>
                  </div>
                  <div class="order-time">{{ formatTime(order.createdAt) }}</div>
                  <div class="item-list">
                    @for (item of order.items; track item.id) {
                      <div class="item-row">{{ item.quantity }}x {{ item.name }}</div>
                    }
                  </div>
                  <div class="card-bottom">
                    <span class="order-amount">₹{{ order.totalAmount }}</span>
                    @if (getNextStatus(status)) {
                      <button class="advance-btn" (click)="handleAdvance(order.id, status)">
                        {{ getButtonLabel(status) }}
                      </button>
                    }
                  </div>
                </div>
              }
              @if (getOrdersByStatus(status).length === 0) {
                <p class="column-empty">None</p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; gap: 8px; }
    .title { margin: 0; font-size: 28px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .back-btn { padding: 8px 16px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; }
    .refresh-btn { padding: 8px 16px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .column { background: #f8fafb; border-radius: 10px; padding: 12px; min-height: 200px; }
    .column-header { font-size: 14px; font-weight: 700; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; text-align: center; }
    .column-empty { color: #aaa; text-align: center; font-size: 13px; }
    .order-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
    .order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .order-id { font-weight: 700; font-size: 15px; }
    .customer-name { font-size: 13px; color: #555; font-weight: 500; }
    .order-time { font-size: 12px; color: #888; margin-bottom: 8px; }
    .item-list { margin-bottom: 10px; }
    .item-row { font-size: 13px; padding: 2px 0; }
    .card-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f1f5f9; }
    .order-amount { font-weight: 700; color: #0f766e; }
    .advance-btn { padding: 5px 14px; background: #0f766e; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px; }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 6px; }
    .empty-desc { font-size: 14px; color: #888; margin: 0; }
  `],
})
export class KitchenComponent implements OnInit, OnDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  orders: ActiveOrderResponse[] = [];
  loading = true;
  error = '';
  statuses = ['Placed', 'Preparing', 'Ready'] as const;

  constructor(public router: Router, private orderService: OrderService) {}

  async ngOnInit() {
    await this.loadOrders();
    this.intervalId = setInterval(() => this.loadOrders(), 15000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async loadOrders() {
    try {
      this.orders = await this.orderService.getActiveOrders();
    } catch {
      this.error = 'Failed to load orders';
    } finally {
      this.loading = false;
    }
  }

  async handleAdvance(id: number, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      const updated = await this.orderService.updateOrderStatus(id, next);
      if (next === 'Collected') {
        this.orders = this.orders.filter(o => o.id !== id);
      } else {
        this.orders = this.orders.map(o =>
          o.id === id ? { ...o, status: updated.status, updatedAt: updated.updatedAt } : o
        );
      }
    } catch (err: any) {
      this.error = err?.message || 'Failed to update';
    }
  }

  getOrdersByStatus(status: string): ActiveOrderResponse[] {
    return this.orders.filter(o => o.status === status);
  }

  getStatusColor(status: string) {
    return STATUS_COLORS[status] ?? STATUS_COLORS['Placed'];
  }

  getNextStatus(status: string): string | undefined {
    return NEXT_STATUS[status];
  }

  getButtonLabel(status: string): string {
    const next = NEXT_STATUS[status];
    if (next === 'Preparing') return 'Start';
    if (next === 'Ready') return 'Mark Ready';
    if (next === 'Collected') return 'Collected';
    return next;
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString();
  }
}
