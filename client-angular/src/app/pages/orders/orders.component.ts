import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderResponse } from '../../models/order.model';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Placed: { bg: '#dbeafe', color: '#1d4ed8' },
  Preparing: { bg: '#fef3c7', color: '#92400e' },
  Ready: { bg: '#d1fae5', color: '#065f46' },
  Collected: { bg: '#f1f5f9', color: '#475569' },
  Cancelled: { bg: '#fef2f2', color: '#dc2626' },
};

@Component({
  selector: 'app-orders',
  standalone: true,
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h1 class="title">My Orders</h1>
          <p class="subtitle">{{ orders.length }} orders</p>
        </div>
        <button class="back-btn" (click)="router.navigate(['/'])">Back to Menu</button>
      </div>

      @if (error) { <p class="error">{{ error }}</p> }

      @if (orders.length === 0 && !loading) {
        <div class="empty-state">
          <p class="empty-title">No orders yet</p>
          <p class="empty-desc">Place your first order from today's menu.</p>
        </div>
      } @else {
        <div class="list">
          @for (order of orders; track order.id) {
            <div class="order-card">
              <div class="order-header">
                <div>
                  <span class="order-id">Order #{{ order.id }}</span>
                  <span class="order-date">{{ formatDate(order.createdAt) }}</span>
                </div>
                <div class="order-header-right">
                  <span class="status-badge" [style.background]="getStatusColor(order.status).bg" [style.color]="getStatusColor(order.status).color">
                    {{ order.status }}
                  </span>
                  @if (order.status === 'Placed') {
                    <button class="cancel-btn" (click)="handleCancel(order.id)">Cancel</button>
                  }
                </div>
              </div>
              <div class="order-items">
                @for (item of order.items; track item.id) {
                  <div class="order-item-row">
                    <span>{{ item.name }} x{{ item.quantity }}</span>
                    <span class="item-subtotal">₹{{ item.subtotal }}</span>
                  </div>
                }
              </div>
              <div class="order-total">
                <span class="total-label">Total</span>
                <span class="total-amount">₹{{ order.totalAmount }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title { margin: 0; font-size: 28px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .back-btn { padding: 8px 16px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; }
    .error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .list { display: flex; flex-direction: column; gap: 14px; }
    .order-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; }
    .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .order-header-right { display: flex; align-items: center; gap: 8px; }
    .order-id { font-weight: 700; font-size: 16px; margin-right: 10px; }
    .order-date { font-size: 13px; color: #888; }
    .status-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
    .cancel-btn { font-size: 12px; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; padding: 3px 10px; cursor: pointer; font-weight: 500; }
    .order-items { border-top: 1px solid #f1f5f9; padding-top: 10px; }
    .order-item-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .item-subtotal { color: #666; font-weight: 500; }
    .order-total { display: flex; justify-content: space-between; padding-top: 10px; margin-top: 6px; border-top: 1px solid #e2e8f0; }
    .total-label { font-weight: 600; font-size: 15px; }
    .total-amount { font-weight: 700; font-size: 15px; color: #0f766e; }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 6px; }
    .empty-desc { font-size: 14px; color: #888; margin: 0; }
  `],
})
export class OrdersComponent implements OnInit {
  orders: OrderResponse[] = [];
  loading = true;
  error = '';

  constructor(public router: Router, private orderService: OrderService) {}

  async ngOnInit() {
    await this.loadOrders();
  }

  async loadOrders() {
    try {
      this.orders = await this.orderService.getMyOrders();
    } catch {
      this.error = 'Failed to load orders';
    } finally {
      this.loading = false;
    }
  }

  async handleCancel(id: number) {
    try {
      await this.orderService.cancelOrder(id);
      this.orders = this.orders.map(o => o.id === id ? { ...o, status: 'Cancelled' } : o);
    } catch (err: any) {
      this.error = err?.message || 'Failed to cancel order';
    }
  }

  getStatusColor(status: string) {
    return STATUS_COLORS[status] ?? STATUS_COLORS['Placed'];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
