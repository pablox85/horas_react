"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Users } from "lucide-react";
import { ProtectedPage } from "@/components/layout/protected-page";
import { formatCurrency, formatDisplayTime } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { getCompany, listEmployees, listHourRecords } from "@/services/firestore-service";
import type { Company, Employee, HourRecord } from "@/types/models";

export default function CompanyDetailPage() {
  const params = useParams<{ empresaId: string }>();
  const { tenantId } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<HourRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      const [nextCompany, nextEmployees, nextRecords] = await Promise.all([
        getCompany(params.empresaId, tenantId),
        listEmployees(tenantId),
        listHourRecords(tenantId),
      ]);
      setCompany(nextCompany);
      setEmployees(nextEmployees.filter((employee) => employee.companyId === params.empresaId));
      setRecords(nextRecords.filter((record) => record.companyId === params.empresaId));
      setLoading(false);
    }

    void load();
  }, [params.empresaId, tenantId]);

  const totals = useMemo(
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

  return (
    <ProtectedPage>
      <div className="mb-5">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-ocean" href="/empresas">
          <ArrowLeft className="h-4 w-4" />
          Volver a empresas
        </Link>
      </div>

      {loading ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">Cargando...</section>
      ) : !company ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">Empresa no encontrada en este tenant.</section>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">RUT: {company.rut || "-"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{company.address || "Sin direccion"}</p>
            <p className="mt-3 font-semibold">Tarifa configurada: {formatCurrency(company.hourlyRate)}/hora</p>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Saldo a favor: {formatCurrency(Number(company.creditBalance ?? company.credit_balance) || 0)}
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Users className="mb-3 h-5 w-5 text-ocean" />
              <p className="text-sm text-slate-500">Empleados</p>
              <p className="text-3xl font-bold">{employees.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <Clock3 className="mb-3 h-5 w-5 text-ocean" />
              <p className="text-sm text-slate-500">Horas</p>
              <p className="text-3xl font-bold">{formatDisplayTime(totals.hours)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Facturacion</p>
              <p className="text-3xl font-bold">{formatCurrency(totals.cost)}</p>
            </div>
          </section>
        </div>
      )}
    </ProtectedPage>
  );
}
