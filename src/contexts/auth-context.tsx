import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiLogin, apiPost } from "../lib/api";
import type { AuthUser } from "../types/domain";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await apiGet<{
        success?: boolean;
        logged_in?: boolean;
        user?: AuthUser;
      }>("/check_session.php");
      if (r.success && r.logged_in && r.user) {
        setUser(r.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (loginStr: string, senha: string) => {
    const r = await apiLogin({ login: loginStr, senha });
    if (r.success && r.user) {
      setUser(r.user as AuthUser);
      await refresh();
      return;
    }
    throw new Error("Resposta inválida do servidor");
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/logout.php", {});
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
