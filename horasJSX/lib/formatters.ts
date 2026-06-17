export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDisplayTime(totalHours: number): string {
  const safeHours = Math.max(0, totalHours);
  const h = Math.floor(safeHours);
  const m = Math.round((safeHours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDateDisplay(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  }).format(amount);
}
