import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import TodayMenuPage from "./pages/TodayMenuPage";
import MenuPage from "./pages/MenuPage";
import StockPage from "./pages/StockPage";
import OrdersPage from "./pages/OrdersPage";
import KitchenPage from "./pages/KitchenPage";
import ToastContainer from "./components/Toast";
import useOrderNotifications from "./hooks/useOrderNotifications";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "Admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const { user } = useAuth();
  const { toasts, dismiss } = useOrderNotifications(!!user);

  return (
    <>
      <ToastContainer messages={toasts} onDismiss={dismiss} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/" element={<ProtectedRoute><TodayMenuPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/admin/menu" element={<AdminRoute><MenuPage /></AdminRoute>} />
          <Route path="/admin/stock" element={<AdminRoute><StockPage /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><KitchenPage /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
