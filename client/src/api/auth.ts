const API = "http://localhost:5230/api/auth";

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  role: string;
  companyId: number | null;
  companyName: string | null;
}

export interface CompanyOption {
  id: number;
  name: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function register(email: string, password: string, name: string, companyId: number): Promise<AuthResponse> {
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, companyId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Registration failed");
  }
  return res.json();
}

export async function getCompanies(): Promise<CompanyOption[]> {
  const res = await fetch(`${API}/companies`);
  if (!res.ok) throw new Error("Failed to load companies");
  return res.json();
}
