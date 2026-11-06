export interface OrderItemResponse {
  id: number;
  menuItemId: number;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

export interface ActiveOrderResponse extends OrderResponse {
  customerName: string;
}

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  remaining: number;
}

export interface PlaceOrderRequest {
  items: { menuItemId: number; quantity: number }[];
}
