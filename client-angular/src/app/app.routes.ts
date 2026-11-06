import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard, GuestGuard } from './guards/auth.guard';

import { LoginComponent } from './pages/login/login.component';
import { TodayMenuComponent } from './pages/today-menu/today-menu.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { MenuComponent } from './pages/menu/menu.component';
import { StockComponent } from './pages/stock/stock.component';
import { KitchenComponent } from './pages/kitchen/kitchen.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: '', component: TodayMenuComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
  { path: 'admin/menu', component: MenuComponent, canActivate: [AdminGuard] },
  { path: 'admin/stock', component: StockComponent, canActivate: [AdminGuard] },
  { path: 'admin/orders', component: KitchenComponent, canActivate: [AdminGuard] },
  { path: '**', redirectTo: '' },
];
