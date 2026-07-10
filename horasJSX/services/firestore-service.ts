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
  type Transaction,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  applyDemoCompanyCreditToTrip,
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

type TenantEntity = { id: string; tenantId: string };
type TimestampedTenantEntity = TenantEntity & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
type FirestorePayload = Record<string, unknown>;
interface CurrentAccountApplication {
  discount: number;
  pendingAmount: number;
  balanceAfter: number;
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
  balance: number,
  tripCost: number,
): CurrentAccountApplication {
  const safeBalance = Math.max(0, Number(balance) || 0);
  const safeTripCost = Math.max(0, Number(tripCost) || 0);
  const discount = Math.min(safeBalance, safeTripCost);
  const balanceAfter = safeBalance - discount;

  return {
    discount,
    pendingAmount: safeTripCost - discount,
    balanceAfter,
  };
}

function getCompanyCreditBalance(company: Partial<Company>): number {
  return Math.max(0, Number(company.creditBalance ?? company.credit_balance) || 0);
}

function withCompanyCreditAliases(input: UpsertCompanyInput): UpsertCompanyInput {
  const hasCreditBalance =
    input.creditBalance !== undefined || input.credit_balance !== undefined;

  if (!hasCreditBalance) return input;

  const creditBalance = Math.max(0, Number(input.creditBalance ?? input.credit_balance) || 0);

  return {
    ...input,
    creditBalance,
    credit_balance: creditBalance,
  };
}

function getCurrentUserId(): string {
  return auth?.currentUser?.uid ?? "system";
}

function createMovementInput({
  tenantId,
  companyId,
  type,
  amount,
  balanceBefore,
  balanceAfter,
  tripId = null,
  description,
}: {
  tenantId: string;
  companyId: string;
  type: CurrentAccountMovement["type"];
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  tripId?: string | null;
  description: string;
}): Omit<CurrentAccountMovement, "id"> {
  const now = Timestamp.now();
  const createdBy = getCurrentUserId();

  return {
    tenantId,
    tenant_id: tenantId,
    companyId,
    company_id: companyId,
    type,
    amount,
    balanceBefore,
    balance_before: balanceBefore,
    balanceAfter,
    balance_after: balanceAfter,
    tripId,
    trip_id: tripId,
    description,
    createdAt: now,
    created_at: now,
    createdBy,
    created_by: createdBy,
  };
}

function applyLocalCompanyCreditToTrip<I extends { companyId?: string; cost: number }>(
  tenantId: string,
  collectionName: "hourRecords" | "distanceTrips",
  input: I,
  tripId: string,
): I & {
    currentAccountDiscount: number;
    creditBalanceAfter: number;
    credit_balance_after: number;
    pendingAmount: number;
  pending_amount: number;
  pendingDebtAmount?: number;
} {
  const safeTenantId = ensureTenantId(tenantId);

  if (!input.companyId) {
    const pendingAmount = Math.max(0, Number(input.cost) || 0);
    return {
      ...input,
      currentAccountDiscount: 0,
      creditBalanceAfter: 0,
      credit_balance_after: 0,
      pendingAmount,
      pending_amount: pendingAmount,
      ...(collectionName === "distanceTrips" ? { pendingDebtAmount: pendingAmount } : {}),
    };
  }

  const companies = readLocalCollection<Company>("companies", safeTenantId);
  const company = companies.find((item) => item.id === input.companyId);
  const balanceBefore = company ? getCompanyCreditBalance(company) : 0;
  const application = applyCurrentAccountBalance(balanceBefore, input.cost);
  const now = Timestamp.now();

  if (company) {
    writeLocalCollection(
      "companies",
      safeTenantId,
      companies.map((item) =>
        item.id === input.companyId
          ? {
              ...item,
              creditBalance: application.balanceAfter,
              credit_balance: application.balanceAfter,
              updatedAt: now,
              updated_at: now,
            }
          : item,
      ),
    );
  }

  const movementId = createLocalId();
  const movement = {
    id: movementId,
    ...createMovementInput({
      tenantId: safeTenantId,
      companyId: input.companyId,
      type: "trip_charge",
      amount: application.discount,
      balanceBefore,
      balanceAfter: application.balanceAfter,
      tripId,
      description: `Descuento automatico por viaje ${collectionName === "hourRecords" ? "por hora" : "por km"}.`,
    }),
  };
  const movements = readLocalCollection<CurrentAccountMovement>(
    "current_account_movements",
    safeTenantId,
  );
  writeLocalCollection("current_account_movements", safeTenantId, [...movements, movement]);

  return {
    ...input,
    currentAccountDiscount: application.discount,
    creditBalanceAfter: application.balanceAfter,
    credit_balance_after: application.balanceAfter,
    pendingAmount: application.pendingAmount,
    pending_amount: application.pendingAmount,
    ...(collectionName === "distanceTrips" ? { pendingDebtAmount: application.pendingAmount } : {}),
  };
}

