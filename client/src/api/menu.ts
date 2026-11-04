const API = "http://localhost:5230/api";

function authHeaders(): HeadersInit {
  const auth = localStorage.getItem("auth");
  const token = auth ? JSON.parse(auth).token : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface MenuItemResponse {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodayStockItem {
  id: number;
  menuItemId: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  quantityAvailable: number;
  quantityOrdered: number;
  remaining: number;
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export interface SetStockRequest {
  menuItemId: number;
  date: string;
  quantityAvailable: number;
}

export async function getMenuItems(
  category?: string
): Promise<MenuItemResponse[]> {
  const url = category ? `${API}/menu?category=${category}` : `${API}/menu`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export async function createMenuItem(
  data: CreateMenuItemRequest
): Promise<MenuItemResponse> {
  const res = await fetch(`${API}/menu`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to create item");
  }
  return res.json();
}

export async function updateMenuItem(
  id: number,
  data: Partial<CreateMenuItemRequest & { isActive: boolean }>
): Promise<MenuItemResponse> {
  const res = await fetch(`${API}/menu/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

export async function deleteMenuItem(id: number): Promise<void> {
  const res = await fetch(`${API}/menu/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete item");
}

export async function getTodayStock(): Promise<TodayStockItem[]> {
  const res = await fetch(`${API}/stock/today`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load stock");
  return res.json();
}

export async function setStock(data: SetStockRequest): Promise<unknown> {
  const res = await fetch(`${API}/stock`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to set stock");
  return res.json();
}

export async function setStockBatch(
  data: SetStockRequest[]
): Promise<TodayStockItem[]> {
  const res = await fetch(`${API}/stock/batch`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to set stock");
  return res.json();
}
