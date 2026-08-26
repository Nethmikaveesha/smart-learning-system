import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const [token, setToken] = useState(localStorage.getItem("token") || null);

  const login = (userData, userToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  // Refresh role/profile from API so Super Admin promotion is reflected
  // without forcing a manual logout after backend restart.
  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    const refreshUser = async () => {
      try {
        const res = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !res.data?.user) return;
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);
      } catch (error) {
        const status = error.response?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          logout();
        }
      }
    };

    refreshUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
