"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextareaInput, TextInput } from "@/components/ui/field";
import { formatCurrency, formatDisplayTime, formatISODate, formatTime } from "@/lib/formatters";
import { measureAsync, measureSync } from "@/lib/performance";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { calculateCost, calculateTotalHours, DEFAULT_HOURLY_RATE } from "@/services/calculation-service";
import {
  deleteHourRecord,
  listCompanies,
  listEmployees,
  listHourRecords,
  saveHourRecord,
} from "@/services/firestore-service";
import { exportHoursToPDF } from "@/services/pdf-service";
import type { Company, Employee, HourRecord, UpsertHourRecordInput } from "@/types/models";

const TIMER_STORAGE_KEY = "control_horas_timer";

type EntryMode = "manual" | "timer";

interface HourForm {
  employeeId: string;
  companyId: string;
  date: string;
  hours: number;
  minutes: number;
  notes: string;
}

const emptyForm: HourForm = {
  employeeId: "",
  companyId: "",
  date: formatISODate(new Date()),
  hours: 0,
  minutes: 0,
  notes: "",
};

export default function HoursPage() {
  const { tenantId } = useAuth();
  const { pdfIssuer } = useUserProfile();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [records, setRecords] = useState<HourRecord[]>([]);
  const [form, setForm] = useState<HourForm>(emptyForm);
  const [mode, setMode] = useState<EntryMode>("manual");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const timerStartRef = useRef<number | null>(null);

  const activeEmployees = employees.filter((employee) => employee.active);
  const employeeName = useMemo(
    () => new Map(employees.map((employee) => [employee.id, `${employee.firstName} ${employee.lastName}`])),
    [employees],
  );
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const companyName = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  );
  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        if (employeeFilter && record.employeeId !== employeeFilter) return false;
        if (companyFilter && record.companyId !== companyFilter) return false;
        if (fromFilter && record.date < fromFilter) return false;
        if (toFilter && record.date > toFilter) return false;
        return true;
      }),
    [records, employeeFilter, companyFilter, fromFilter, toFilter],
  );
  const totals = useMemo(
    () =>
      visibleRecords.reduce(
        (acc, record) => ({
          hours: acc.hours + record.hoursWorked,
          cost: acc.cost + record.cost,
        }),
        { hours: 0, cost: 0 },
      ),
    [visibleRecords],
  );

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const [nextEmployees, nextCompanies, nextRecords] = await Promise.all([
      listEmployees(tenantId),
      listCompanies(tenantId),
      listHourRecords(tenantId),
    ]);
    setEmployees(nextEmployees);
    setCompanies(nextCompanies);
    setRecords(nextRecords);
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as { startedAt?: number };
    if (!parsed.startedAt) return;
    timerStartRef.current = parsed.startedAt;
    setTimerSeconds(Math.floor((Date.now() - parsed.startedAt) / 1000));
    setIsTimerRunning(true);
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = window.setInterval(() => {
      if (timerStartRef.current) {
        setTimerSeconds(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  function startTimer() {
    const startedAt = Date.now() - timerSeconds * 1000;
    timerStartRef.current = startedAt;
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ startedAt }));
    setIsTimerRunning(true);
  }

  function stopTimer() {
    setIsTimerRunning(false);
    timerStartRef.current = null;
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return;
    setError("");

    const totalHours = calculateTotalHours({
      mode,
      hours: Number(form.hours) || 0,
      minutes: Number(form.minutes) || 0,
      timerSeconds,
    });

    if (!form.employeeId || !form.date || totalHours === null) {
      setError("Selecciona empleado, fecha y un tiempo valido.");
      return;
    }

    const selectedCompany = form.companyId ? companyById.get(form.companyId) : null;
    const input: UpsertHourRecordInput = {
      employeeId: form.employeeId,
      companyId: form.companyId || undefined,
      date: form.date,
      hoursWorked: totalHours,
      notes: form.notes.trim() || undefined,
      cost: calculateCost(totalHours, selectedCompany?.hourlyRate ?? DEFAULT_HOURLY_RATE),
      source: mode,
    };

    try {
      setSubmitting(true);
      await measureAsync(
        "hours.save.total",
        async () => {
          await measureAsync("hours.save.write", () =>
            saveHourRecord(tenantId, input, editingId ?? undefined),
          );
          setForm(emptyForm);
          setEditingId(null);
          setTimerSeconds(0);
          stopTimer();
          await measureAsync("hours.refresh.afterSave", refresh);
        },
        { mode: editingId ? "edit" : "create" },
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(record: HourRecord) {
    const hours = Math.floor(record.hoursWorked);
    const minutes = Math.round((record.hoursWorked - hours) * 60);
    setEditingId(record.id);
    setMode("manual");
    setForm({
      employeeId: record.employeeId,
      companyId: record.companyId ?? "",
      date: record.date,
      hours,
      minutes,
      notes: record.notes ?? "",
    });
  }

  async function handleDelete(id: string) {
    if (!tenantId || !window.confirm("Eliminar registro de horas?")) return;
    setDeletingId(id);
    try {
      await measureAsync("hours.delete.total", async () => {
        await measureAsync("hours.delete.write", () => deleteHourRecord(id, tenantId));
        await measureAsync("hours.refresh.afterDelete", refresh);
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleExportPdf() {
    setExportingPdf(true);
    try {
      measureSync("pdf.hours.export", () =>
        exportHoursToPDF(visibleRecords, companies, companyFilter, pdfIssuer),
        { records: visibleRecords.length },
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-xl font-bold">{editingId ? "Editar horas" : "Registrar horas"}</h2>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field label="Empleado">
              <SelectInput required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
                <option value="">Seleccionar</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Empresa">
              <SelectInput value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })}>
                <option value="">Sin empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Fecha">
              <TextInput required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button type="button" onClick={() => setMode("manual")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "manual" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500"}`}>Manual</button>
              <button type="button" onClick={() => setMode("timer")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "timer" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500"}`}>Timer</button>
            </div>

            {mode === "manual" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horas">
                  <TextInput type="number" min="0" value={form.hours || ""} onChange={(event) => setForm({ ...form, hours: Number(event.target.value) || 0 })} />
                </Field>
                <Field label="Minutos">
                  <TextInput type="number" min="0" max="59" value={form.minutes || ""} onChange={(event) => setForm({ ...form, minutes: Number(event.target.value) || 0 })} />
                </Field>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 p-4 text-center dark:border-slate-800">
                <p className="font-mono text-4xl font-bold">{formatTime(timerSeconds)}</p>
                <div className="mt-4 flex justify-center gap-2">
                  {isTimerRunning ? (
                    <Button type="button" variant="danger" icon={<Square className="h-4 w-4" />} onClick={stopTimer}>Detener</Button>
                  ) : (
                    <Button type="button" icon={<Play className="h-4 w-4" />} onClick={startTimer}>Iniciar</Button>
                  )}
                </div>
              </div>
            )}

            <Field label="Notas">
              <TextareaInput value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" icon={<Plus className="h-4 w-4" />} disabled={submitting}>{submitting ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}</Button>
              {editingId ? <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</Button> : null}
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Horas filtradas</p>
              <p className="text-3xl font-bold">{formatDisplayTime(totals.hours)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-3xl font-bold">{formatCurrency(totals.cost)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Registros</p>
              <p className="text-3xl font-bold">{visibleRecords.length}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_160px_auto]">
              <SelectInput value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
                <option value="">Empleados</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
              </SelectInput>
              <SelectInput value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                <option value="">Empresas</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </SelectInput>
              <TextInput type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} />
              <TextInput type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} />
              <Button type="button" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExportPdf} disabled={exportingPdf || visibleRecords.length === 0}>
                {exportingPdf ? "Generando..." : "Descargar PDF"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {visibleRecords.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                No hay registros para mostrar.
              </div>
            ) : (
              visibleRecords.map((record) => (
                <article key={record.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {employeeName.get(record.employeeId) ?? "Empleado no encontrado"}
                      </p>
                      <p className="text-sm text-slate-500">{record.date}</p>
                    </div>
                    <p className="shrink-0 text-right font-semibold">{formatCurrency(record.cost)}</p>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <span>
                      Empresa: {record.companyId ? companyName.get(record.companyId) ?? "Empresa no encontrada" : "-"}
                    </span>
                    <span>{formatDisplayTime(record.hoursWorked)}</span>
                    {record.notes ? <span className="break-words">{record.notes}</span> : null}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(record)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(record.id)} disabled={deletingId === record.id}>
                      {deletingId === record.id ? "Eliminando..." : "Eliminar"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Horas</th>
                  <th className="px-4 py-3">Costo</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No hay registros para mostrar.</td></tr>
                ) : visibleRecords.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">{record.date}</td>
                    <td className="px-4 py-3">{employeeName.get(record.employeeId) ?? "Empleado no encontrado"}</td>
                    <td className="px-4 py-3">
                      {record.companyId ? companyName.get(record.companyId) ?? "Empresa no encontrada" : "-"}
                    </td>
                    <td className="px-4 py-3">{formatDisplayTime(record.hoursWorked)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(record.cost)}</td>
                    <td className="max-w-[260px] truncate px-4 py-3">{record.notes || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(record)}>Editar</Button>
                        <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(record.id)} disabled={deletingId === record.id}>
                          {deletingId === record.id ? "Eliminando..." : "Eliminar"}
                        </Button>
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
