"use client";

import { Timestamp } from "firebase/firestore";
import type {
  Company,
  CurrentAccount,
  CurrentAccountMovement,
  DistanceTrip,
  Employee,
  HourRecord,
  UpsertCompanyInput,
  UpsertCurrentAccountInput,
  UpsertDistanceTripInput,
  UpsertEmployeeInput,
  UpsertHourRecordInput,
} from "@/types/models";

type DemoCollectionName =
  | "companies"
  | "currentAccounts"
  | "current_account_movements"
  | "employees"
  | "hourRecords"
  | "distanceTrips";

type DemoEntity =
  | Company
  | CurrentAccount
  | CurrentAccountMovement
  | Employee
  | HourRecord
  | DistanceTrip;
type DemoInput =
  | UpsertCompanyInput
  | UpsertCurrentAccountInput
  | Omit<CurrentAccountMovement, "id">
  | UpsertEmployeeInput
  | UpsertHourRecordInput
  | UpsertDistanceTripInput;

interface DemoStore {
  tenantId: string;
  companies: Company[];
  currentAccounts: CurrentAccount[];
  current_account_movements: CurrentAccountMovement[];
  employees: Employee[];
  hourRecords: HourRecord[];
  distanceTrips: DistanceTrip[];
}

export const DEMO_EMAIL = "demo@demo.com";
export const DEMO_COMPANY_ID = "demo-company";

const DEMO_LIMITS = {
  companies: 2,
  employees: 1,
  hourRecords: 10,
  distanceTrips: 10,
};

let demoEnabled = false;
let demoStore: DemoStore | null = null;

export function isDemoIdentity({
  email,
  claims,
}: {
  email?: string | null;
  claims?: Record<string, unknown>;
}) {
  return (
    email?.trim().toLowerCase() === DEMO_EMAIL ||
    claims?.isDemo === true ||
    claims?.role === "demo"
  );
}

export function setDemoMode(enabled: boolean) {
  demoEnabled = enabled;
  if (!enabled) {
    demoStore = null;
  }
}

export function isDemoMode() {
  return demoEnabled;
}

export function resetDemoStore() {
  demoStore = null;
}

