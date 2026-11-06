import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuItemResponse, TodayStockItem } from '../../models/menu.model';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h1 class="title">Daily Stock</h1>
          <p class="subtitle">Set today's available items and quantities</p>
        </div>
        <div class="header-actions">
          <button class="back-btn" (click)="router.navigate(['/'])">Back</button>
          <button class="save-btn" (click)="handleSave()" [disabled]="saving || selections.size === 0">
            {{ saving ? 'Saving...' : 'Save (' + selections.size + ' items)' }}
          </button>
        </div>
      </div>

      @if (error) { <p class="error">{{ error }}</p> }
      @if (success) { <p class="success">{{ success }}</p> }

      <div class="layout">
        <div class="panel">
          <h2 class="panel-title">All Menu Items</h2>
          <p class="panel-desc">Check items to include in today's menu</p>
          @for (item of allItems; track item.id) {
            <div class="item-row" [style.background]="selections.has(item.id) ? '#f0fdf4' : '#fff'" [style.border-color]="selections.has(item.id) ? '#86efac' : '#e2e8f0'">
              <label class="check-label">
                <input type="checkbox" [checked]="selections.has(item.id)" (change)="toggleItem(item.id)" class="checkbox" />
                <div>
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-meta">{{ item.category }} · ₹{{ item.price }}</span>
                </div>
              </label>
              @if (selections.has(item.id)) {
                <div class="qty-control">
                  <label class="qty-label">Qty</label>
                  <input type="number" min="0" [ngModel]="selections.get(item.id)" (ngModelChange)="setQuantity(item.id, $event)" class="qty-input" />
                </div>
              }
            </div>
          }
          @if (allItems.length === 0) {
            <p class="empty">No menu items. Create some first.</p>
          }
        </div>

        <div class="panel">
          <h2 class="panel-title">Today's Stock</h2>
          <p class="panel-desc">Current status after last save</p>
          @if (todayStock.length === 0) {
            <p class="empty">No stock set for today yet.</p>
          } @else {
            @for (s of todayStock; track s.id) {
              <div class="stock-row">
                <div>
                  <span class="item-name">{{ s.name }}</span>
                  <span class="item-meta">{{ s.category }} · ₹{{ s.price }}</span>
                </div>
                <div class="stock-info">
                  <span class="stock-num">{{ s.remaining }}</span>
                  <span class="stock-label">/ {{ s.quantityAvailable }} left</span>
                  @if (s.remaining === 0) {
                    <span class="sold-out">Sold Out</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1040px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; gap: 8px; }
    .title { margin: 0; font-size: 28px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .success { color: #15803d; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .save-btn { padding: 8px 16px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .save-btn:disabled { opacity: 0.6; }
    .back-btn { padding: 8px 16px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; }
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    .panel-title { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .panel-desc { margin: 0 0 16px; font-size: 13px; color: #888; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; }
    .check-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .checkbox { width: 18px; height: 18px; cursor: pointer; }
    .item-name { display: block; font-weight: 600; font-size: 14px; }
    .item-meta { font-size: 12px; color: #888; }
    .qty-control { display: flex; align-items: center; gap: 6px; }
    .qty-label { font-size: 12px; color: #666; }
    .qty-input { width: 60px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; text-align: center; }
    .stock-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; }
    .stock-info { display: flex; align-items: center; gap: 4px; }
    .stock-num { font-weight: 700; font-size: 18px; color: #0f766e; }
    .stock-label { font-size: 12px; color: #888; }
    .sold-out { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #fef2f2; color: #dc2626; margin-left: 6px; }
    .empty { color: #888; text-align: center; padding: 20px; }
  `],
})
export class StockComponent implements OnInit {
  allItems: MenuItemResponse[] = [];
  todayStock: TodayStockItem[] = [];
  selections = new Map<number, number>();
  loading = true;
  saving = false;
  error = '';
  success = '';

  constructor(public router: Router, private menuService: MenuService) {}

  async ngOnInit() {
    try {
      const [items, stock] = await Promise.all([
        this.menuService.getMenuItems(),
        this.menuService.getTodayStock(),
      ]);
      this.allItems = items;
      this.todayStock = stock;
      stock.forEach(s => this.selections.set(s.menuItemId, s.quantityAvailable));
    } catch {
      this.error = 'Failed to load data';
    } finally {
      this.loading = false;
    }
  }

  toggleItem(id: number): void {
    if (this.selections.has(id)) {
      this.selections.delete(id);
    } else {
      this.selections.set(id, 50);
    }
    this.selections = new Map(this.selections);
  }

  setQuantity(id: number, qty: number): void {
    this.selections.set(id, Math.max(0, qty));
    this.selections = new Map(this.selections);
  }

  async handleSave() {
    this.saving = true;
    this.error = '';
    this.success = '';
    const today = new Date().toISOString().split('T')[0];
    const requests = Array.from(this.selections.entries()).map(([menuItemId, qty]) => ({
      menuItemId,
      date: today,
      quantityAvailable: qty,
    }));
    try {
      this.todayStock = await this.menuService.setStockBatch(requests);
      this.success = `Stock set for ${requests.length} items`;
    } catch {
      this.error = 'Failed to save stock';
    } finally {
      this.saving = false;
    }
  }
}
