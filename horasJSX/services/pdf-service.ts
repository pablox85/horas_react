"use client";

import { jsPDF } from "jspdf";
import { formatCurrency, formatDisplayTime } from "@/lib/formatters";
import { DEFAULT_HOURLY_RATE } from "@/services/calculation-service";
import type { Company, DistanceTrip, Employee, HourRecord } from "@/types/models";

export function exportHoursToPDF(records: HourRecord[], employees: Employee[]) {
  if (records.length === 0) {
    window.alert("No hay registros para exportar.");
    return;
  }

  const employeeName = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`.trim(),
    ]),
  );
  const doc = new jsPDF();
  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
  const totalHours = records.reduce((sum, record) => sum + record.hoursWorked, 0);

  doc.setFontSize(18);
  doc.text("Control de Horas", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-UY")}`, 105, 26, {
    align: "center",
  });
  doc.line(20, 32, 190, 32);

  let y = 44;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha", 20, y);
  doc.text("Empleado", 48, y);
  doc.text("Horas", 118, y);
  doc.text("Costo", 158, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  records.forEach((record) => {
    if (y > 270) {
      doc.addPage();
      y = 24;
    }

    doc.text(record.date, 20, y);
    doc.text(employeeName.get(record.employeeId) ?? "Sin empleado", 48, y, {
      maxWidth: 62,
    });
    doc.text(formatDisplayTime(record.hoursWorked), 118, y);
    doc.text(formatCurrency(record.cost), 158, y);
    y += 8;
  });

  y += 4;
  doc.line(20, y, 190, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 20, y);
  doc.text(formatDisplayTime(totalHours), 118, y);
  doc.text(formatCurrency(totalCost), 158, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text(`Tarifa base: ${formatCurrency(DEFAULT_HOURLY_RATE)}/hora`, 105, y, {
    align: "center",
  });

  doc.save(`control_horas_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportDistanceTripsToPDF(trips: DistanceTrip[], companies: Company[]) {
  if (trips.length === 0) {
    window.alert("No hay viajes para exportar.");
    return;
  }

  const companyName = new Map(companies.map((company) => [company.id, company.name]));
  const doc = new jsPDF();
  const totalKm = trips.reduce((sum, trip) => sum + trip.kilometers, 0);
  const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);

  doc.setFontSize(18);
  doc.text("Viajes por Distancia", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-UY")}`, 105, 26, {
    align: "center",
  });
  doc.line(20, 32, 190, 32);

  let y = 44;
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
