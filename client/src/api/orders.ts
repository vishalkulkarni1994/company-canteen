const API = "http://localhost:5230/api";

function authHeaders(): HeadersInit {
  const auth = localStorage.getItem("auth");
  const token = auth ? JSON.parse(auth).token : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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

export async function placeOrder(
  items: { menuItemId: number; quantity: number }[]
): Promise<OrderResponse> {
  const res = await fetch(`${API}/order`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to place order");
  }
  return res.json();
}

export async function getMyOrders(): Promise<OrderResponse[]> {
  const res = await fetch(`${API}/order/my`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function getOrder(id: number): Promise<OrderResponse> {
  const res = await fetch(`${API}/order/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load order");
  return res.json();
}

export async function getActiveOrders(): Promise<ActiveOrderResponse[]> {
  const res = await fetch(`${API}/order/active`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load active orders");
  return res.json();
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<OrderResponse> {
  const res = await fetch(`${API}/order/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to update status");
  }
  return res.json();
}

export async function cancelOrder(id: number): Promise<void> {
  const res = await fetch(`${API}/order/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to cancel order");
  }
}
