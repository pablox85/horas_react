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
import { isDemoIdentity, resetDemoStore, setDemoMode } from "@/lib/demo";
import { resolveTenantId, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/tenant";

type AuthenticatedUser = Pick<User, "uid" | "email" | "displayName"> & {
  isDemo: boolean;
};

interface AuthState {
  user: AuthenticatedUser | null;
  tenantId: string | null;
  isDemo: boolean;
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
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth no está inicializado. Revisá .env.local");
      setUser(null);
      setTenantId(null);
      setLoading(false);

      if (pathname !== "/login") {
        router.replace("/login");
      }

      return;
    }

    void setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const nextIsDemo = isDemoIdentity({
            email: firebaseUser.email,
            claims: tokenResult.claims,
          });

          setDemoMode(nextIsDemo);
          setIsDemo(nextIsDemo);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            isDemo: nextIsDemo,
          });

          const token = await firebaseUser.getIdToken();
          const nextTenantId = await resolveTenantId(firebaseUser);

          setTenantId(nextTenantId);
          writeCookie(SESSION_COOKIE, token, 60 * 60 * 24 * 7);
          writeCookie(TENANT_COOKIE, nextTenantId, 60 * 60 * 24 * 7);

          if (pathname === "/login" || pathname === "/") {
            router.replace("/dashboard");
          }
        } else {
          setUser(null);
          setTenantId(null);
          setIsDemo(false);
          setDemoMode(false);
          resetDemoStore();
          clearCookie(SESSION_COOKIE);
          clearCookie(TENANT_COOKIE);

          if (pathname !== "/login") {
            router.replace("/login");
          }
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        throw new Error("Firebase Auth no está configurado.");
      }

      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
    },
    []
  );

  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase Auth no está configurado.");
    }

    await signOut(auth);
    setDemoMode(false);
    resetDemoStore();
    clearCookie(SESSION_COOKIE);
    clearCookie(TENANT_COOKIE);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      tenantId,
      isDemo,
      loading,
      login,
      logout,
    }),
    [user, tenantId, isDemo, loading, login, logout]
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
