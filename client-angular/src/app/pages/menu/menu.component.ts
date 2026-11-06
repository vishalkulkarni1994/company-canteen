import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuItemResponse, CreateMenuItemRequest } from '../../models/menu.model';

const CATEGORIES = ['Veg', 'NonVeg', 'Beverage', 'Snack'];

@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h1 class="title">Menu Items</h1>
          <p class="subtitle">{{ items.length }} items in catalogue</p>
        </div>
        <div class="header-actions">
          <button class="back-btn" (click)="router.navigate(['/'])">Back</button>
          <button class="add-btn" (click)="showForm = !showForm">{{ showForm ? 'Cancel' : '+ Add Item' }}</button>
        </div>
      </div>

      @if (error) { <p class="error">{{ error }}</p> }

      @if (showForm) {
        <form (ngSubmit)="handleCreate()" class="form">
          <h3 class="form-title">New Menu Item</h3>
          <div class="form-grid">
            <div class="field">
              <label class="label">Name</label>
              <input class="input" required maxlength="100" [(ngModel)]="formData.name" name="name" />
            </div>
            <div class="field">
              <label class="label">Price (₹)</label>
              <input class="input" type="number" required min="1" step="0.5" [(ngModel)]="formData.price" name="price" />
            </div>
            <div class="field">
              <label class="label">Category</label>
              <select class="input" [(ngModel)]="formData.category" name="category">
                @for (c of categories; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="label">Image URL</label>
              <input class="input" [(ngModel)]="formData.imageUrl" name="imageUrl" />
            </div>
          </div>
          <div class="field">
            <label class="label">Description</label>
            <input class="input" maxlength="500" [(ngModel)]="formData.description" name="description" />
          </div>
          <button type="submit" [disabled]="saving" class="add-btn">{{ saving ? 'Saving...' : 'Create Item' }}</button>
        </form>
      }

      @for (group of grouped; track group.category) {
        <div class="section">
          <h2 class="section-title">{{ group.category }}</h2>
          <div class="grid">
            @for (item of group.items; track item.id) {
              <div class="card">
                <div class="card-header">
                  <h3 class="card-name">{{ item.name }}</h3>
                  <span class="price">₹{{ item.price }}</span>
                </div>
                @if (item.description) {
                  <p class="card-desc">{{ item.description }}</p>
                }
                <div class="card-footer">
                  <span class="chip">{{ item.category }}</span>
                  <button class="delete-btn" (click)="handleDelete(item.id)">Delete</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (items.length === 0 && !loading) {
        <p class="empty">No menu items yet. Add one to get started.</p>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; gap: 8px; }
    .title { margin: 0; font-size: 28px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
    .error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; }
    .form { background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .form-title { margin: 0 0 16px; font-size: 18px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .label { font-size: 13px; font-weight: 600; color: #555; }
    .input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; }
    .add-btn { padding: 8px 16px; background: #0f766e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .add-btn:disabled { opacity: 0.6; }
    .back-btn { padding: 8px 16px; background: #f1f5f9; color: #334155; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .card-name { margin: 0; font-size: 16px; font-weight: 600; }
    .price { font-weight: 700; color: #0f766e; white-space: nowrap; }
    .card-desc { margin: 0 0 10px; font-size: 13px; color: #666; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #d8eeea; color: #0f766e; }
    .delete-btn { font-size: 12px; color: #dc2626; background: none; border: none; cursor: pointer; font-weight: 500; }
    .empty { color: #888; text-align: center; padding: 40px; }
  `],
})
export class MenuComponent implements OnInit {
  items: MenuItemResponse[] = [];
  loading = true;
  error = '';
  showForm = false;
  saving = false;
  categories = CATEGORIES;
  formData: CreateMenuItemRequest = { name: '', price: 0, category: 'Veg' };

  constructor(public router: Router, private menuService: MenuService) {}

  get grouped() {
    return CATEGORIES
      .map(cat => ({ category: cat, items: this.items.filter(i => i.category === cat) }))
      .filter(g => g.items.length > 0);
  }

  async ngOnInit() {
    try {
      this.items = await this.menuService.getMenuItems();
    } catch {
      this.error = 'Failed to load menu items';
    } finally {
      this.loading = false;
    }
  }

  async handleCreate() {
    this.saving = true;
    this.error = '';
    try {
      const created = await this.menuService.createMenuItem(this.formData);
      this.items = [...this.items, created];
      this.showForm = false;
      this.formData = { name: '', price: 0, category: 'Veg' };
    } catch (err: any) {
      this.error = err?.message || 'Failed to create item';
    } finally {
      this.saving = false;
    }
  }

  async handleDelete(id: number) {
    try {
      await this.menuService.deleteMenuItem(id);
      this.items = this.items.filter(i => i.id !== id);
    } catch {
      this.error = 'Failed to delete item';
    }
  }
}
