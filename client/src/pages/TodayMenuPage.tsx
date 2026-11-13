import { useEffect, useState } from "react";
import { getTodayStock, type TodayStockItem } from "../api/menu";
import { placeOrder, type CartItem } from "../api/orders";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TodayMenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TodayStockItem[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState("");

  useEffect(() => {
    getTodayStock()
      .then(setItems)
      .catch(() => setError("Failed to load today's menu"))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(items.map((i) => i.category))];
  const filtered = filter ? items.filter((i) => i.category === filter) : items;
  const cartTotal = Array.from(cart.values()).reduce(
    (sum, c) => sum + c.price * c.quantity,
    0
  );
  const cartCount = Array.from(cart.values()).reduce(
    (sum, c) => sum + c.quantity,
    0
  );

  function addToCart(item: TodayStockItem) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.menuItemId);
      if (existing) {
        if (existing.quantity < item.remaining) {
          next.set(item.menuItemId, { ...existing, quantity: existing.quantity + 1 });
        }
      } else {
        next.set(item.menuItemId, {
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: 1,
          remaining: item.remaining,
        });
      }
      return next;
    });
  }

  function updateCartQty(menuItemId: number, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(menuItemId);
      } else {
        const existing = next.get(menuItemId);
        if (existing) {
          next.set(menuItemId, { ...existing, quantity: Math.min(qty, existing.remaining) });
        }
      }
      return next;
    });
  }

  function removeFromCart(menuItemId: number) {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(menuItemId);
      return next;
    });
  }

  async function handlePlaceOrder() {
    setPlacing(true);
    setError("");
    try {
      const orderItems = Array.from(cart.values()).map((c) => ({
        menuItemId: c.menuItemId,
        quantity: c.quantity,
      }));
      const order = await placeOrder(orderItems);
      setCart(new Map());
      setShowCart(false);
      setOrderSuccess(`Order #${order.id} placed! Total: ₹${order.totalAmount}`);
      const refreshed = await getTodayStock();
      setItems(refreshed);
      setTimeout(() => setOrderSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Today's Menu</h1>
          <p style={styles.subtitle}>
            Welcome, {user?.name}
            {user?.companyName && <span style={{ color: "#0f766e", fontWeight: 600 }}> — {user.companyName}</span>}
          </p>
        </div>
        <div style={styles.headerActions}>
          {user?.role === "SuperAdmin" && (
            <button onClick={() => navigate("/admin/companies")} style={styles.navBtn}>
              Companies
            </button>
          )}
          {(user?.role === "CompanyAdmin" || user?.role === "SuperAdmin") && (
            <>
              <button onClick={() => navigate("/admin/menu")} style={styles.navBtn}>
                Manage Menu
              </button>
              <button onClick={() => navigate("/admin/stock")} style={styles.navBtn}>
                Set Stock
              </button>
              <button onClick={() => navigate("/admin/orders")} style={styles.navBtn}>
                Orders
              </button>
              <button onClick={() => navigate("/admin/analytics")} style={styles.navBtn}>
                Analytics
              </button>
            </>
          )}
          <button onClick={() => navigate("/chat")} style={styles.navBtn}>
            AI Chat
          </button>
          <button onClick={() => navigate("/orders")} style={styles.navBtn}>
            My Orders
          </button>
          <button
            onClick={() => setShowCart(!showCart)}
            style={styles.cartBtn}
          >
            Cart ({cartCount})
          </button>
          <button onClick={logout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {orderSuccess && <p style={styles.success}>{orderSuccess}</p>}

      {showCart && (
        <div style={styles.cartPanel}>
          <h3 style={styles.cartTitle}>Your Cart</h3>
          {cart.size === 0 ? (
            <p style={styles.cartEmpty}>Cart is empty</p>
          ) : (
            <>
              {Array.from(cart.values()).map((c) => (
                <div key={c.menuItemId} style={styles.cartRow}>
                  <div style={styles.cartItemInfo}>
                    <span style={styles.cartItemName}>{c.name}</span>
                    <span style={styles.cartItemPrice}>
                      ₹{c.price} x {c.quantity} = ₹{c.price * c.quantity}
                    </span>
                  </div>
                  <div style={styles.cartControls}>
                    <button
                      onClick={() => updateCartQty(c.menuItemId, c.quantity - 1)}
                      style={styles.qtyBtn}
                    >
                      -
                    </button>
                    <span style={styles.qtyDisplay}>{c.quantity}</span>
                    <button
                      onClick={() => updateCartQty(c.menuItemId, c.quantity + 1)}
                      style={styles.qtyBtn}
                      disabled={c.quantity >= c.remaining}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(c.menuItemId)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div style={styles.cartFooter}>
                <span style={styles.cartTotal}>Total: ₹{cartTotal}</span>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  style={styles.placeOrderBtn}
                >
                  {placing ? "Placing..." : "Place Order"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

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
            {user?.role === "CompanyAdmin" || user?.role === "SuperAdmin"
              ? "Set today's stock from the Stock page."
              : "Check back later or contact the kitchen."}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((item) => {
            const inCart = cart.get(item.menuItemId);
            return (
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
                  <div style={styles.cardFooterLeft}>
                    <span style={styles.chip}>{item.category}</span>
                    {item.remaining === 0 ? (
                      <span style={styles.soldOut}>Sold Out</span>
                    ) : (
                      <span style={styles.remaining}>{item.remaining} left</span>
                    )}
                  </div>
                  {item.remaining > 0 && (
                    <button
                      onClick={() => addToCart(item)}
                      disabled={inCart !== undefined && inCart.quantity >= item.remaining}
                      style={inCart ? styles.addedBtn : styles.addBtn}
                    >
                      {inCart ? `${inCart.quantity} in cart` : "Add"}
                    </button>
                  )}
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
  success: {
    color: "#15803d",
    background: "#f0fdf4",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  cartPanel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  cartTitle: { margin: "0 0 12px", fontSize: 18, fontWeight: 600 },
  cartEmpty: { color: "#888", margin: 0 },
  cartRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
    gap: 8,
  },
  cartItemInfo: { display: "flex", flexDirection: "column", gap: 2 },
  cartItemName: { fontWeight: 600, fontSize: 14 },
  cartItemPrice: { fontSize: 13, color: "#666" },
  cartControls: { display: "flex", alignItems: "center", gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    background: "#f1f5f9",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyDisplay: { fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" },
  removeBtn: {
    fontSize: 12,
    color: "#dc2626",
    background: "none",
    border: "none",
    cursor: "pointer",
    marginLeft: 8,
  },
  cartFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    marginTop: 6,
  },
  cartTotal: { fontSize: 18, fontWeight: 700, color: "#0f766e" },
  placeOrderBtn: {
    padding: "10px 24px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
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
  cardFooterLeft: { display: "flex", alignItems: "center", gap: 8 },
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
  addBtn: {
    padding: "6px 16px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  addedBtn: {
    padding: "6px 16px",
    background: "#d8eeea",
    color: "#0f766e",
    border: "1px solid #0f766e",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
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
  cartBtn: {
    padding: "8px 14px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
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
