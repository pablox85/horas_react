"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { CheckCircle2, Download, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { formatCurrency, formatISODate } from "@/lib/formatters";
import { measureAsync, measureSync } from "@/lib/performance";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { calculateKmCost } from "@/services/calculation-service";
import {
  deleteDistanceTrip,
  listCompanies,
  listDistanceTrips,
  saveDistanceTrip,
} from "@/services/firestore-service";
import { exportDistanceTripsToPDF } from "@/services/pdf-service";
import type { Company, DistanceTrip, UpsertDistanceTripInput } from "@/types/models";

interface TripForm {
  tripName: string;
  companyId: string;
  date: string;
  kilometers: number;
  ratePerKm: number;
  manualCost: number;
}

const emptyForm: TripForm = {
  tripName: "",
  companyId: "",
  date: formatISODate(new Date()),
  kilometers: 0,
  ratePerKm: 0,
  manualCost: 0,
};

function sortTripsByDate(trips: DistanceTrip[]) {
  return [...trips].sort((a, b) => b.date.localeCompare(a.date));
}

function getCompanyPricePerKm(company: Company | undefined): number | null {
  const pricePerKm = Number(company?.pricePerKm) || 0;
  return pricePerKm > 0 ? pricePerKm : null;
}

function getCompanyCreditBalance(company: Company | undefined): number {
  return Math.max(0, Number(company?.creditBalance ?? company?.credit_balance) || 0);
}

