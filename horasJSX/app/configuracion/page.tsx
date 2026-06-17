"use client";

import { ShieldCheck } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { tenantId, user } = useAuth();

  return (
    <ProtectedPage>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-ocean" />
            <h2 className="text-2xl font-bold">Configuracion SaaS</h2>
          </div>
          <div className="grid gap-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              La aplicacion usa Firebase Authentication para iniciar sesion y Cloud Firestore
              para datos operativos. Todas las colecciones principales guardan y consultan con
              <span className="font-mono"> tenantId</span>.
            </p>
            <p>
              Para tenants productivos, asigna el claim <span className="font-mono">tenantId</span>
              al usuario desde un proceso administrativo seguro. Si el claim no existe, la app usa
              un tenant derivado del UID para aislar la informacion.
            </p>
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-bold">Sesion actual</h3>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{user?.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">UID</dt>
              <dd className="break-all font-mono text-xs">{user?.uid ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tenant</dt>
              <dd className="break-all font-mono text-xs">{tenantId ?? "-"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </ProtectedPage>
  );
}