function createDemoStore(tenantId: string): DemoStore {
  const now = Timestamp.now();
  const demoCompany: Company = {
    id: DEMO_COMPANY_ID,
    tenantId,
    name: "Empresa Demo",
    rut: "000000000000",
    address: "Demo",
    contactEmail: DEMO_EMAIL,
    hourlyRate: 625,
    pricePerKm: 100,
    creditBalance: 0,
    credit_balance: 0,
    createdAt: now,
    updatedAt: now,
    updated_at: now,
  };

  return {
    tenantId,
    companies: [demoCompany],
    currentAccounts: [
      {
        id: DEMO_COMPANY_ID,
        tenantId,
        companyId: DEMO_COMPANY_ID,
        saldo: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    current_account_movements: [],
    employees: [],
    hourRecords: [],
    distanceTrips: [],
  };
}

function ensureDemoStore(tenantId: string): DemoStore {
  if (!demoStore || demoStore.tenantId !== tenantId) {
    demoStore = createDemoStore(tenantId);
  }

  return demoStore;
}

function createDemoId(collectionName: DemoCollectionName) {
  return `demo-${collectionName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCollection(store: DemoStore, collectionName: DemoCollectionName): DemoEntity[] {
  return store[collectionName] as DemoEntity[];
}

function setCollection(
  store: DemoStore,
  collectionName: DemoCollectionName,
  records: DemoEntity[],
) {
  Object.assign(store, { [collectionName]: records });
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function sortableValue(record: DemoEntity, field: string): unknown {
  return (record as unknown as Record<string, unknown>)[field];
}

function assertDemoLimit(collectionName: DemoCollectionName, currentCount: number) {
  if (collectionName === "companies" && currentCount >= DEMO_LIMITS.companies) {
    throw new Error("La cuenta demo permite Empresa Demo y solo 1 empresa adicional.");
  }

  if (collectionName === "employees" && currentCount >= DEMO_LIMITS.employees) {
    throw new Error("La cuenta demo permite maximo 1 empleado.");
  }

  if (collectionName === "hourRecords" && currentCount >= DEMO_LIMITS.hourRecords) {
    throw new Error("La cuenta demo permite maximo 10 registros de horas.");
  }

  if (collectionName === "distanceTrips" && currentCount >= DEMO_LIMITS.distanceTrips) {
    throw new Error("La cuenta demo permite maximo 10 viajes.");
  }
}

export function listDemoEntities<T extends { id: string; tenantId: string }>(
  collectionName: DemoCollectionName,
  tenantId: string,
  sortField: string,
): T[] {
  const store = ensureDemoStore(tenantId);
  return [...getCollection(store, collectionName)]
    .sort((a, b) => compareValues(sortableValue(b, sortField), sortableValue(a, sortField)))
    .map((record) => record as unknown as T);
}

export function getDemoEntity<T extends { id: string; tenantId: string }>(
  collectionName: DemoCollectionName,
  tenantId: string,
  id: string,
): T | null {
  const store = ensureDemoStore(tenantId);
  return (
    (getCollection(store, collectionName).find((record) => record.id === id) as unknown as T) ??
    null
  );
}

export function saveDemoEntity<T extends DemoEntity>(
  collectionName: DemoCollectionName,
  tenantId: string,
  input: DemoInput,
  id?: string,
): string {
  const store = ensureDemoStore(tenantId);
  const records = getCollection(store, collectionName);
  const existing = id ? records.find((record) => record.id === id) : undefined;

  if (!existing) {
    assertDemoLimit(collectionName, records.length);
  }

  const now = Timestamp.now();
  const nextId = id ?? createDemoId(collectionName);
  const nextRecord = {
    ...(existing ?? {}),
    ...input,
    id: nextId,
    tenantId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } as T;

  setCollection(store, collectionName, [
    ...records.filter((record) => record.id !== nextId),
    nextRecord,
  ]);

  return nextId;
}

export function applyDemoCurrentAccountToDistanceTrip(
  tenantId: string,
  input: UpsertDistanceTripInput,
): UpsertDistanceTripInput {
  if (!input.companyId) {
    return {
      ...input,
      currentAccountDiscount: 0,
      pendingDebtAmount: input.cost,
    };
  }

  const store = ensureDemoStore(tenantId);
  const account = store.currentAccounts.find((item) => item.companyId === input.companyId);

  if (!account) {
    return {
      ...input,
      currentAccountDiscount: 0,
      pendingDebtAmount: input.cost,
    };
  }

  const safeSaldo = Math.max(0, Number(account.saldo) || 0);
  const safeCost = Math.max(0, Number(input.cost) || 0);
  const discount = Math.min(safeSaldo, safeCost);
  const now = Timestamp.now();

  store.currentAccounts = store.currentAccounts.map((item) =>
    item.id === account.id
      ? {
          ...item,
          saldo: item.saldo - discount,
          updatedAt: now,
        }
      : item,
  );

  return {
    ...input,
    currentAccountDiscount: discount,
    pendingDebtAmount: safeCost - discount,
  };
}

export function applyDemoCompanyCreditToTrip<
  T extends { companyId?: string; cost: number },
>(
  tenantId: string,
  collectionName: "hourRecords" | "distanceTrips",
  input: T,
): T & {
  currentAccountDiscount: number;
  creditBalanceAfter: number;
  credit_balance_after: number;
  pendingAmount: number;
  pending_amount: number;
  pendingDebtAmount?: number;
} {
  const safeCost = Math.max(0, Number(input.cost) || 0);

  if (!input.companyId) {
    return {
      ...input,
      currentAccountDiscount: 0,
      creditBalanceAfter: 0,
      credit_balance_after: 0,
      pendingAmount: safeCost,
      pending_amount: safeCost,
      ...(collectionName === "distanceTrips" ? { pendingDebtAmount: safeCost } : {}),
    };
  }

  const store = ensureDemoStore(tenantId);
  const company = store.companies.find((item) => item.id === input.companyId);
  const balanceBefore = Math.max(
    0,
    Number(company?.creditBalance ?? company?.credit_balance) || 0,
  );
  const discount = Math.min(balanceBefore, safeCost);
  const balanceAfter = balanceBefore - discount;
  const now = Timestamp.now();

  store.companies = store.companies.map((item) =>
    item.id === input.companyId
      ? {
          ...item,
          creditBalance: balanceAfter,
          credit_balance: balanceAfter,
          updatedAt: now,
          updated_at: now,
        }
      : item,
  );

  const movementId = createDemoId("current_account_movements");
  const createdBy = "demo";
  store.current_account_movements = [
    ...store.current_account_movements,
    {
      id: movementId,
      tenantId,
      tenant_id: tenantId,
      companyId: input.companyId,
      company_id: input.companyId,
      type: "trip_charge",
      amount: discount,
      balanceBefore,
      balance_before: balanceBefore,
      balanceAfter,
      balance_after: balanceAfter,
      tripId: null,
      trip_id: null,
      description: `Descuento automatico por viaje ${collectionName === "hourRecords" ? "por hora" : "por km"}.`,
      createdAt: now,
      created_at: now,
      createdBy,
      created_by: createdBy,
    },
  ];

  return {
    ...input,
    currentAccountDiscount: discount,
    creditBalanceAfter: balanceAfter,
    credit_balance_after: balanceAfter,
    pendingAmount: safeCost - discount,
    pending_amount: safeCost - discount,
    ...(collectionName === "distanceTrips" ? { pendingDebtAmount: safeCost - discount } : {}),
  };
}

export function removeDemoEntity(
  collectionName: DemoCollectionName,
  tenantId: string,
  id: string,
) {
  if (collectionName === "companies" && id === DEMO_COMPANY_ID) {
    throw new Error("Empresa Demo no se puede eliminar.");
  }

  const store = ensureDemoStore(tenantId);
  const records = getCollection(store, collectionName);
  const existing = records.find((record) => record.id === id);

  if (!existing) {
    throw new Error("No se encontro el registro demo.");
  }

  setCollection(
    store,
    collectionName,
    records.filter((record) => record.id !== id),
  );
}