export default function DistanceTripsPage() {
  const { tenantId } = useAuth();
  const { pdfIssuer } = useUserProfile();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trips, setTrips] = useState<DistanceTrip[]>([]);
  const [form, setForm] = useState<TripForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const companyName = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  );
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const currentCost = calculateKmCost(
    Number(form.kilometers) || 0,
    Number(form.ratePerKm) || 0,
  );
  const manualCost = Number(form.manualCost) || 0;
  const displayCost = manualCost > 0 ? manualCost : currentCost;
  const totals = useMemo(
    () =>
      trips.reduce(
        (acc, trip) => ({
          kilometers: acc.kilometers + trip.kilometers,
          cost: acc.cost + trip.cost,
          discount: acc.discount + (trip.currentAccountDiscount ?? 0),
          pending:
            acc.pending +
            (trip.pendingAmount ?? trip.pending_amount ?? trip.pendingDebtAmount ?? 0),
        }),
        { kilometers: 0, cost: 0, discount: 0, pending: 0 },
      ),
    [trips],
  );

  const refresh = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    const [nextCompanies, nextTrips] = await Promise.all([
      listCompanies(tenantId),
      listDistanceTrips(tenantId),
    ]);
    setCompanies(nextCompanies);
    setTrips(nextTrips);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleCompanyChange(companyId: string) {
    const companyPricePerKm = getCompanyPricePerKm(companyById.get(companyId));

    setForm({
      ...form,
      companyId,
      ratePerKm: companyId ? companyPricePerKm ?? 0 : form.ratePerKm,
    });
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return;

    const tripName = form.tripName.trim();
    const kilometers = Number(form.kilometers) || 0;
    const manualCost = Number(form.manualCost) || 0;
    const selectedCompany = form.companyId ? companyById.get(form.companyId) : undefined;
    const companyPricePerKm = form.companyId ? getCompanyPricePerKm(selectedCompany) : null;
    const ratePerKm = companyPricePerKm ?? (Number(form.ratePerKm) || 0);
    const cost = manualCost > 0 ? manualCost : calculateKmCost(kilometers, ratePerKm);

    if (!tripName || !form.date || cost <= 0 || (manualCost <= 0 && (kilometers <= 0 || ratePerKm <= 0))) {
      setError("Ingresa viaje, fecha y un importe valido.");
      return;
    }

    const input: UpsertDistanceTripInput = {
      tripName,
      companyId: form.companyId || undefined,
      date: form.date,
      kilometers,
      ratePerKm,
      cost,
      costMode: manualCost > 0 ? "manual" : "calculated",
      manualCost: manualCost > 0 ? manualCost : undefined,
    };

    try {
      setSubmitting(true);
      setError("");
      const isEditing = Boolean(editingId);
      await measureAsync(
        "trips.save.total",
        async () => {
          const savedId = await measureAsync("trips.save.write", () =>
            saveDistanceTrip(tenantId, input, editingId ?? undefined),
          );
          const now = Timestamp.now();
          const balanceBefore = getCompanyCreditBalance(selectedCompany);
          const discount = editingId ? 0 : Math.min(balanceBefore, input.cost);
          const pendingAmount = editingId ? 0 : input.cost - discount;
          const balanceAfter = Math.max(0, balanceBefore - discount);
          const savedTrip: DistanceTrip = {
            id: savedId,
            tenantId,
            ...input,
            currentAccountDiscount: discount,
            creditBalanceAfter: balanceAfter,
            credit_balance_after: balanceAfter,
            pendingAmount,
            pending_amount: pendingAmount,
            pendingDebtAmount: pendingAmount,
            createdAt: now,
            updatedAt: now,
          };
          if (!editingId && input.companyId) {
            setCompanies((currentCompanies) =>
              currentCompanies.map((company) => {
                if (company.id !== input.companyId) return company;

                const nextBalance = Math.max(0, getCompanyCreditBalance(company) - discount);
                return {
                  ...company,
                  creditBalance: nextBalance,
                  credit_balance: nextBalance,
                  updatedAt: now,
                  updated_at: now,
                };
              }),
            );
          }
          setTrips((currentTrips) =>
            sortTripsByDate(
              editingId
                ? currentTrips.map((trip) =>
                    trip.id === savedId
                      ? { ...trip, ...input, updatedAt: now }
                      : trip,
                  )
                : [savedTrip, ...currentTrips],
            ),
          );
          setForm(emptyForm);
          setEditingId(null);
          setIsTripModalOpen(false);
          await measureAsync("trips.refresh.afterSave", refresh);
          measureSync("trips.localState.afterSave", () => undefined, {
            mode: editingId ? "edit" : "create",
          });
        },
        { mode: editingId ? "edit" : "create" },
      );
      setConfirmationMessage(isEditing ? "Viaje editado" : "Viaje agregado");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el viaje.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(trip: DistanceTrip) {
    setEditingId(trip.id);
    setForm({
      tripName: trip.tripName,
      companyId: trip.companyId ?? "",
      date: trip.date,
      kilometers: trip.kilometers,
      ratePerKm: getCompanyPricePerKm(companyById.get(trip.companyId ?? "")) ?? trip.ratePerKm,
      manualCost: trip.costMode === "manual" ? trip.manualCost ?? trip.cost : 0,
    });
    setIsTripModalOpen(true);
  }

  function resetFormState() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function openCreateTripModal() {
    resetFormState();
    setIsTripModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!tenantId) return;

    setDeletingId(id);
    try {
      await measureAsync("trips.delete.total", async () => {
        await measureAsync("trips.delete.write", () => deleteDistanceTrip(id, tenantId));
        await measureAsync("trips.refresh.afterDelete", refresh);
      });
      setConfirmationMessage("Viaje eliminado");
    } finally {
      setDeletingId(null);
    }
  }

  function handleExportPdf() {
    setExportingPdf(true);
    try {
      measureSync("pdf.trips.export", () =>
        exportDistanceTripsToPDF(trips, companies, pdfIssuer),
        { trips: trips.length },
      );
    } finally {
      setExportingPdf(false);
    }
  }

  const tripForm = (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field label="Viaje">
        <TextInput
          required
          placeholder="Ej: Montevideo - Las Piedras"
          value={form.tripName}
          onChange={(event) => setForm({ ...form, tripName: event.target.value })}
        />
      </Field>
      <Field label="Empresa">
        <SelectInput
          value={form.companyId}
          onChange={(event) => handleCompanyChange(event.target.value)}
        >
          <option value="">Sin empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Fecha">
        <TextInput
          required
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kilometros">
          <TextInput
            required
            min="0"
            step="0.1"
            type="number"
            value={form.kilometers || ""}
            onChange={(event) =>
              setForm({ ...form, kilometers: Number(event.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Precio por km">
          <TextInput
            required
            min="0"
            step="0.01"
            type="number"
            value={form.ratePerKm || ""}
            readOnly={Boolean(
              form.companyId && getCompanyPricePerKm(companyById.get(form.companyId)),
            )}
            onChange={(event) =>
              setForm({ ...form, ratePerKm: Number(event.target.value) || 0 })
            }
          />
        </Field>
      </div>
      <Field label="Importe manual">
        <TextInput
          min="0"
          step="0.01"
          type="number"
          value={form.manualCost || ""}
          onChange={(event) =>
            setForm({ ...form, manualCost: Number(event.target.value) || 0 })
          }
        />
      </Field>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total del viaje</p>
        <p className="text-3xl font-bold">{formatCurrency(displayCost)}</p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon={<Plus className="h-4 w-4" />} disabled={submitting}>
          {submitting ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
        </Button>
        {editingId ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetFormState();
              setIsTripModalOpen(false);
            }}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <ProtectedPage>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Viajes por distancia</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Calcula el importe como kilometros multiplicados por el precio manual por km.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:hidden">
          <h3 className="text-lg font-bold">Nuevo viaje</h3>
          <Button
            type="button"
            aria-label="Nuevo viaje"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreateTripModal}
          />
        </div>

        <section className="hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:block">
          <h3 className="mb-4 text-xl font-bold">
            {editingId ? "Editar viaje" : "Nuevo viaje"}
          </h3>
          {tripForm}
        </section>

        <section className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <MapPin className="mb-3 h-5 w-5 text-ocean" />
              <p className="text-sm text-slate-500">Kilometros</p>
              <p className="text-3xl font-bold">{totals.kilometers.toFixed(1)} km</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-3xl font-bold">{formatCurrency(totals.cost)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Viajes</p>
              <p className="text-3xl font-bold">{trips.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Descontado / pendiente</p>
              <p className="text-xl font-bold">{formatCurrency(totals.discount)}</p>
              <p className="text-sm text-slate-500">Pendiente: {formatCurrency(totals.pending)}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              onClick={handleExportPdf}
              disabled={exportingPdf || trips.length === 0}
            >
              {exportingPdf ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>

          <div className="grid gap-3 md:hidden">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Cargando...
              </div>
            ) : trips.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                No hay viajes por distancia registrados.
              </div>
            ) : (
              trips.map((trip) => (
                <article key={trip.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{trip.tripName}</p>
                      <p className="text-sm text-slate-500">{trip.date}</p>
                    </div>
                    <p className="shrink-0 text-right font-semibold">{formatCurrency(trip.cost)}</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Km</dt>
                      <dd className="font-semibold">{trip.kilometers.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Precio/km</dt>
                      <dd className="font-semibold">{formatCurrency(trip.ratePerKm)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Empresa</dt>
                      <dd className="break-words font-semibold">
                        {trip.companyId ? companyName.get(trip.companyId) ?? "Empresa no encontrada" : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Saldo</dt>
                      <dd className="font-semibold">{formatCurrency(trip.creditBalanceAfter ?? trip.credit_balance_after ?? 0)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(trip)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(trip.id)} disabled={deletingId === trip.id}>
                      {deletingId === trip.id ? "Eliminando..." : "Eliminar"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Viaje</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Km</th>
                  <th className="px-4 py-3">Precio/km</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      Cargando...
                    </td>
                  </tr>
                ) : trips.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      No hay viajes por distancia registrados.
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">{trip.date}</td>
                      <td className="px-4 py-3 font-semibold">{trip.tripName}</td>
                      <td className="px-4 py-3">
                        {trip.companyId ? companyName.get(trip.companyId) ?? "Empresa no encontrada" : "-"}
                      </td>
                      <td className="px-4 py-3">{trip.kilometers.toFixed(1)}</td>
                      <td className="px-4 py-3">{formatCurrency(trip.ratePerKm)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(trip.cost)}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(trip.creditBalanceAfter ?? trip.credit_balance_after ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            icon={<Pencil className="h-4 w-4" />}
                            onClick={() => startEdit(trip)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => handleDelete(trip.id)}
                            disabled={deletingId === trip.id}
                          >
                            {deletingId === trip.id ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {isTripModalOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 py-5 xl:hidden">
          <div className="mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-lg font-bold">{editingId ? "Editar viaje" : "Nuevo viaje"}</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsTripModalOpen(false);
                  resetFormState();
                }}
              >
                Cerrar
              </Button>
            </div>
            <div className="overflow-y-auto p-4">
              {tripForm}
            </div>
          </div>
        </div>
      ) : null}
      {confirmationMessage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-ocean" />
            <p className="text-xl font-bold">{confirmationMessage}</p>
            <Button type="button" className="mt-5 w-full justify-center" onClick={() => setConfirmationMessage("")}>
              Aceptar
            </Button>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
