import type { User } from "firebase/auth";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

export const TENANT_COOKIE = "tenant_id";
export const SESSION_COOKIE = "__session";

const DEFAULT_TENANT_PREFIX = "tenant";

export function sanitizeTenantId(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "default";
}

export async function resolveTenantId(user: User): Promise<string> {
  const token = await user.getIdTokenResult();
  const claim = token.claims.tenantId;

  if (typeof claim === "string" && claim.trim()) {
    return sanitizeTenantId(claim);
  }

  return sanitizeTenantId(`${DEFAULT_TENANT_PREFIX}-${user.uid}`);
}

export function ensureTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new Error("No hay tenant activo para ejecutar esta operacion.");
  }

  return sanitizeTenantId(tenantId);
}

export function assertTenant<T extends { tenantId: string }>(
  data: T,
  tenantId: string,
): T {
  const safeTenantId = ensureTenantId(tenantId);

  if (data.tenantId !== safeTenantId) {
    throw new Error("El registro no pertenece al tenant activo.");
  }

  return data;
}

export function docWithTenant<T extends { id: string; tenantId: string }>(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  tenantId: string,
): T {
  const data = { id: snapshot.id, ...snapshot.data() } as T;
  return assertTenant(data, tenantId);
}
