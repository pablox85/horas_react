"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Clock3,
  Home,
  LogOut,
  MapPin,
  Moon,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/horas", label: "Horas", icon: Clock3 },
  { href: "/viajes", label: "Viajes", icon: MapPin },
  { href: "/empleados", label: "Empleados", icon: Users },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, tenantId, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean">
              Control de Horas
            </p>
            <h1 className="text-lg font-bold text-slate-950 dark:text-white">
              Operacion multi-tenant
            </h1>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-5 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
          <span>{user?.email ?? "Sesion activa"}</span>
          <span className="font-mono text-xs">tenantId: {tenantId ?? "cargando"}</span>
        </div>
        {children}
      </main>
    </div>
  );
}
