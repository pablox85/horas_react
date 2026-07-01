"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { formatCurrency } from "@/lib/formatters";
import { measureAsync } from "@/lib/performance";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteCompany,
  listCompanies,
  listCurrentAccounts,
  saveCompany,
  saveCurrentAccount,
} from "@/services/firestore-service";
import type { Company, CurrentAccount, UpsertCompanyInput } from "@/types/models";

const emptyForm: UpsertCompanyInput = {
  name: "",
  rut: "",
  address: "",
  contactEmail: "",
  hourlyRate: 625,
  pricePerKm: undefined,
};

export default function CompaniesPage() {
  const { tenantId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
  const [form, setForm] = useState<UpsertCompanyInput>(emptyForm);
  const [accountSaldo, setAccountSaldo] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const accountByCompany = new Map(
    currentAccounts.map((account) => [account.companyId, account]),
  );

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError("");

    try {
      const [nextCompanies, nextCurrentAccounts] = await Promise.all([
        listCompanies(tenantId),
        listCurrentAccounts(tenantId),
      ]);
      setCompanies(nextCompanies);
      setCurrentAccounts(nextCurrentAccounts);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudieron cargar las empresas.";
      console.error("Error cargando empresas:", caught);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return;
    setError("");

    try {
      setSubmitting(true);
      await measureAsync(
        "companies.save.total",
        async () => {
          await measureAsync("companies.save.write", () =>
            saveCompany(
              tenantId,
              {
                ...form,
                name: form.name.trim(),
                rut: form.rut?.trim() || "",
                address: form.address?.trim() || "",
                contactEmail: form.contactEmail?.trim() || "",
                hourlyRate: Number(form.hourlyRate) || 0,
                pricePerKm: Number(form.pricePerKm) || undefined,
              },
              editingId ?? undefined,
            ).then((companyId) =>
              saveCurrentAccount(tenantId, {
                companyId,
                saldo: Number(accountSaldo) || 0,
              }),
            ),
          );
          setForm(emptyForm);
          setAccountSaldo(0);
          setEditingId(null);
          await measureAsync("companies.refresh.afterSave", refresh);
        },
        { mode: editingId ? "edit" : "create" },
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!tenantId || !window.confirm("Eliminar empresa?")) return;
    setDeletingId(id);
    try {
      await measureAsync("companies.delete.total", async () => {
        await measureAsync("companies.delete.write", () => deleteCompany(id, tenantId));
        await measureAsync("companies.refresh.afterDelete", refresh);
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la empresa.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(company: Company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      rut: company.rut ?? "",
      address: company.address ?? "",
      contactEmail: company.contactEmail ?? "",
      hourlyRate: company.hourlyRate,
      pricePerKm: company.pricePerKm,
    });
    setAccountSaldo(accountByCompany.get(company.id)?.saldo ?? 0);
  }

  return (
    <ProtectedPage>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold">{editingId ? "Editar empresa" : "Nueva empresa"}</h2>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field label="Nombre">
              <TextInput required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="RUT">
              <TextInput value={form.rut} onChange={(event) => setForm({ ...form, rut: event.target.value })} />
            </Field>
            <Field label="Direccion">
              <TextInput value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
            <Field label="Email de contacto">
              <TextInput type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            </Field>
            <Field label="Tarifa por hora">
              <TextInput type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: Number(event.target.value) || 0 })} />
            </Field>
            <Field label="Precio por km">
              <TextInput type="number" min="0" step="0.01" value={form.pricePerKm || ""} onChange={(event) => setForm({ ...form, pricePerKm: Number(event.target.value) || undefined })} />
            </Field>
            <Field label="Saldo a favor">
              <TextInput type="number" min="0" step="0.01" value={accountSaldo || ""} onChange={(event) => setAccountSaldo(Number(event.target.value) || 0)} />
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" icon={<Plus className="h-4 w-4" />} disabled={submitting}>
                {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          {error && !loading ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">Cargando...</div>
          ) : companies.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900">No hay empresas registradas.</div>
          ) : companies.map((company) => (
            <article key={company.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-ocean" />
                    <h3 className="text-lg font-bold">{company.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">RUT: {company.rut || "-"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{company.address || "Sin direccion"}</p>
                  <p className="mt-2 text-sm font-semibold">Tarifa: {formatCurrency(company.hourlyRate)}/hora</p>
                  <p className="text-sm font-semibold">Precio/km: {company.pricePerKm ? formatCurrency(company.pricePerKm) : "-"}</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Saldo a favor: {formatCurrency(accountByCompany.get(company.id)?.saldo ?? 0)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" href={`/empresas/${company.id}`}>
                    <ExternalLink className="h-4 w-4" />
                    Ver
                  </Link>
                  <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(company)}>Editar</Button>
                  <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(company.id)} disabled={deletingId === company.id}>
                    {deletingId === company.id ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </ProtectedPage>
  );
}
