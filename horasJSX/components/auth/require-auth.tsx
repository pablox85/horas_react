"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando sesion...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