async function applyCompanyCreditInTransaction({
  transaction,
  firestore,
  tenantId,
  companyId,
  tripId,
  tripCost,
  tripKind,
}: {
  transaction: Transaction;
  firestore: ReturnType<typeof requireDb>;
  tenantId: string;
  companyId?: string;
  tripId: string;
  tripCost: number;
  tripKind: "hour" | "km";
}) {
  if (!companyId) {
    const pendingAmount = Math.max(0, Number(tripCost) || 0);
    return {
      currentAccountDiscount: 0,
      pendingAmount,
    };
  }

  const companyRef = doc(firestore, "companies", companyId);
  const companySnapshot = await transaction.get(companyRef);

  if (!companySnapshot.exists()) {
    throw new Error("La empresa seleccionada no existe.");
  }

  const company = { id: companySnapshot.id, ...companySnapshot.data() } as Company;

  if (company.tenantId !== tenantId) {
    throw new Error("La empresa no pertenece al tenant activo.");
  }

  let legacyCreditBalance: number | null = null;
  if (company.creditBalance === undefined && company.credit_balance === undefined) {
    const legacyAccountRef = doc(
      firestore,
      "currentAccounts",
      getCurrentAccountDocumentId(companyId),
    );
    const legacyAccountSnapshot = await transaction.get(legacyAccountRef);

    if (legacyAccountSnapshot.exists()) {
      const legacyAccount = {
        id: legacyAccountSnapshot.id,
        ...legacyAccountSnapshot.data(),
      } as CurrentAccount;

      if (legacyAccount.tenantId === tenantId) {
        legacyCreditBalance = legacyAccount.saldo;
      }
    }
  }

  const now = Timestamp.now();
  const balanceBefore = legacyCreditBalance ?? getCompanyCreditBalance(company);
  const application = applyCurrentAccountBalance(balanceBefore, tripCost);

  transaction.set(
    companyRef,
    {
      creditBalance: application.balanceAfter,
      credit_balance: application.balanceAfter,
      updatedAt: now,
      updated_at: now,
    },
    { merge: true },
  );

  const movementRef = doc(collection(firestore, "current_account_movements"));
  transaction.set(
    movementRef,
    removeUndefinedFields({
      ...createMovementInput({
        tenantId,
        companyId,
        type: "trip_charge",
        amount: application.discount,
        balanceBefore,
        balanceAfter: application.balanceAfter,
        tripId,
        description: `Descuento automatico por viaje ${tripKind === "hour" ? "por hora" : "por km"}.`,
      }),
    }),
  );

  return {
    currentAccountDiscount: application.discount,
    pendingAmount: application.pendingAmount,
    balanceAfter: application.balanceAfter,
  };
}

