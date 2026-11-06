import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrderResponse, ActiveOrderResponse, PlaceOrderRequest } from '../models/order.model';

const API = 'http://localhost:5230/api/order';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  placeOrder(items: { menuItemId: number; quantity: number }[]): Promise<OrderResponse> {
    return firstValueFrom(this.http.post<OrderResponse>(API, { items }));
  }

  getMyOrders(): Promise<OrderResponse[]> {
    return firstValueFrom(this.http.get<OrderResponse[]>(`${API}/my`));
  }

  getMyActiveOrders(): Promise<OrderResponse[]> {
    return firstValueFrom(this.http.get<OrderResponse[]>(`${API}/my/active`));
  }

  getOrder(id: number): Promise<OrderResponse> {
    return firstValueFrom(this.http.get<OrderResponse>(`${API}/${id}`));
  }

  getActiveOrders(): Promise<ActiveOrderResponse[]> {
    return firstValueFrom(this.http.get<ActiveOrderResponse[]>(`${API}/active`));
  }

  updateOrderStatus(id: number, status: string): Promise<OrderResponse> {
    return firstValueFrom(this.http.put<OrderResponse>(`${API}/${id}/status`, { status }));
  }

  cancelOrder(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/${id}`));
  }
}
