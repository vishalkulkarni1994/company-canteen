import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MenuItemResponse, TodayStockItem, CreateMenuItemRequest, SetStockRequest } from '../models/menu.model';

const API = 'http://localhost:5230/api';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private http: HttpClient) {}

  getMenuItems(category?: string): Promise<MenuItemResponse[]> {
    const url = category ? `${API}/menu?category=${category}` : `${API}/menu`;
    return firstValueFrom(this.http.get<MenuItemResponse[]>(url));
  }

  createMenuItem(data: CreateMenuItemRequest): Promise<MenuItemResponse> {
    return firstValueFrom(this.http.post<MenuItemResponse>(`${API}/menu`, data));
  }

  updateMenuItem(id: number, data: Partial<CreateMenuItemRequest & { isActive: boolean }>): Promise<MenuItemResponse> {
    return firstValueFrom(this.http.put<MenuItemResponse>(`${API}/menu/${id}`, data));
  }

  deleteMenuItem(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/menu/${id}`));
  }

  getTodayStock(): Promise<TodayStockItem[]> {
    return firstValueFrom(this.http.get<TodayStockItem[]>(`${API}/stock/today`));
  }

  setStock(data: SetStockRequest): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/stock`, data));
  }

  setStockBatch(data: SetStockRequest[]): Promise<TodayStockItem[]> {
    return firstValueFrom(this.http.post<TodayStockItem[]>(`${API}/stock/batch`, data));
  }
}
