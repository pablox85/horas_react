"use client";

import { useState } from "react";
import { Clock3, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo iniciar sesion.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <section className="w-[calc(100vw-2rem)] max-w-md rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-soft dark:bg-slate-900 dark:text-white sm:p-6">
        <div className="mb-6 flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean text-white">
            <Clock3 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">Control de Horas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Acceso seguro con Firebase Auth</p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Email">
            <TextInput
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password">
            <TextInput
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} icon={<LogIn className="h-4 w-4" />}>
            {submitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