async function adjustCompanyCreditInTransaction({
  transaction,
  firestore,
  tenantId,
  companyId,
  amount,
  tripId,
  description,
}: {
  transaction: Transaction;
  firestore: ReturnType<typeof requireDb>;
  tenantId: string;
  companyId: string;
  amount: number;
  tripId: string;
  description: string;
}) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (safeAmount <= 0) return;

  const companyRef = doc(firestore, "companies", companyId);
  const companySnapshot = await transaction.get(companyRef);

  if (!companySnapshot.exists()) {
    throw new Error("La empresa seleccionada no existe.");
  }

  const company = { id: companySnapshot.id, ...companySnapshot.data() } as Company;

  if (company.tenantId !== tenantId) {
    throw new Error("La empresa no pertenece al tenant activo.");
  }

  const now = Timestamp.now();
  const balanceBefore = getCompanyCreditBalance(company);
  const balanceAfter = balanceBefore + safeAmount;

  transaction.set(
    companyRef,
    {
      creditBalance: balanceAfter,
      credit_balance: balanceAfter,
      updatedAt: now,
      updated_at: now,
    },
    { merge: true },
  );

  const movementRef = doc(collection(firestore, "current_account_movements"));
  transaction.set(
    movementRef,
    removeUndefinedFields({
      ...createMovementInput({
        tenantId,
        companyId,
        type: "adjustment",
        amount: safeAmount,
        balanceBefore,
        balanceAfter,
        tripId,
        description,
      }),
    }),
  );
}

