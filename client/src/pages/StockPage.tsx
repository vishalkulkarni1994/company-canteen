import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMenuItems,
  setStockBatch,
  getTodayStock,
  type MenuItemResponse,
  type TodayStockItem,
} from "../api/menu";

export default function StockPage() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<MenuItemResponse[]>([]);
  const [todayStock, setTodayStock] = useState<TodayStockItem[]>([]);
  const [selections, setSelections] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [items, stock] = await Promise.all([
        getMenuItems(),
        getTodayStock(),
      ]);
      setAllItems(items);
      setTodayStock(stock);
      const initial = new Map<number, number>();
      stock.forEach((s) => initial.set(s.menuItemId, s.quantityAvailable));
      setSelections(initial);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id: number) {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, 50);
      }
      return next;
    });
  }

  function setQuantity(id: number, qty: number) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(id, Math.max(0, qty));
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    const today = new Date().toISOString().split("T")[0];
    const requests = Array.from(selections.entries()).map(([menuItemId, qty]) => ({
      menuItemId,
      date: today,
      quantityAvailable: qty,
    }));
    try {
      const result = await setStockBatch(requests);
      setTodayStock(result);
      setSuccess(`Stock set for ${requests.length} items`);
    } catch {
      setError("Failed to save stock");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={styles.container}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Daily Stock</h1>
          <p style={styles.subtitle}>
            Set today's available items and quantities
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selections.size === 0}
            style={styles.saveBtn}
          >
            {saving ? "Saving..." : `Save (${selections.size} items)`}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <div style={styles.layout}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>All Menu Items</h2>
          <p style={styles.panelDesc}>Check items to include in today's menu</p>
          {allItems.map((item) => {
            const selected = selections.has(item.id);
            return (
              <div
                key={item.id}
                style={{
                  ...styles.itemRow,
                  background: selected ? "#f0fdf4" : "#fff",
                  borderColor: selected ? "#86efac" : "#e2e8f0",
                }}
              >
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleItem(item.id)}
                    style={styles.checkbox}
                  />
                  <div>
                    <span style={styles.itemName}>{item.name}</span>
                    <span style={styles.itemMeta}>
                      {item.category} &middot; ₹{item.price}
                    </span>
                  </div>
                </label>
                {selected && (
                  <div style={styles.qtyControl}>
                    <label style={styles.qtyLabel}>Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={selections.get(item.id) ?? 0}
                      onChange={(e) =>
                        setQuantity(item.id, Number(e.target.value))
                      }
                      style={styles.qtyInput}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {allItems.length === 0 && (
            <p style={styles.empty}>
              No menu items. <a href="/admin/menu">Create some first.</a>
            </p>
          )}
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Today's Stock</h2>
          <p style={styles.panelDesc}>Current status after last save</p>
          {todayStock.length === 0 ? (
            <p style={styles.empty}>No stock set for today yet.</p>
          ) : (
            todayStock.map((s) => (
              <div key={s.id} style={styles.stockRow}>
                <div>
                  <span style={styles.itemName}>{s.name}</span>
                  <span style={styles.itemMeta}>
                    {s.category} &middot; ₹{s.price}
                  </span>
                </div>
                <div style={styles.stockInfo}>
                  <span style={styles.stockNum}>{s.remaining}</span>
                  <span style={styles.stockLabel}>
                    / {s.quantityAvailable} left
                  </span>
                  {s.remaining === 0 && (
                    <span style={styles.soldOut}>Sold Out</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1040, margin: "0 auto", padding: "24px 16px" },
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
  error: {
    color: "#dc2626",
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  success: {
    color: "#15803d",
    background: "#f0fdf4",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  saveBtn: {
    padding: "8px 16px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
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
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 20,
  },
  panelTitle: { margin: "0 0 4px", fontSize: 18, fontWeight: 600 },
  panelDesc: { margin: "0 0 16px", fontSize: 13, color: "#888" },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    marginBottom: 8,
  },
  checkLabel: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  checkbox: { width: 18, height: 18, cursor: "pointer" },
  itemName: { display: "block", fontWeight: 600, fontSize: 14 },
  itemMeta: { fontSize: 12, color: "#888" },
  qtyControl: { display: "flex", alignItems: "center", gap: 6 },
  qtyLabel: { fontSize: 12, color: "#666" },
  qtyInput: {
    width: 60,
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 14,
    textAlign: "center",
  },
  stockRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    marginBottom: 8,
  },
  stockInfo: { display: "flex", alignItems: "center", gap: 4 },
  stockNum: { fontWeight: 700, fontSize: 18, color: "#0f766e" },
  stockLabel: { fontSize: 12, color: "#888" },
  soldOut: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#fef2f2",
    color: "#dc2626",
    marginLeft: 6,
  },
  empty: { color: "#888", textAlign: "center", padding: 20 },
};
