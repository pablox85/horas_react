"use client";

import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "@/lib/firebase";
import { resolveTenantId, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/tenant";

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "demo1";
const DEMO_TENANT_ID = "demo-local";
const DEMO_SESSION_KEY = "control_horas_demo_session";

type AuthenticatedUser = Pick<User, "uid" | "email" | "displayName">;

interface AuthState {
  user: AuthenticatedUser | null;
  tenantId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function writeCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      const hasDemoSession = localStorage.getItem(DEMO_SESSION_KEY) === "true";

      if (hasDemoSession) {
        setUser({
          uid: "local-demo-user",
          email: DEMO_EMAIL,
          displayName: "Usuario Demo",
        });
        setTenantId(DEMO_TENANT_ID);
        writeCookie(SESSION_COOKIE, "local-demo-session", 60 * 60 * 24 * 7);
        writeCookie(TENANT_COOKIE, DEMO_TENANT_ID, 60 * 60 * 24 * 7);

        if (pathname === "/login" || pathname === "/") {
          router.replace("/dashboard");
        }
      } else if (pathname !== "/login") {
        router.replace("/login");
      }

      setLoading(false);
      return;
    }

    void setPersistence(auth, browserLocalPersistence);

    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const nextTenantId = await resolveTenantId(firebaseUser);
        setTenantId(nextTenantId);
        writeCookie(SESSION_COOKIE, token, 60 * 60 * 24 * 7);
        writeCookie(TENANT_COOKIE, nextTenantId, 60 * 60 * 24 * 7);

        if (pathname === "/login" || pathname === "/") {
          router.replace("/dashboard");
        }
      } else {
        setTenantId(null);
        clearCookie(SESSION_COOKIE);
        clearCookie(TENANT_COOKIE);

        if (pathname !== "/login") {
          router.replace("/login");
        }
      }

      setLoading(false);
    });
  }, [pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) {
      if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        throw new Error("Credenciales demo invalidas.");
      }

      localStorage.setItem(DEMO_SESSION_KEY, "true");
      setUser({
        uid: "local-demo-user",
        email: DEMO_EMAIL,
        displayName: "Usuario Demo",
      });
      setTenantId(DEMO_TENANT_ID);
      writeCookie(SESSION_COOKIE, "local-demo-session", 60 * 60 * 24 * 7);
      writeCookie(TENANT_COOKIE, DEMO_TENANT_ID, 60 * 60 * 24 * 7);
      router.replace("/dashboard");
      return;
    }

    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }, [router]);

  const logout = useCallback(async () => {
    if (!auth) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setTenantId(null);
      clearCookie(SESSION_COOKIE);
      clearCookie(TENANT_COOKIE);
      router.replace("/login");
      return;
    }

    await signOut(auth);
  }, [router]);

  const value = useMemo(
    () => ({ user, tenantId, loading, login, logout }),
    [user, tenantId, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