async function updateTripWithCreditInTransaction<I extends { companyId?: string; cost: number }>({
  transaction,
  firestore,
  tenantId,
  collectionName,
  id,
  input,
  tripKind,
  existing,
  payload,
}: {
  transaction: Transaction;
  firestore: ReturnType<typeof requireDb>;
  tenantId: string;
  collectionName: "hourRecords" | "distanceTrips";
  id: string;
  input: I;
  tripKind: "hour" | "km";
  existing: HourRecord | DistanceTrip;
  payload: FirestorePayload;
}) {
  const oldCompanyId = existing.companyId;
  const oldDiscount = Math.max(0, Number(existing.currentAccountDiscount) || 0);
  const companyIds = [...new Set([oldCompanyId, input.companyId].filter(Boolean))] as string[];
  const companyStates = new Map<
    string,
    {
      ref: ReturnType<typeof doc>;
      company: Company;
      balance: number;
    }
  >();

  for (const companyId of companyIds) {
    const companyRef = doc(firestore, "companies", companyId);
    const companySnapshot = await transaction.get(companyRef);

    if (!companySnapshot.exists()) {
      throw new Error("La empresa seleccionada no existe.");
    }

    const company = { id: companySnapshot.id, ...companySnapshot.data() } as Company;
    if (company.tenantId !== tenantId) {
      throw new Error("La empresa no pertenece al tenant activo.");
    }

    companyStates.set(companyId, {
      ref: companyRef,
      company,
      balance: getCompanyCreditBalance(company),
    });
  }

  const now = Timestamp.now();

  if (oldCompanyId && oldDiscount > 0) {
    const state = companyStates.get(oldCompanyId);
    if (state) {
      const balanceBefore = state.balance;
      state.balance += oldDiscount;
      const movementRef = doc(collection(firestore, "current_account_movements"));
      transaction.set(
        movementRef,
        removeUndefinedFields({
          ...createMovementInput({
            tenantId,
            companyId: oldCompanyId,
            type: "adjustment",
            amount: oldDiscount,
            balanceBefore,
            balanceAfter: state.balance,
            tripId: id,
            description: `Reversion de descuento por edicion de viaje ${tripKind === "hour" ? "por hora" : "por km"}.`,
          }),
        }),
      );
    }
  }

  let currentAccountDiscount = 0;
  let pendingAmount = Math.max(0, Number(input.cost) || 0);
  let balanceAfter = 0;

  if (input.companyId) {
    const state = companyStates.get(input.companyId);
    if (!state) {
      throw new Error("La empresa seleccionada no existe.");
    }

    const application = applyCurrentAccountBalance(state.balance, input.cost);
    const balanceBefore = state.balance;
    state.balance = application.balanceAfter;
    currentAccountDiscount = application.discount;
    pendingAmount = application.pendingAmount;
    balanceAfter = application.balanceAfter;

    const movementRef = doc(collection(firestore, "current_account_movements"));
    transaction.set(
      movementRef,
      removeUndefinedFields({
        ...createMovementInput({
          tenantId,
          companyId: input.companyId,
          type: "trip_charge",
          amount: application.discount,
          balanceBefore,
          balanceAfter: application.balanceAfter,
          tripId: id,
          description: `Descuento automatico por edicion de viaje ${tripKind === "hour" ? "por hora" : "por km"}.`,
        }),
      }),
    );
  }

  for (const state of companyStates.values()) {
    transaction.set(
      state.ref,
      {
        creditBalance: state.balance,
        credit_balance: state.balance,
        updatedAt: now,
        updated_at: now,
      },
      { merge: true },
    );
  }

  transaction.set(
    doc(firestore, collectionName, id),
    removeUndefinedFields({
      ...payload,
      currentAccountDiscount,
      creditBalanceAfter: balanceAfter,
      credit_balance_after: balanceAfter,
      pendingAmount,
      pending_amount: pendingAmount,
      ...(collectionName === "distanceTrips" ? { pendingDebtAmount: pendingAmount } : {}),
    }),
    { merge: true },
  );
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
  const safeTenantId = ensureTenantId(tenantId);
  const companies = await listByTenant<Company>("companies", safeTenantId, "name");
  const legacyAccounts = await listByTenant<CurrentAccount>(
    "currentAccounts",
    safeTenantId,
    "updatedAt",
  );
  const legacyBalanceByCompany = new Map(
    legacyAccounts.map((account) => [account.companyId, account.saldo]),
  );

  return companies.map((company) => {
    if (company.creditBalance !== undefined || company.credit_balance !== undefined) {
      return company;
    }

    const legacyBalance = legacyBalanceByCompany.get(company.id);
    if (legacyBalance === undefined) return company;

    return {
      ...company,
      creditBalance: legacyBalance,
      credit_balance: legacyBalance,
    };
  });
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
  const normalizedInput = withCompanyCreditAliases(input);
  const payload = removeUndefinedFields({
    ...normalizedInput,
    tenantId: safeTenantId,
    updatedAt: now,
    updated_at: now,
    ...(id ? {} : { createdAt: now }),
  });

  if (isDemoMode()) {
    return saveDemoEntity<Company>("companies", safeTenantId, normalizedInput, id);
  }

  if (!db) {
    return saveLocalEntity<Company, UpsertCompanyInput>(
      "companies",
      safeTenantId,
      normalizedInput,
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

export async function addCompanyCredit(
  tenantId: string,
  companyId: string,
  amount: number,
  description = "Pago adelantado manual.",
): Promise<void> {
  const safeTenantId = ensureTenantId(tenantId);
  const safeAmount = Number(amount) || 0;

  if (safeAmount <= 0) {
    throw new Error("Ingresa un importe de pago adelantado mayor a cero.");
  }

  if (isDemoMode()) {
    const company = getDemoEntity<Company>("companies", safeTenantId, companyId);
    if (!company) throw new Error("La empresa seleccionada no existe.");
    const balanceBefore = getCompanyCreditBalance(company);
    const balanceAfter = balanceBefore + safeAmount;
    saveDemoEntity<Company>(
      "companies",
      safeTenantId,
      {
        ...company,
        creditBalance: balanceAfter,
        credit_balance: balanceAfter,
      },
      companyId,
    );
    saveDemoEntity<CurrentAccountMovement>(
      "current_account_movements",
      safeTenantId,
      createMovementInput({
        tenantId: safeTenantId,
        companyId,
        type: "credit",
        amount: safeAmount,
        balanceBefore,
        balanceAfter,
        description,
      }),
    );
    return;
  }

  if (!db) {
    const companies = readLocalCollection<Company>("companies", safeTenantId);
    const company = companies.find((item) => item.id === companyId);
    if (!company) throw new Error("La empresa seleccionada no existe.");
    const now = Timestamp.now();
    const balanceBefore = getCompanyCreditBalance(company);
    const balanceAfter = balanceBefore + safeAmount;

    writeLocalCollection(
      "companies",
      safeTenantId,
      companies.map((item) =>
        item.id === companyId
          ? {
              ...item,
              creditBalance: balanceAfter,
              credit_balance: balanceAfter,
              updatedAt: now,
              updated_at: now,
            }
          : item,
      ),
    );

    const movement = {
      id: createLocalId(),
      ...createMovementInput({
        tenantId: safeTenantId,
        companyId,
        type: "credit",
        amount: safeAmount,
        balanceBefore,
        balanceAfter,
        description,
      }),
    };
    const movements = readLocalCollection<CurrentAccountMovement>(
      "current_account_movements",
      safeTenantId,
    );
    writeLocalCollection("current_account_movements", safeTenantId, [...movements, movement]);
    return;
  }

  const firestore = requireDb();
  await runTransaction(firestore, async (transaction) => {
    const companyRef = doc(firestore, "companies", companyId);
    const companySnapshot = await transaction.get(companyRef);

    if (!companySnapshot.exists()) {
      throw new Error("La empresa seleccionada no existe.");
    }

    const company = { id: companySnapshot.id, ...companySnapshot.data() } as Company;
    if (company.tenantId !== safeTenantId) {
      throw new Error("La empresa no pertenece al tenant activo.");
    }

    const now = Timestamp.now();
    const balanceBefore = getCompanyCreditBalance(company);
    const balanceAfter = balanceBefore + safeAmount;

    transaction.set(
      companyRef,
      {
        creditBalance: balanceAfter,
        credit_balance: balanceAfter,
        updatedAt: now,
        updated_at: now,
      },
      { merge: true },
    );

    const movementRef = doc(collection(firestore, "current_account_movements"));
    transaction.set(
      movementRef,
      removeUndefinedFields({
        ...createMovementInput({
          tenantId: safeTenantId,
          companyId,
          type: "credit",
          amount: safeAmount,
          balanceBefore,
          balanceAfter,
          description,
        }),
      }),
    );
  });
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

  if (isDemoMode()) {
    return listDemoEntities<HourRecord>("hourRecords", safeTenantId, "date")
      .filter((record) => {
        if (filters?.employeeId && record.employeeId !== filters.employeeId) return false;
        if (filters?.from && record.date < filters.from) return false;
        if (filters?.to && record.date > filters.to) return false;
        return true;
      })
      .slice(0, 250);
  }

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
    return saveDemoEntity<HourRecord>(
      "hourRecords",
      safeTenantId,
      id ? input : applyDemoCompanyCreditToTrip(safeTenantId, "hourRecords", input),
      id,
    );
  }

  if (!db) {
    const nextId = id ?? createLocalId();
    return saveLocalEntity<HourRecord, UpsertHourRecordInput>(
      "hourRecords",
      safeTenantId,
      id ? input : applyLocalCompanyCreditToTrip(safeTenantId, "hourRecords", input, nextId),
      nextId,
    );
  }

  const firestore = requireDb();

  if (id) {
    const recordRef = doc(firestore, "hourRecords", id);
    await runTransaction(firestore, async (transaction) => {
      const recordSnapshot = await transaction.get(recordRef);

      if (!recordSnapshot.exists()) {
        throw new Error("No se encontro el registro en el tenant activo.");
      }

      const existing = { id: recordSnapshot.id, ...recordSnapshot.data() } as HourRecord;
      if (existing.tenantId !== safeTenantId) {
        throw new Error("No se encontro el registro en el tenant activo.");
      }

      await updateTripWithCreditInTransaction({
        transaction,
        firestore,
        tenantId: safeTenantId,
        collectionName: "hourRecords",
        id,
        input,
        tripKind: "hour",
        existing,
        payload,
      });
    });
    return id;
  }

  const createdRef = doc(collection(firestore, "hourRecords"));

  await runTransaction(firestore, async (transaction) => {
    const application = await applyCompanyCreditInTransaction({
      transaction,
      firestore,
      tenantId: safeTenantId,
      companyId: input.companyId,
      tripId: createdRef.id,
      tripCost: input.cost,
      tripKind: "hour",
    });

    transaction.set(
      createdRef,
      removeUndefinedFields({
        ...input,
        tenantId: safeTenantId,
        currentAccountDiscount: application.currentAccountDiscount,
        creditBalanceAfter: application.balanceAfter,
        credit_balance_after: application.balanceAfter,
        pendingAmount: application.pendingAmount,
        pending_amount: application.pendingAmount,
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  return createdRef.id;
}

export async function deleteHourRecord(id: string, tenantId: string): Promise<void> {
  const safeTenantId = ensureTenantId(tenantId);

  if (isDemoMode() || !db) {
    await removeByTenant("hourRecords", id, safeTenantId);
    return;
  }

  const firestore = requireDb();
  const recordRef = doc(firestore, "hourRecords", id);

  await runTransaction(firestore, async (transaction) => {
    const recordSnapshot = await transaction.get(recordRef);

    if (!recordSnapshot.exists()) {
      throw new Error("No se encontro el registro en el tenant activo.");
    }

    const existing = { id: recordSnapshot.id, ...recordSnapshot.data() } as HourRecord;
    if (existing.tenantId !== safeTenantId) {
      throw new Error("No se encontro el registro en el tenant activo.");
    }

    if (existing.companyId) {
      await adjustCompanyCreditInTransaction({
        transaction,
        firestore,
        tenantId: safeTenantId,
        companyId: existing.companyId,
        amount: existing.currentAccountDiscount ?? 0,
        tripId: id,
        description: "Reversion de descuento por eliminacion de viaje por hora.",
      });
    }

    transaction.delete(recordRef);
  });
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
      id ? input : applyDemoCompanyCreditToTrip(safeTenantId, "distanceTrips", input),
      id,
    );
  }

  if (!db) {
    const nextId = id ?? createLocalId();
    return saveLocalEntity<DistanceTrip, UpsertDistanceTripInput>(
      "distanceTrips",
      safeTenantId,
      id ? input : applyLocalCompanyCreditToTrip(safeTenantId, "distanceTrips", input, nextId),
      nextId,
    );
  }

  const firestore = requireDb();

  if (id) {
    const tripRef = doc(firestore, "distanceTrips", id);
    await runTransaction(firestore, async (transaction) => {
      const tripSnapshot = await transaction.get(tripRef);

      if (!tripSnapshot.exists()) {
        throw new Error("No se encontro el registro en el tenant activo.");
      }

      const existing = { id: tripSnapshot.id, ...tripSnapshot.data() } as DistanceTrip;
      if (existing.tenantId !== safeTenantId) {
        throw new Error("No se encontro el registro en el tenant activo.");
      }

      await updateTripWithCreditInTransaction({
        transaction,
        firestore,
        tenantId: safeTenantId,
        collectionName: "distanceTrips",
        id,
        input,
        tripKind: "km",
        existing,
        payload,
      });
    });
    return id;
  }

  const createdRef = doc(collection(firestore, "distanceTrips"));

  await runTransaction(firestore, async (transaction) => {
    const application = await applyCompanyCreditInTransaction({
      transaction,
      firestore,
      tenantId: safeTenantId,
      companyId: input.companyId,
      tripId: createdRef.id,
      tripCost: input.cost,
      tripKind: "km",
    });

    transaction.set(
      createdRef,
      removeUndefinedFields({
        ...input,
        tenantId: safeTenantId,
        currentAccountDiscount: application.currentAccountDiscount,
        creditBalanceAfter: application.balanceAfter,
        credit_balance_after: application.balanceAfter,
        pendingAmount: application.pendingAmount,
        pending_amount: application.pendingAmount,
        pendingDebtAmount: application.pendingAmount,
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  return createdRef.id;
}

export async function deleteDistanceTrip(id: string, tenantId: string): Promise<void> {
  const safeTenantId = ensureTenantId(tenantId);

  if (isDemoMode() || !db) {
    await removeByTenant("distanceTrips", id, safeTenantId);
    return;
  }

  const firestore = requireDb();
  const tripRef = doc(firestore, "distanceTrips", id);

  await runTransaction(firestore, async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);

    if (!tripSnapshot.exists()) {
      throw new Error("No se encontro el registro en el tenant activo.");
    }

    const existing = { id: tripSnapshot.id, ...tripSnapshot.data() } as DistanceTrip;
    if (existing.tenantId !== safeTenantId) {
      throw new Error("No se encontro el registro en el tenant activo.");
    }

    if (existing.companyId) {
      await adjustCompanyCreditInTransaction({
        transaction,
        firestore,
        tenantId: safeTenantId,
        companyId: existing.companyId,
        amount: existing.currentAccountDiscount ?? 0,
        tripId: id,
        description: "Reversion de descuento por eliminacion de viaje por km.",
      });
    }

    transaction.delete(tripRef);
  });
}
