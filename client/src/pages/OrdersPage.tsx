import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyOrders, cancelOrder, type OrderResponse } from "../api/orders";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Placed: { bg: "#dbeafe", color: "#1d4ed8" },
  Preparing: { bg: "#fef3c7", color: "#92400e" },
  Ready: { bg: "#d1fae5", color: "#065f46" },
  Collected: { bg: "#f1f5f9", color: "#475569" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    try {
      await cancelOrder(id);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "Cancelled" } : o))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    }
  }

  if (loading) return <div style={styles.container}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Orders</h1>
          <p style={styles.subtitle}>{orders.length} orders</p>
        </div>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          Back to Menu
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No orders yet</p>
          <p style={styles.emptyDesc}>Place your first order from today's menu.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {orders.map((order) => {
            const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.Placed;
            return (
              <div key={order.id} style={styles.orderCard}>
                <div style={styles.orderHeader}>
                  <div>
                    <span style={styles.orderId}>Order #{order.id}</span>
                    <span style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={styles.orderHeaderRight}>
                    <span
                      style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}
                    >
                      {order.status}
                    </span>
                    {order.status === "Placed" && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        style={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div style={styles.orderItems}>
                  {order.items.map((item) => (
                    <div key={item.id} style={styles.orderItemRow}>
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span style={styles.itemSubtotal}>₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
                <div style={styles.orderTotal}>
                  <span style={styles.totalLabel}>Total</span>
                  <span style={styles.totalAmount}>₹{order.totalAmount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: "4px 0 0", color: "#666", fontSize: 14 },
  backBtn: {
    padding: "8px 16px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  list: { display: "flex", flexDirection: "column", gap: 14 },
  orderCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 18,
  },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  orderHeaderRight: { display: "flex", alignItems: "center", gap: 8 },
  orderId: { fontWeight: 700, fontSize: 16, marginRight: 10 },
  orderDate: { fontSize: 13, color: "#888" },
  statusBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
  },
  cancelBtn: {
    fontSize: 12,
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 4,
    padding: "3px 10px",
    cursor: "pointer",
    fontWeight: 500,
  },
  orderItems: {
    borderTop: "1px solid #f1f5f9",
    paddingTop: 10,
  },
  orderItemRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 14,
  },
  itemSubtotal: { color: "#666", fontWeight: 500 },
  orderTotal: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTop: "1px solid #e2e8f0",
  },
  totalLabel: { fontWeight: 600, fontSize: 15 },
  totalAmount: { fontWeight: 700, fontSize: 15, color: "#0f766e" },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#333", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#888", margin: 0 },
};
