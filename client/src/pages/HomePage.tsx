import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: "80px auto", padding: 24 }}>
      <h1>Company Canteen</h1>
      <p>Welcome, <strong>{user?.name}</strong>!</p>
      <p style={{ color: "#666" }}>Role: {user?.role}</p>
      <p style={{ color: "#999", fontSize: 14 }}>
        Menu, ordering, and feedback features coming soon.
      </p>
      <button onClick={logout} style={{ marginTop: 16, padding: "8px 20px", cursor: "pointer" }}>
        Sign Out
      </button>
    </div>
  );
}
