"use client";

type PerfMeta = Record<string, string | number | boolean | null | undefined>;

function logPerformance(name: string, durationMs: number, success: boolean, meta?: PerfMeta) {
  if (typeof window === "undefined") return;

  console.info(`[perf] ${name} ${Math.round(durationMs)}ms`, {
    success,
    durationMs: Math.round(durationMs),
    ...meta,
  });
}

export async function measureAsync<T>(
  name: string,
  task: () => Promise<T>,
  meta?: PerfMeta,
): Promise<T> {
  const start = performance.now();

  try {
    const result = await task();
    logPerformance(name, performance.now() - start, true, meta);
    return result;
  } catch (error) {
    logPerformance(name, performance.now() - start, false, {
      ...meta,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

export function measureSync<T>(name: string, task: () => T, meta?: PerfMeta): T {
  const start = performance.now();

  try {
    const result = task();
    logPerformance(name, performance.now() - start, true, meta);
    return result;
  } catch (error) {
    logPerformance(name, performance.now() - start, false, {
      ...meta,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
