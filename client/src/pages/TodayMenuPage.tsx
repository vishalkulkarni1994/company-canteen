import { useEffect, useState } from "react";
import { getTodayStock, type TodayStockItem } from "../api/menu";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TodayMenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TodayStockItem[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTodayStock()
      .then(setItems)
      .catch(() => setError("Failed to load today's menu"))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(items.map((i) => i.category))];
  const filtered = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Today's Menu</h1>
          <p style={styles.subtitle}>Welcome, {user?.name}</p>
        </div>
        <div style={styles.headerActions}>
          {user?.role === "Admin" && (
            <>
              <button
                onClick={() => navigate("/admin/menu")}
                style={styles.navBtn}
              >
                Manage Menu
              </button>
              <button
                onClick={() => navigate("/admin/stock")}
                style={styles.navBtn}
              >
                Set Stock
              </button>
            </>
          )}
          <button onClick={logout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {!loading && items.length > 0 && (
        <div style={styles.filters}>
          <button
            onClick={() => setFilter(null)}
            style={filter === null ? styles.filterActive : styles.filterBtn}
          >
            All ({items.length})
          </button>
          {categories.map((c) => {
            const count = items.filter((i) => i.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                style={filter === c ? styles.filterActive : styles.filterBtn}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No items available today</p>
          <p style={styles.emptyDesc}>
            {user?.role === "Admin"
              ? "Set today's stock from the Stock page."
              : "Check back later or contact the kitchen."}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.card,
                opacity: item.remaining === 0 ? 0.6 : 1,
              }}
            >
              <div style={styles.cardTop}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardName}>{item.name}</h3>
                  <span style={styles.price}>₹{item.price}</span>
                </div>
                {item.description && (
                  <p style={styles.cardDesc}>{item.description}</p>
                )}
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.chip}>{item.category}</span>
                {item.remaining === 0 ? (
                  <span style={styles.soldOut}>Sold Out</span>
                ) : (
                  <span style={styles.remaining}>
                    {item.remaining} left
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: "4px 0 0", color: "#666", fontSize: 14 },
  error: {
    color: "#dc2626",
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  filters: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 14px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  filterActive: {
    padding: "6px 14px",
    background: "#0f766e",
    color: "#fff",
    border: "1px solid #0f766e",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardTop: { marginBottom: 12 },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardName: { margin: 0, fontSize: 17, fontWeight: 600 },
  price: { fontWeight: 700, color: "#0f766e", fontSize: 16, whiteSpace: "nowrap" },
  cardDesc: { margin: 0, fontSize: 13, color: "#666", lineHeight: 1.4 },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTop: "1px solid #f1f5f9",
  },
  chip: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
    background: "#d8eeea",
    color: "#0f766e",
  },
  remaining: { fontSize: 13, color: "#15803d", fontWeight: 600 },
  soldOut: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    background: "#fef2f2",
    color: "#dc2626",
  },
  navBtn: {
    padding: "8px 14px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
  },
  logoutBtn: {
    padding: "8px 14px",
    background: "#fff",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
  },
  empty: { color: "#888", textAlign: "center", padding: 40 },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#333", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#888", margin: 0 },
};
