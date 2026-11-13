import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5230/api";

function authHeaders(): HeadersInit {
  const auth = localStorage.getItem("auth");
  const token = auth ? JSON.parse(auth).token : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface CompanyInfo {
  id: number;
  name: string;
  createdAt: string;
  userCount: number;
  menuItemCount: number;
  todayOrders: number;
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [companyUsers, setCompanyUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadCompanies() {
    try {
      const res = await fetch(`${API}/company`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load");
      setCompanies(await res.json());
    } catch {
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCompanies(); }, []);

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API}/company`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to create company");
      }
      setNewName("");
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function loadUsers(companyId: number) {
    setSelectedCompany(companyId);
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API}/company/${companyId}/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load");
      setCompanyUsers(await res.json());
    } catch {
      setCompanyUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function toggleRole(userId: number, currentRole: string) {
    const newRole = currentRole === "CompanyAdmin" ? "User" : "CompanyAdmin";
    try {
      await fetch(`${API}/company/users/${userId}/role`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (selectedCompany) await loadUsers(selectedCompany);
    } catch {
      setError("Failed to update role");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Super Admin Dashboard</h1>
          <p style={styles.subtitle}>Manage all companies</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate("/")} style={styles.navBtn}>Menu</button>
          <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={createCompany} style={styles.createForm}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New company name"
          style={styles.input}
        />
        <button type="submit" disabled={creating} style={styles.createBtn}>
          {creating ? "Creating..." : "Add Company"}
        </button>
      </form>

      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : (
        <div style={styles.grid}>
          {companies.map((c) => (
            <div
              key={c.id}
              style={{
                ...styles.card,
                border: selectedCompany === c.id ? "2px solid #0f766e" : "1px solid #e2e8f0",
              }}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.cardName}>{c.name}</h3>
              </div>
              <div style={styles.stats}>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{c.userCount}</span>
                  <span style={styles.statLabel}>Users</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{c.menuItemCount}</span>
                  <span style={styles.statLabel}>Menu Items</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{c.todayOrders}</span>
                  <span style={styles.statLabel}>Today's Orders</span>
                </div>
              </div>
              <button
                onClick={() => loadUsers(c.id)}
                style={styles.viewUsersBtn}
              >
                {selectedCompany === c.id ? "Refresh Users" : "View Users"}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedCompany && (
        <div style={styles.usersPanel}>
          <h3 style={styles.usersPanelTitle}>
            Users — {companies.find((c) => c.id === selectedCompany)?.name}
          </h3>
          {loadingUsers ? (
            <p>Loading...</p>
          ) : companyUsers.length === 0 ? (
            <p style={{ color: "#888" }}>No users yet</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {companyUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={styles.td}>{u.name}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <span style={u.role === "CompanyAdmin" ? styles.adminBadge : styles.userBadge}>
                        {u.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        style={styles.toggleBtn}
                      >
                        {u.role === "CompanyAdmin" ? "Demote to User" : "Promote to Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
  createForm: { display: "flex", gap: 8, marginBottom: 24 },
  input: {
    flex: 1,
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
  },
  createBtn: {
    padding: "10px 20px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  cardHeader: { marginBottom: 16 },
  cardName: { margin: 0, fontSize: 18, fontWeight: 600 },
  stats: { display: "flex", gap: 16, marginBottom: 16 },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  statValue: { fontSize: 24, fontWeight: 700, color: "#0f766e" },
  statLabel: { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  viewUsersBtn: {
    width: "100%",
    padding: "8px 0",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
  },
  usersPanel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 20,
  },
  usersPanelTitle: { margin: "0 0 16px", fontSize: 18, fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "2px solid #e2e8f0",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#888",
    letterSpacing: 0.5,
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14 },
  adminBadge: {
    padding: "2px 8px",
    background: "#d8eeea",
    color: "#0f766e",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  userBadge: {
    padding: "2px 8px",
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
  },
  toggleBtn: {
    padding: "4px 12px",
    background: "#fff",
    color: "#0f766e",
    border: "1px solid #0f766e",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
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
};
