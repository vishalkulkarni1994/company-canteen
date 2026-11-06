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
