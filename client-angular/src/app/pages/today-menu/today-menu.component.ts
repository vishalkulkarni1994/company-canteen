import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { OrderService } from '../../services/order.service';
import { TodayStockItem } from '../../models/menu.model';
import { CartItem } from '../../models/order.model';
@Component({
  selector: 'app-today-menu',
  standalone: true,
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h1 class="title">Today's Menu</h1>
          <p class="subtitle">Welcome, {{ auth.user()?.name }}</p>
        </div>
        <div class="header-actions">
          @if (auth.isAdmin()) {
            <button class="nav-btn" (click)="router.navigate(['/admin/menu'])">Manage Menu</button>
            <button class="nav-btn" (click)="router.navigate(['/admin/stock'])">Set Stock</button>
            <button class="nav-btn" (click)="router.navigate(['/admin/orders'])">Orders</button>
          }
          <button class="nav-btn" (click)="router.navigate(['/orders'])">My Orders</button>
          <button class="cart-btn" (click)="showCart = !showCart">Cart ({{ cartCount }})</button>
          <button class="logout-btn" (click)="auth.logout(); router.navigate(['/login'])">Sign Out</button>
        </div>
      </div>

      @if (error) { <p class="error">{{ error }}</p> }
      @if (orderSuccess) { <p class="success">{{ orderSuccess }}</p> }

      @if (showCart) {
        <div class="cart-panel">
          <h3 class="cart-title">Your Cart</h3>
          @if (cart.size === 0) {
            <p class="cart-empty">Cart is empty</p>
          } @else {
            @for (item of cartItems; track item.menuItemId) {
              <div class="cart-row">
                <div class="cart-item-info">
                  <span class="cart-item-name">{{ item.name }}</span>
                  <span class="cart-item-price">₹{{ item.price }} x {{ item.quantity }} = ₹{{ item.price * item.quantity }}</span>
                </div>
                <div class="cart-controls">
                  <button class="qty-btn" (click)="updateCartQty(item.menuItemId, item.quantity - 1)">-</button>
                  <span class="qty-display">{{ item.quantity }}</span>
                  <button class="qty-btn" (click)="updateCartQty(item.menuItemId, item.quantity + 1)" [disabled]="item.quantity >= item.remaining">+</button>
                  <button class="remove-btn" (click)="removeFromCart(item.menuItemId)">Remove</button>
                </div>
              </div>
            }
            <div class="cart-footer">
              <span class="cart-total">Total: ₹{{ cartTotal }}</span>
              <button class="place-order-btn" (click)="handlePlaceOrder()" [disabled]="placing">
                {{ placing ? 'Placing...' : 'Place Order' }}
              </button>
            </div>
          }
        </div>
      }

      @if (!loading && items.length > 0) {
        <div class="filters">
          <button [class]="filter === null ? 'filter-active' : 'filter-btn'" (click)="filter = null">All ({{ items.length }})</button>
          @for (cat of categories; track cat) {
            <button [class]="filter === cat ? 'filter-active' : 'filter-btn'" (click)="filter = cat">
              {{ cat }} ({{ countByCategory(cat) }})
            </button>
          }
        </div>
      }

      @if (loading) {
        <p class="empty">Loading...</p>
      } @else if (filtered.length === 0) {
        <div class="empty-state">
          <p class="empty-title">No items available today</p>
          <p class="empty-desc">{{ auth.isAdmin() ? 'Set today\\'s stock from the Stock page.' : 'Check back later or contact the kitchen.' }}</p>
        </div>
      } @else {
        <div class="grid">
          @for (item of filtered; track item.id) {
            <div class="card" [style.opacity]="item.remaining === 0 ? 0.6 : 1">
              <div class="card-top">
                <div class="card-header">
                  <h3 class="card-name">{{ item.name }}</h3>
                  <span class="price">₹{{ item.price }}</span>
                </div>
                @if (item.description) {
                  <p class="card-desc">{{ item.description }}</p>
                }
              </div>
              <div class="card-footer">
                <div class="card-footer-left">
                  <span class="chip">{{ item.category }}</span>
                  @if (item.remaining === 0) {
                    <span class="sold-out">Sold Out</span>
                  } @else {
                    <span class="remaining">{{ item.remaining }} left</span>
                  }
                </div>
                @if (item.remaining > 0) {
                  <button
                    [class]="getCartQty(item.menuItemId) > 0 ? 'added-btn' : 'add-btn'"
                    (click)="addToCart(item)"
                    [disabled]="getCartQty(item.menuItemId) >= item.remaining">
                    {{ getCartQty(item.menuItemId) > 0 ? getCartQty(item.menuItemId) + ' in cart' : 'Add' }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .title { margin: 0; font-size: 28px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .success { color: #15803d; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .cart-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .cart-title { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
    .cart-empty { color: #888; margin: 0; }
    .cart-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; gap: 8px; }
    .cart-item-info { display: flex; flex-direction: column; gap: 2px; }
    .cart-item-name { font-weight: 600; font-size: 14px; }
    .cart-item-price { font-size: 13px; color: #666; }
    .cart-controls { display: flex; align-items: center; gap: 6px; }
    .qty-btn { width: 28px; height: 28px; background: #f1f5f9; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; }
    .qty-display { font-size: 14px; font-weight: 600; min-width: 20px; text-align: center; }
    .remove-btn { font-size: 12px; color: #dc2626; background: none; border: none; cursor: pointer; margin-left: 8px; }
    .cart-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; margin-top: 6px; }
    .cart-total { font-size: 18px; font-weight: 700; color: #0f766e; }
    .place-order-btn { padding: 10px 24px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 15px; }
    .place-order-btn:disabled { opacity: 0.6; }
    .filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-btn { padding: 6px 14px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 999px; cursor: pointer; font-size: 13px; font-weight: 500; }
    .filter-active { padding: 6px 14px; background: #0f766e; color: #fff; border: 1px solid #0f766e; border-radius: 999px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
    .card-top { margin-bottom: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .card-name { margin: 0; font-size: 17px; font-weight: 600; }
    .price { font-weight: 700; color: #0f766e; font-size: 16px; white-space: nowrap; }
    .card-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.4; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #f1f5f9; }
    .card-footer-left { display: flex; align-items: center; gap: 8px; }
    .chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: #d8eeea; color: #0f766e; }
    .remaining { font-size: 13px; color: #15803d; font-weight: 600; }
    .sold-out { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: #fef2f2; color: #dc2626; }
    .add-btn { padding: 6px 16px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .added-btn { padding: 6px 16px; background: #d8eeea; color: #0f766e; border: 1px solid #0f766e; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .nav-btn { padding: 8px 14px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px; }
    .cart-btn { padding: 8px 14px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .logout-btn { padding: 8px 14px; background: #fff; color: #dc2626; border: 1px solid #fca5a5; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px; }
    .empty { color: #888; text-align: center; padding: 40px; }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 6px; }
    .empty-desc { font-size: 14px; color: #888; margin: 0; }
  `],
})
export class TodayMenuComponent implements OnInit {
  items: TodayStockItem[] = [];
  filter: string | null = null;
  loading = true;
  error = '';
  cart = new Map<number, CartItem>();
  showCart = false;
  placing = false;
  orderSuccess = '';

  constructor(
    public auth: AuthService,
    public router: Router,
    private menuService: MenuService,
    private orderService: OrderService
  ) {}

  get categories(): string[] {
    return [...new Set(this.items.map(i => i.category))];
  }

  get filtered(): TodayStockItem[] {
    return this.filter ? this.items.filter(i => i.category === this.filter) : this.items;
  }

  get cartItems(): CartItem[] {
    return Array.from(this.cart.values());
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, c) => sum + c.price * c.quantity, 0);
  }

  get cartCount(): number {
    return this.cartItems.reduce((sum, c) => sum + c.quantity, 0);
  }

  countByCategory(cat: string): number {
    return this.items.filter(i => i.category === cat).length;
  }

  getCartQty(menuItemId: number): number {
    return this.cart.get(menuItemId)?.quantity ?? 0;
  }

  async ngOnInit() {
    try {
      this.items = await this.menuService.getTodayStock();
    } catch {
      this.error = 'Failed to load today\'s menu';
    } finally {
      this.loading = false;
    }
  }

  addToCart(item: TodayStockItem): void {
    const existing = this.cart.get(item.menuItemId);
    if (existing) {
      if (existing.quantity < item.remaining) {
        this.cart.set(item.menuItemId, { ...existing, quantity: existing.quantity + 1 });
      }
    } else {
      this.cart.set(item.menuItemId, {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: 1,
        remaining: item.remaining,
      });
    }
    this.cart = new Map(this.cart);
  }

  updateCartQty(menuItemId: number, qty: number): void {
    if (qty <= 0) {
      this.cart.delete(menuItemId);
    } else {
      const existing = this.cart.get(menuItemId);
      if (existing) {
        this.cart.set(menuItemId, { ...existing, quantity: Math.min(qty, existing.remaining) });
      }
    }
    this.cart = new Map(this.cart);
  }

  removeFromCart(menuItemId: number): void {
    this.cart.delete(menuItemId);
    this.cart = new Map(this.cart);
  }

  async handlePlaceOrder(): Promise<void> {
    this.placing = true;
    this.error = '';
    try {
      const orderItems = this.cartItems.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity }));
      const order = await this.orderService.placeOrder(orderItems);
      this.cart = new Map();
      this.showCart = false;
      this.orderSuccess = `Order #${order.id} placed! Total: ₹${order.totalAmount}`;
      this.items = await this.menuService.getTodayStock();
      setTimeout(() => this.orderSuccess = '', 5000);
    } catch (err: any) {
      this.error = err?.message || 'Failed to place order';
    } finally {
      this.placing = false;
    }
  }
}
