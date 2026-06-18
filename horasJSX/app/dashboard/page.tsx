"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Clock3, Download, MapPin, Plus, Sigma, TrendingUp, Users } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDisplayTime } from "@/lib/formatters";
import { measureAsync, measureSync } from "@/lib/performance";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  listCompanies,
  listDistanceTrips,
  listEmployees,
  listHourRecords,
} from "@/services/firestore-service";
import { exportTotalTripsToPDF } from "@/services/pdf-service";
import type { Company, DistanceTrip, Employee, HourRecord } from "@/types/models";

export default function DashboardPage() {
  const { tenantId } = useAuth();
  const { pdfIssuer } = useUserProfile();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [records, setRecords] = useState<HourRecord[]>([]);
  const [trips, setTrips] = useState<DistanceTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      try {
        await measureAsync("dashboard.load.total", async () => {
          const [nextEmployees, nextCompanies, nextRecords, nextTrips] = await Promise.all([
            listEmployees(tenantId),
            listCompanies(tenantId),
            listHourRecords(tenantId),
            listDistanceTrips(tenantId),
          ]);
          setEmployees(nextEmployees);
          setCompanies(nextCompanies);
          setRecords(nextRecords);
          setTrips(nextTrips);
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tenantId]);

  const summary = useMemo(
    () =>
      records.reduce(
        (acc, record) => ({
          hours: acc.hours + record.hoursWorked,
          cost: acc.cost + record.cost,
        }),
        { hours: 0, cost: 0 },
      ),
    [records],
  );

  const activeEmployees = employees.filter((employee) => employee.active).length;
  const companyName = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  );
  const distanceTotal = trips.reduce((sum, trip) => sum + trip.cost, 0);
  const grandTotal = summary.cost + distanceTotal;
  const latestRecords = records.slice(0, 6);

  function handleExportPdf() {
    setExportingPdf(true);
    try {
      measureSync("pdf.totalTrips.export", () =>
        exportTotalTripsToPDF({
          records,
          trips,
          employees,
          companies,
          issuer: pdfIssuer,
        }),
        { rows: records.length + trips.length },
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resumen operativo del tenant activo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/horas">
            <Button icon={<Plus className="h-4 w-4" />}>Registrar horas</Button>
          </Link>
          <Link href="/viajes">
            <Button variant="secondary" icon={<MapPin className="h-4 w-4" />}>
              Registrar viaje
            </Button>
          </Link>
          <Button
            type="button"
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExportPdf}
            disabled={exportingPdf || (records.length === 0 && trips.length === 0)}
          >
            {exportingPdf ? "Generando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={<Sigma className="h-5 w-5" />} label="Total" value={formatCurrency(grandTotal)} />
        <Metric href="/horas" icon={<Clock3 className="h-5 w-5" />} label="Viajes por hora" value={formatCurrency(summary.cost)} />
        <Metric href="/viajes" icon={<MapPin className="h-5 w-5" />} label="Viajes por distancia" value={formatCurrency(distanceTotal)} />
        <Metric icon={<TrendingUp className="h-5 w-5" />} label="Horas registradas" value={formatDisplayTime(summary.hours)} />
        <Metric href="/empleados" icon={<Users className="h-5 w-5" />} label="Empleados activos" value={String(activeEmployees)} />
        <Metric href="/empresas" icon={<Building2 className="h-5 w-5" />} label="Empresas" value={String(companies.length)} />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h3 className="text-lg font-bold">Ultimos registros</h3>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : latestRecords.length === 0 ? (
            <p className="text-sm text-slate-500">Todavia no hay registros.</p>
          ) : (
            latestRecords.map((record) => {
              const employee = employees.find((item) => item.id === record.employeeId);
              return (
                <article key={record.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {employee ? `${employee.firstName} ${employee.lastName}` : "Empleado no encontrado"}
                      </p>
                      <p className="text-sm text-slate-500">{record.date}</p>
                    </div>
                    <p className="shrink-0 text-right font-semibold">{formatCurrency(record.cost)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {formatDisplayTime(record.hoursWorked)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Empresa: {record.companyId ? companyName.get(record.companyId) ?? "Empresa no encontrada" : "-"}
                  </p>
                </article>
              );
            })
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Costo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Cargando...</td></tr>
              ) : latestRecords.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Todavia no hay registros.</td></tr>
              ) : latestRecords.map((record) => {
                const employee = employees.find((item) => item.id === record.employeeId);
                return (
                  <tr key={record.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">{record.date}</td>
                    <td className="px-4 py-3">{employee ? `${employee.firstName} ${employee.lastName}` : "Empleado no encontrado"}</td>
                    <td className="px-4 py-3">
                      {record.companyId ? companyName.get(record.companyId) ?? "Empresa no encontrada" : "-"}
                    </td>
                    <td className="px-4 py-3">{formatDisplayTime(record.hoursWorked)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(record.cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </ProtectedPage>
  );
}

function Metric({
  href,
  icon,
  label,
  value,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const content = (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-ocean dark:bg-teal-950">
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xl font-bold sm:text-2xl">{value}</p>
    </article>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-lg transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
    >
      {content}
    </Link>
  );
}
