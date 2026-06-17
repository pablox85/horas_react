export const DEFAULT_HOURLY_RATE = 625;

export function calculateTotalHours({
  mode,
  hours = 0,
  minutes = 0,
  timerSeconds = 0,
}: {
  mode: "manual" | "timer";
  hours?: number;
  minutes?: number;
  timerSeconds?: number;
}): number | null {
  if (mode === "manual") {
    const totalHours = hours + minutes / 60;
    return totalHours > 0 ? totalHours : null;
  }

  const totalHours = timerSeconds / 3600;
  return timerSeconds > 0 ? totalHours : null;
}

export function calculateCost(hours: number, hourlyRate = DEFAULT_HOURLY_RATE): number {
  return hours * hourlyRate;
}

export function calculateKmCost(kilometers: number, ratePerKm: number): number {
  return kilometers * ratePerKm;
}

export function calculateTotals(entries: Array<{ hoursWorked?: number; cost?: number }>) {
  return entries.reduce(
    (acc, entry) => ({
      totalCost: acc.totalCost + (Number(entry.cost) || 0),
      totalHours: acc.totalHours + (Number(entry.hoursWorked) || 0),
    }),
    { totalCost: 0, totalHours: 0 },
  );
}
