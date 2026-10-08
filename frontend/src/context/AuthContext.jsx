import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("credo_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, confirm it's still valid and refresh the
  // user object (covers cases where role/institution status changed since
  // the token was issued).
  useEffect(() => {
    const token = localStorage.getItem("credo_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("credo_user", JSON.stringify(data.user));
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("credo_token", data.token);
    localStorage.setItem("credo_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const registerStudent = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register/student", payload);
    localStorage.setItem("credo_token", data.token);
    localStorage.setItem("credo_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const registerInstitution = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register/institution", payload);
    localStorage.setItem("credo_token", data.token);
    localStorage.setItem("credo_user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("credo_token");
    localStorage.removeItem("credo_user");
    setUser(null);
  }, []);

  const value = { user, loading, login, registerStudent, registerInstitution, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
