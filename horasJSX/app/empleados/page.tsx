"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { useAuth } from "@/hooks/use-auth";
import { listCompanies, listEmployees, saveEmployee, deleteEmployee } from "@/services/firestore-service";
import type { Company, Employee, UpsertEmployeeInput } from "@/types/models";

const emptyForm: UpsertEmployeeInput = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  companyId: "",
  active: true,
};

export default function EmployeesPage() {
  const { tenantId } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<UpsertEmployeeInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const companyName = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  );

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [nextEmployees, nextCompanies] = await Promise.all([
      listEmployees(tenantId),
      listCompanies(tenantId),
    ]);
    setEmployees(nextEmployees);
    setCompanies(nextCompanies);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return;
    setError("");

    try {
      await saveEmployee(
        tenantId,
        {
          ...form,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email?.trim() || "",
          role: form.role?.trim() || "",
          companyId: form.companyId || "",
        },
        editingId ?? undefined,
      );
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el empleado.");
    }
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email ?? "",
      role: employee.role ?? "",
      companyId: employee.companyId ?? "",
      active: employee.active,
    });
  }

  async function handleDelete(id: string) {
    if (!tenantId || !window.confirm("Eliminar empleado?")) return;
    await deleteEmployee(id, tenantId);
    await refresh();
  }

  return (
    <ProtectedPage>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold">{editingId ? "Editar empleado" : "Alta de empleado"}</h2>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Nombre">
                <TextInput required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
              </Field>
              <Field label="Apellido">
                <TextInput required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              </Field>
            </div>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </Field>
            <Field label="Rol">
              <TextInput value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
            </Field>
            <Field label="Empresa">
              <SelectInput value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })}>
                <option value="">Sin empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </SelectInput>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Activo
            </label>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" icon={<Plus className="h-4 w-4" />}>{editingId ? "Actualizar" : "Crear"}</Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-xl font-bold">Listado de empleados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Cargando...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No hay empleados registrados.</td></tr>
                ) : employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                      <div className="text-xs text-slate-500">{employee.email}</div>
                    </td>
                    <td className="px-4 py-3">{employee.companyId ? companyName.get(employee.companyId) ?? "Empresa no encontrada" : "-"}</td>
                    <td className="px-4 py-3">{employee.role || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${employee.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {employee.active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {employee.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(employee)}>Editar</Button>
                        <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(employee.id)}>Baja</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
