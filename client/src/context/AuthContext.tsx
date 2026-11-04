import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthResponse } from "../api/auth";

interface AuthState {
  token: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthState | null;
  setAuth: (res: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(() => {
    try {
      const stored = localStorage.getItem("auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  function setAuth(res: AuthResponse) {
    const state: AuthState = { token: res.token, email: res.email, name: res.name, role: res.role };
    localStorage.setItem("auth", JSON.stringify(state));
    setUser(state);
  }

  function logout() {
    localStorage.removeItem("auth");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
