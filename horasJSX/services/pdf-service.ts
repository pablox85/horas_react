"use client";

import { jsPDF } from "jspdf";
import { formatCurrency, formatDisplayTime } from "@/lib/formatters";
import { DEFAULT_HOURLY_RATE } from "@/services/calculation-service";
import type { Company, DistanceTrip, Employee, HourRecord } from "@/types/models";

export interface PdfIssuer {
  companyName?: string;
  companyRut?: string;
}

function resolvePdfHeaderTitle(fallbackTitle: string, issuer?: PdfIssuer) {
  const companyName = issuer?.companyName?.trim();
  const companyRut = issuer?.companyRut?.trim();

  return {
    title: companyName || fallbackTitle,
    rut: companyRut || "",
  };
}

function formatCompanyHeader(name: string, rut = "") {
  return rut ? `${name} - RUT: ${rut}` : name;
}

function resolveIssuerLine(issuer?: PdfIssuer) {
  const companyName = issuer?.companyName?.trim();
  if (!companyName) return "";

  return `Emisor: ${formatCompanyHeader(companyName, issuer?.companyRut?.trim() || "")}`;
}

function addPdfHeader(doc: jsPDF, title: string, rut = "", issuerLine = "") {
  const headerText = formatCompanyHeader(title, rut);

  doc.setFontSize(18);
  doc.text(headerText, 105, 18, { align: "center", maxWidth: 170 });
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-UY")}`, 105, 26, {
    align: "center",
  });

  if (issuerLine) {
    doc.text(issuerLine, 105, 34, { align: "center", maxWidth: 170 });
    doc.line(20, 40, 190, 40);
    return 52;
  }

  doc.line(20, 32, 190, 32);
  return 44;
}

