import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, getCompanies, type CompanyOption } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<number>(0);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getCompanies()
      .then((list) => {
        setCompanies(list);
        if (list.length > 0) setCompanyId(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isRegister
        ? await register(email, password, name, companyId)
        : await login(email, password);
      setAuth(res);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f5f5f5" }}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", width: 360 }}>
        <h2 style={{ marginTop: 0 }}>
          {isRegister ? "Create Account" : "Sign In"}
        </h2>
        <p style={{ color: "#666", fontSize: 14 }}>Company Canteen</p>

        {error && <p style={{ color: "red", fontSize: 14 }}>{error}</p>}

        {isRegister && (
          <>
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
            <select
              value={companyId}
              onChange={(e) => setCompanyId(Number(e.target.value))}
              required
              style={inputStyle}
            >
              <option value={0} disabled>Select your company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "..." : isRegister ? "Register" : "Sign In"}
        </button>

        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 0 }}>
          {isRegister ? "Already have an account?" : "No account yet?"}{" "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0, fontSize: 14 }}>
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "10px 12px", marginBottom: 12,
  border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: 12, background: "#2563eb",
  color: "#fff", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer",
};
