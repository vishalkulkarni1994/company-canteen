import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveOrders,
  updateOrderStatus,
  type ActiveOrderResponse,
} from "../api/orders";

const NEXT_STATUS: Record<string, string> = {
  Placed: "Preparing",
  Preparing: "Ready",
  Ready: "Collected",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Placed: { bg: "#dbeafe", color: "#1d4ed8" },
  Preparing: { bg: "#fef3c7", color: "#92400e" },
  Ready: { bg: "#d1fae5", color: "#065f46" },
};

export default function KitchenPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ActiveOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const data = await getActiveOrders();
      setOrders(data);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance(id: number, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      const updated = await updateOrderStatus(id, next);
      if (next === "Collected") {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id
              ? { ...o, status: updated.status, updatedAt: updated.updatedAt }
              : o
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  const grouped = {
    Placed: orders.filter((o) => o.status === "Placed"),
    Preparing: orders.filter((o) => o.status === "Preparing"),
    Ready: orders.filter((o) => o.status === "Ready"),
  };

  if (loading) return <div style={styles.container}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Kitchen Orders</h1>
          <p style={styles.subtitle}>{orders.length} active orders</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            Back
          </button>
          <button onClick={loadOrders} style={styles.refreshBtn}>
            Refresh
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No active orders</p>
          <p style={styles.emptyDesc}>Orders will appear here as they come in.</p>
        </div>
      ) : (
        <div style={styles.columns}>
          {(["Placed", "Preparing", "Ready"] as const).map((status) => {
            const sc = STATUS_COLORS[status];
            const column = grouped[status];
            return (
              <div key={status} style={styles.column}>
                <div style={{ ...styles.columnHeader, background: sc.bg, color: sc.color }}>
                  {status} ({column.length})
                </div>
                {column.map((order) => (
                  <div key={order.id} style={styles.orderCard}>
                    <div style={styles.orderTop}>
                      <span style={styles.orderId}>#{order.id}</span>
                      <span style={styles.customerName}>{order.customerName}</span>
                    </div>
                    <div style={styles.orderTime}>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div style={styles.itemList}>
                      {order.items.map((item) => (
                        <div key={item.id} style={styles.itemRow}>
                          <span>{item.quantity}x {item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.cardBottom}>
                      <span style={styles.orderAmount}>₹{order.totalAmount}</span>
                      {NEXT_STATUS[status] && (
                        <button
                          onClick={() => handleAdvance(order.id, status)}
                          style={styles.advanceBtn}
                        >
                          {NEXT_STATUS[status] === "Preparing"
                            ? "Start"
                            : NEXT_STATUS[status] === "Ready"
                              ? "Mark Ready"
                              : "Collected"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {column.length === 0 && (
                  <p style={styles.columnEmpty}>None</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  headerActions: { display: "flex", gap: 8 },
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
  refreshBtn: {
    padding: "8px 16px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  column: {
    background: "#f8fafb",
    borderRadius: 10,
    padding: 12,
    minHeight: 200,
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 12,
    textAlign: "center",
  },
  columnEmpty: { color: "#aaa", textAlign: "center", fontSize: 13 },
  orderCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderId: { fontWeight: 700, fontSize: 15 },
  customerName: { fontSize: 13, color: "#555", fontWeight: 500 },
  orderTime: { fontSize: 12, color: "#888", marginBottom: 8 },
  itemList: { marginBottom: 10 },
  itemRow: { fontSize: 13, padding: "2px 0" },
  cardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: "1px solid #f1f5f9",
  },
  orderAmount: { fontWeight: 700, color: "#0f766e" },
  advanceBtn: {
    padding: "5px 14px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#333", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#888", margin: 0 },
};
