import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMenuItems,
  createMenuItem,
  deleteMenuItem,
  type MenuItemResponse,
  type CreateMenuItemRequest,
} from "../api/menu";

const CATEGORIES = ["Veg", "NonVeg", "Beverage", "Snack"];

export default function MenuPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateMenuItemRequest>({
    name: "",
    price: 0,
    category: "Veg",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await getMenuItems();
      setItems(data);
    } catch {
      setError("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createMenuItem(formData);
      setItems((prev) => [...prev, created]);
      setShowForm(false);
      setFormData({ name: "", price: 0, category: "Veg" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Failed to delete item");
    }
  }

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  if (loading) return <div style={styles.container}><p>Loading...</p></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Menu Items</h1>
          <p style={styles.subtitle}>{items.length} items in catalogue</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            Back
          </button>
          <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
            {showForm ? "Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <h3 style={styles.formTitle}>New Menu Item</h3>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                required
                maxLength={100}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Price (₹)</label>
              <input
                style={styles.input}
                type="number"
                required
                min={1}
                step={0.5}
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number(e.target.value) })
                }
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.input}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Image URL</label>
              <input
                style={styles.input}
                value={formData.imageUrl || ""}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value || undefined })
                }
              />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <input
              style={styles.input}
              maxLength={500}
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value || undefined })
              }
            />
          </div>
          <button type="submit" disabled={saving} style={styles.addBtn}>
            {saving ? "Saving..." : "Create Item"}
          </button>
        </form>
      )}

      {grouped.map((group) => (
        <div key={group.category} style={styles.section}>
          <h2 style={styles.sectionTitle}>{group.category}</h2>
          <div style={styles.grid}>
            {group.items.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardName}>{item.name}</h3>
                  <span style={styles.price}>₹{item.price}</span>
                </div>
                {item.description && (
                  <p style={styles.cardDesc}>{item.description}</p>
                )}
                <div style={styles.cardFooter}>
                  <span style={styles.chip}>{item.category}</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && !loading && (
        <p style={styles.empty}>No menu items yet. Add one to get started.</p>
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
  form: {
    background: "#f8fafb",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: { margin: "0 0 16px", fontSize: 18 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#555" },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
  },
  addBtn: {
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
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #e2e8f0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardName: { margin: 0, fontSize: 16, fontWeight: 600 },
  price: { fontWeight: 700, color: "#0f766e", whiteSpace: "nowrap" },
  cardDesc: { margin: "0 0 10px", fontSize: 13, color: "#666" },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#d8eeea",
    color: "#0f766e",
  },
  deleteBtn: {
    fontSize: 12,
    color: "#dc2626",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
  },
  empty: { color: "#888", textAlign: "center", padding: 40 },
};