function addWrappedNote(doc: jsPDF, note: string | undefined, y: number): number {
  const cleanNote = note?.trim();
  if (!cleanNote) return y;

  const noteLines = doc.splitTextToSize(`Nota: ${cleanNote}`, 165) as string[];

  if (y + noteLines.length * 5 > 270) {
    doc.addPage();
    y = 24;
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(noteLines, 20, y);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  return y + noteLines.length * 5 + 3;
}

export function exportHoursToPDF(
  records: HourRecord[],
  companies: Company[] = [],
  selectedCompanyId = "",
  issuer?: PdfIssuer,
) {
  if (records.length === 0) {
    window.alert("No hay registros para exportar.");
    return;
  }

  const companyName = new Map(companies.map((company) => [company.id, company.name]));
  const selectedCompany = selectedCompanyId
    ? companies.find((company) => company.id === selectedCompanyId)
    : null;
  const doc = new jsPDF();
  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
  const totalHours = records.reduce((sum, record) => sum + record.hoursWorked, 0);
  const header = selectedCompany
    ? { title: selectedCompany.name, rut: selectedCompany.rut || "" }
    : resolvePdfHeaderTitle("Control de Horas", issuer);
  const issuerLine = selectedCompany ? resolveIssuerLine(issuer) : "";

  let y = addPdfHeader(doc, header.title, header.rut, issuerLine);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha", 20, y);
  doc.text("Nota", 48, y);
  doc.text("Empresa", 104, y);
  doc.text("Horas", 136, y);
  doc.text("Costo", 162, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  records.forEach((record) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }

    doc.text(record.date, 20, y);
    doc.text(record.notes?.trim() || "-", 48, y, {
      maxWidth: 50,
    });
    doc.text(record.companyId ? companyName.get(record.companyId) ?? "-" : "-", 104, y, {
      maxWidth: 28,
    });
    doc.text(formatDisplayTime(record.hoursWorked), 136, y);
    doc.text(formatCurrency(record.cost), 162, y);
    y += 8;
  });

  y += 4;
  doc.line(20, y, 190, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 20, y);
  doc.text(formatDisplayTime(totalHours), 136, y);
  doc.text(formatCurrency(totalCost), 162, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text(`Tarifa base: ${formatCurrency(DEFAULT_HOURLY_RATE)}/hora`, 105, y, {
    align: "center",
  });

  doc.save(`control_horas_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportDistanceTripsToPDF(
  trips: DistanceTrip[],
  companies: Company[],
  issuer?: PdfIssuer,
) {
  if (trips.length === 0) {
    window.alert("No hay viajes para exportar.");
    return;
  }

  const companyName = new Map(companies.map((company) => [company.id, company.name]));
  const doc = new jsPDF();
  const totalKm = trips.reduce((sum, trip) => sum + trip.kilometers, 0);
  const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);
  const header = resolvePdfHeaderTitle("Viajes por Distancia", issuer);

  let y = addPdfHeader(doc, header.title, header.rut);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha", 20, y);
  doc.text("Viaje", 46, y);
  doc.text("Km", 108, y);
  doc.text("Precio/km", 128, y);
  doc.text("Total", 164, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  trips.forEach((trip) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }

    const company = trip.companyId ? companyName.get(trip.companyId) : null;
    const tripLabel = company ? `${trip.tripName} (${company})` : trip.tripName;

    doc.text(trip.date, 20, y);
    doc.text(tripLabel, 46, y, { maxWidth: 56 });
    doc.text(trip.kilometers.toFixed(1), 108, y);
    doc.text(formatCurrency(trip.ratePerKm), 128, y);
    doc.text(formatCurrency(trip.cost), 164, y);
    y += 8;
  });

  y += 4;
  doc.line(20, y, 190, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 20, y);
  doc.text(`${totalKm.toFixed(1)} km`, 108, y);
  doc.text(formatCurrency(totalCost), 164, y);

  doc.save(`viajes_distancia_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportTotalTripsToPDF({
  records,
  trips,
  employees,
  companies,
  issuer,
}: {
  records: HourRecord[];
  trips: DistanceTrip[];
  employees: Employee[];
  companies: Company[];
  issuer?: PdfIssuer;
}) {
  if (records.length === 0 && trips.length === 0) {
    window.alert("No hay viajes para exportar.");
    return;
  }

  const employeeName = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`.trim(),
    ]),
  );
  const companyName = new Map(companies.map((company) => [company.id, company.name]));
  const rows = [
    ...records.map((record) => ({
      date: record.date,
      description: employeeName.get(record.employeeId) || "Viaje por hora",
      company: record.companyId ? companyName.get(record.companyId) ?? "" : "",
      detail: formatDisplayTime(record.hoursWorked),
      note: record.notes,
      cost: record.cost,
    })),
    ...trips.map((trip) => ({
      date: trip.date,
      description: trip.tripName,
      company: trip.companyId ? companyName.get(trip.companyId) ?? "" : "",
      detail: `${trip.kilometers.toFixed(1)} km`,
      note: "",
      cost: trip.cost,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const doc = new jsPDF();
  const header = resolvePdfHeaderTitle("Total de Viajes", issuer);

  let y = addPdfHeader(doc, header.title, header.rut);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha", 20, y);
  doc.text("Viaje", 46, y);
  doc.text("Empresa", 108, y);
  doc.text("Detalle", 140, y);
  doc.text("Total", 166, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  rows.forEach((row) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }

    doc.text(row.date, 20, y);
    doc.text(row.description, 46, y, { maxWidth: 56 });
    doc.text(row.company || "-", 108, y, { maxWidth: 28 });
    doc.text(row.detail, 140, y);
    doc.text(formatCurrency(row.cost), 166, y);
    y += 8;
    y = addWrappedNote(doc, row.note, y);
  });

  y += 4;
  doc.line(20, y, 190, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 20, y);
  doc.text(formatCurrency(totalCost), 166, y);

  doc.save(`total_viajes_${new Date().toISOString().split("T")[0]}.pdf`);
}
