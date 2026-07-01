"use client";

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  applyDemoCurrentAccountToDistanceTrip,
  getDemoEntity,
  isDemoMode,
  listDemoEntities,
  removeDemoEntity,
  saveDemoEntity,
} from "@/lib/demo";
import { docWithTenant, ensureTenantId } from "@/lib/tenant";
import type {
  Company,
  CurrentAccount,
  DistanceTrip,
  Employee,
  HourRecord,
  UpsertCompanyInput,
  UpsertCurrentAccountInput,
  UpsertDistanceTripInput,
  UpsertEmployeeInput,
  UpsertHourRecordInput,
} from "@/types/models";

type TenantEntity = { id: string; tenantId: string };
type TimestampedTenantEntity = TenantEntity & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
type FirestorePayload = Record<string, unknown>;
interface CurrentAccountApplication {
  discount: number;
  pendingDebtAmount: number;
}

const LOCAL_PREFIX = "control_horas_local";
const isBrowser = typeof window !== "undefined";

function requireDb() {
  if (!db) {
    throw new Error("Firebase no esta configurado. Revisa las variables NEXT_PUBLIC_FIREBASE_*.");
  }

  return db;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localKey(collectionName: string, tenantId: string): string {
  return `${LOCAL_PREFIX}:${ensureTenantId(tenantId)}:${collectionName}`;
}

function readLocalCollection<T extends TenantEntity>(
  collectionName: string,
  tenantId: string,
): T[] {
  if (!isBrowser) return [];

  try {
    const raw = localStorage.getItem(localKey(collectionName, tenantId));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.error("No se pudo leer localStorage:", error);
    return [];
  }
}

function writeLocalCollection<T extends TenantEntity>(
  collectionName: string,
  tenantId: string,
  records: T[],
): void {
  if (!isBrowser) return;
  localStorage.setItem(localKey(collectionName, tenantId), JSON.stringify(records));
}

function compareLocalValues(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function getSortableValue(record: TenantEntity, field: string): unknown {
  return (record as Record<string, unknown>)[field];
}

function removeUndefinedFields<T extends FirestorePayload>(payload: T): FirestorePayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function saveLocalEntity<T extends TimestampedTenantEntity, I extends object>(
  collectionName: string,
  tenantId: string,
  input: I,
  id?: string,
): string {
  const safeTenantId = ensureTenantId(tenantId);
  const now = Timestamp.now();
  const records = readLocalCollection<T>(collectionName, safeTenantId);
  const nextId = id ?? createLocalId();
  const existing = records.find((record) => record.id === nextId);
  const payload = {
    ...(existing ?? {}),
    ...input,
    id: nextId,
    tenantId: safeTenantId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } as unknown as T;
  const nextRecords = [
    ...records.filter((record) => record.id !== nextId),
    payload,
  ];

  writeLocalCollection(collectionName, safeTenantId, nextRecords);
  return nextId;
}

function getCurrentAccountDocumentId(companyId: string): string {
  return companyId;
}

function applyCurrentAccountBalance(
  saldo: number,
  tripCost: number,
): CurrentAccountApplication {
  const safeSaldo = Math.max(0, Number(saldo) || 0);
  const safeTripCost = Math.max(0, Number(tripCost) || 0);
  const discount = Math.min(safeSaldo, safeTripCost);

  return {
    discount,
    pendingDebtAmount: safeTripCost - discount,
  };
}

function applyLocalCurrentAccountToTrip(
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

  const safeTenantId = ensureTenantId(tenantId);
  const accountId = getCurrentAccountDocumentId(input.companyId);
  const accounts = readLocalCollection<CurrentAccount>("currentAccounts", safeTenantId);
  const account = accounts.find((item) => item.id === accountId);

  if (!account) {
    return {
      ...input,
      currentAccountDiscount: 0,
      pendingDebtAmount: input.cost,
    };
  }

  const now = Timestamp.now();
  const application = applyCurrentAccountBalance(account.saldo, input.cost);
  const nextAccount: CurrentAccount = {
    ...account,
    saldo: account.saldo - application.discount,
    updatedAt: now,
  };

  writeLocalCollection(
    "currentAccounts",
    safeTenantId,
    accounts.map((item) => (item.id === accountId ? nextAccount : item)),
  );

  return {
    ...input,
    currentAccountDiscount: application.discount,
    pendingDebtAmount: application.pendingDebtAmount,
  };
}

async function listByTenant<T extends TenantEntity>(
  collectionName: string,
  tenantId: string,
  sortField = "createdAt",
): Promise<T[]> {
  const safeTenantId = ensureTenantId(tenantId);

  if (isDemoMode()) {
    return listDemoEntities<T>(collectionName as never, safeTenantId, sortField);
  }

  if (!db) {
    return readLocalCollection<T>(collectionName, safeTenantId).sort((a, b) =>
      compareLocalValues(getSortableValue(b, sortField), getSortableValue(a, sortField)),
    );
  }

  const firestore = requireDb();
  const q = query(collection(firestore, collectionName), where("tenantId", "==", safeTenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((item) => docWithTenant<T>(item, safeTenantId))
    .sort((a, b) =>
      compareLocalValues(getSortableValue(b, sortField), getSortableValue(a, sortField)),
    );
}

async function getByTenant<T extends TenantEntity>(
  collectionName: string,
  id: string,
  tenantId: string,
): Promise<T | null> {
  const safeTenantId = ensureTenantId(tenantId);

  if (isDemoMode()) {
    return getDemoEntity<T>(collectionName as never, safeTenantId, id);
  }

  if (!db) {
    return (
      readLocalCollection<T>(collectionName, safeTenantId).find(
        (record) => record.id === id && record.tenantId === safeTenantId,
      ) ?? null
    );
  }

  const firestore = requireDb();
  const snapshot = await getDoc(doc(firestore, collectionName, id));

  if (!snapshot.exists()) return null;

  const data = { id: snapshot.id, ...snapshot.data() } as T;
  return data.tenantId === safeTenantId ? data : null;
}

async function removeByTenant(
  collectionName: string,
  id: string,
  tenantId: string,
): Promise<void> {
  const existing = await getByTenant<TenantEntity>(collectionName, id, tenantId);

  if (!existing) {
    throw new Error("No se encontro el registro en el tenant activo.");
  }

  if (isDemoMode()) {
    removeDemoEntity(collectionName as never, ensureTenantId(tenantId), id);
    return;
  }

  if (!db) {
    const safeTenantId = ensureTenantId(tenantId);
    const nextRecords = readLocalCollection<TenantEntity>(
      collectionName,
      safeTenantId,
    ).filter((record) => record.id !== id);
    writeLocalCollection(collectionName, safeTenantId, nextRecords);
    return;
  }

  await deleteDoc(doc(requireDb(), collectionName, id));
}

export async function listCompanies(tenantId: string): Promise<Company[]> {
  return listByTenant<Company>("companies", tenantId, "name");
}

export async function getCompany(id: string, tenantId: string): Promise<Company | null> {
  return getByTenant<Company>("companies", id, tenantId);
}

export async function saveCompany(
  tenantId: string,
  input: UpsertCompanyInput,
  id?: string,
): Promise<string> {
  const safeTenantId = ensureTenantId(tenantId);
  const now = Timestamp.now();
  const payload = removeUndefinedFields({
    ...input,
    tenantId: safeTenantId,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  });

  if (isDemoMode()) {
    return saveDemoEntity<Company>("companies", safeTenantId, input, id);
  }

  if (!db) {
    return saveLocalEntity<Company, UpsertCompanyInput>(
      "companies",
      safeTenantId,
      input,
      id,
    );
  }

  const firestore = requireDb();

  if (id) {
    await setDoc(doc(firestore, "companies", id), payload, { merge: true });
    return id;
  }

  const created = await addDoc(collection(firestore, "companies"), payload);
  return created.id;
}

export async function deleteCompany(id: string, tenantId: string): Promise<void> {
  await removeByTenant("companies", id, tenantId);
}

export async function listCurrentAccounts(tenantId: string): Promise<CurrentAccount[]> {
  return listByTenant<CurrentAccount>("currentAccounts", tenantId, "updatedAt");
}

export async function getCurrentAccountByCompany(
  tenantId: string,
  companyId: string,
): Promise<CurrentAccount | null> {
  return getByTenant<CurrentAccount>(
    "currentAccounts",
    getCurrentAccountDocumentId(companyId),
    tenantId,
  );
}

export async function saveCurrentAccount(
  tenantId: string,
  input: UpsertCurrentAccountInput,
): Promise<string> {
  const safeTenantId = ensureTenantId(tenantId);
  const id = getCurrentAccountDocumentId(input.companyId);
  const now = Timestamp.now();

  if (isDemoMode()) {
    return saveDemoEntity<CurrentAccount>(
      "currentAccounts",
      safeTenantId,
      {
        ...input,
        saldo: Math.max(0, Number(input.saldo) || 0),
      },
      id,
    );
  }

  if (!db) {
    const existing = readLocalCollection<CurrentAccount>("currentAccounts", safeTenantId).find(
      (account) => account.id === id,
    );

    return saveLocalEntity<CurrentAccount, UpsertCurrentAccountInput>(
      "currentAccounts",
      safeTenantId,
      {
        ...input,
        saldo: Math.max(0, Number(input.saldo) || 0),
      },
      existing?.id ?? id,
    );
  }

  const firestore = requireDb();
  const currentAccountRef = doc(firestore, "currentAccounts", id);
  const currentAccount = await getCurrentAccountByCompany(safeTenantId, input.companyId);
  const payload = removeUndefinedFields({
    ...input,
    saldo: Math.max(0, Number(input.saldo) || 0),
    tenantId: safeTenantId,
    updatedAt: now,
    ...(currentAccount ? {} : { createdAt: now }),
  });

  await setDoc(currentAccountRef, payload, { merge: true });
  return id;
}

export async function listEmployees(tenantId: string): Promise<Employee[]> {
  return listByTenant<Employee>("employees", tenantId, "lastName");
}

export async function saveEmployee(
  tenantId: string,
  input: UpsertEmployeeInput,
  id?: string,
): Promise<string> {
  const safeTenantId = ensureTenantId(tenantId);
  const now = Timestamp.now();
  const payload = removeUndefinedFields({
    ...input,
    tenantId: safeTenantId,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  });

  if (isDemoMode()) {
    return saveDemoEntity<Employee>("employees", safeTenantId, input, id);
  }

  if (!db) {
    return saveLocalEntity<Employee, UpsertEmployeeInput>(
      "employees",
      safeTenantId,
      input,
      id,
    );
  }

  const firestore = requireDb();

  if (id) {
    await setDoc(doc(firestore, "employees", id), payload, { merge: true });
    return id;
  }

  const created = await addDoc(collection(firestore, "employees"), payload);
  return created.id;
}

export async function deleteEmployee(id: string, tenantId: string): Promise<void> {
  await removeByTenant("employees", id, tenantId);
}

export async function listHourRecords(
  tenantId: string,
  filters?: { employeeId?: string; from?: string; to?: string },
): Promise<HourRecord[]> {
  const safeTenantId = ensureTenantId(tenantId);

  if (!db) {
    return readLocalCollection<HourRecord>("hourRecords", safeTenantId)
      .filter((record) => {
        if (filters?.employeeId && record.employeeId !== filters.employeeId) return false;
        if (filters?.from && record.date < filters.from) return false;
        if (filters?.to && record.date > filters.to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 250);
  }

  const firestore = requireDb();
  const snapshot = await getDocs(
    query(collection(firestore, "hourRecords"), where("tenantId", "==", safeTenantId), limit(250)),
  );
  const records = snapshot.docs.map((item) => docWithTenant<HourRecord>(item, safeTenantId));

  return records
    .filter((record) => {
      if (filters?.employeeId && record.employeeId !== filters.employeeId) return false;
      if (filters?.from && record.date < filters.from) return false;
      if (filters?.to && record.date > filters.to) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveHourRecord(
  tenantId: string,
  input: UpsertHourRecordInput,
  id?: string,
): Promise<string> {
  const safeTenantId = ensureTenantId(tenantId);
  const now = Timestamp.now();
  const payload = removeUndefinedFields({
    ...input,
    tenantId: safeTenantId,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  });

  if (isDemoMode()) {
    return saveDemoEntity<HourRecord>("hourRecords", safeTenantId, input, id);
  }

  if (!db) {
    return saveLocalEntity<HourRecord, UpsertHourRecordInput>(
      "hourRecords",
      safeTenantId,
      input,
      id,
    );
  }

  const firestore = requireDb();

  if (id) {
    await setDoc(doc(firestore, "hourRecords", id), payload, { merge: true });
    return id;
  }

  const created = await addDoc(collection(firestore, "hourRecords"), payload);
  return created.id;
}

export async function deleteHourRecord(id: string, tenantId: string): Promise<void> {
  await removeByTenant("hourRecords", id, tenantId);
}

export async function listDistanceTrips(tenantId: string): Promise<DistanceTrip[]> {
  return listByTenant<DistanceTrip>("distanceTrips", tenantId, "date");
}

export async function saveDistanceTrip(
  tenantId: string,
  input: UpsertDistanceTripInput,
  id?: string,
): Promise<string> {
  const safeTenantId = ensureTenantId(tenantId);
  const now = Timestamp.now();
  const payload = removeUndefinedFields({
    ...input,
    tenantId: safeTenantId,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  });

  if (isDemoMode()) {
    return saveDemoEntity<DistanceTrip>(
      "distanceTrips",
      safeTenantId,
      id ? input : applyDemoCurrentAccountToDistanceTrip(safeTenantId, input),
      id,
    );
  }

  if (!db) {
    return saveLocalEntity<DistanceTrip, UpsertDistanceTripInput>(
      "distanceTrips",
      safeTenantId,
      id ? input : applyLocalCurrentAccountToTrip(safeTenantId, input),
      id,
    );
  }

  const firestore = requireDb();

  if (id) {
    await setDoc(doc(firestore, "distanceTrips", id), payload, { merge: true });
    return id;
  }

  const createdRef = doc(collection(firestore, "distanceTrips"));

  await runTransaction(firestore, async (transaction) => {
    let currentAccountDiscount = 0;
    let pendingDebtAmount = input.cost;

    if (input.companyId) {
      const currentAccountRef = doc(
        firestore,
        "currentAccounts",
        getCurrentAccountDocumentId(input.companyId),
      );
      const currentAccountSnapshot = await transaction.get(currentAccountRef);

      if (currentAccountSnapshot.exists()) {
        const currentAccount = {
          id: currentAccountSnapshot.id,
          ...currentAccountSnapshot.data(),
        } as CurrentAccount;

        if (currentAccount.tenantId !== safeTenantId) {
          throw new Error("La cuenta corriente no pertenece al tenant activo.");
        }

        const application = applyCurrentAccountBalance(currentAccount.saldo, input.cost);
        currentAccountDiscount = application.discount;
        pendingDebtAmount = application.pendingDebtAmount;

        transaction.set(
          currentAccountRef,
          {
            saldo: currentAccount.saldo - currentAccountDiscount,
            updatedAt: now,
          },
          { merge: true },
        );
      }
    }

    transaction.set(
      createdRef,
      removeUndefinedFields({
        ...input,
        tenantId: safeTenantId,
        currentAccountDiscount,
        pendingDebtAmount,
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  return createdRef.id;
}

export async function deleteDistanceTrip(id: string, tenantId: string): Promise<void> {
  await removeByTenant("distanceTrips", id, tenantId);
}
