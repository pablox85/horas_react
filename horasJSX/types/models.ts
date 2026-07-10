import type { Timestamp } from "firebase/firestore";

export type UserRole = "owner" | "admin" | "member";

export interface AppUser {
  id: string;
  tenantId: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  rut?: string;
  address?: string;
  contactEmail?: string;
  hourlyRate: number;
  pricePerKm?: number;
  creditBalance?: number;
  credit_balance?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updated_at?: Timestamp;
}

export interface CurrentAccount {
  id: string;
  tenantId: string;
  companyId: string;
  saldo: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CurrentAccountMovementType = "credit" | "trip_charge" | "adjustment";

export interface CurrentAccountMovement {
  id: string;
  tenantId: string;
  tenant_id: string;
  companyId: string;
  company_id: string;
  type: CurrentAccountMovementType;
  amount: number;
  balanceBefore: number;
  balance_before: number;
  balanceAfter: number;
  balance_after: number;
  tripId?: string | null;
  trip_id?: string | null;
  description: string;
  createdAt: Timestamp;
  created_at: Timestamp;
  createdBy: string;
  created_by: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HourRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  companyId?: string;
  date: string;
  hoursWorked: number;
  notes?: string;
  cost: number;
  costMode?: "calculated" | "manual";
  manualCost?: number;
  currentAccountDiscount?: number;
  creditBalanceAfter?: number;
  credit_balance_after?: number;
  pendingAmount?: number;
  pending_amount?: number;
  source: "manual" | "timer" | "pdf-import";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DistanceTrip {
  id: string;
  tenantId: string;
  companyId?: string;
  tripName: string;
  date: string;
  kilometers: number;
  ratePerKm: number;
  cost: number;
  costMode?: "calculated" | "manual";
  manualCost?: number;
  currentAccountDiscount?: number;
  creditBalanceAfter?: number;
  credit_balance_after?: number;
  pendingAmount?: number;
  pending_amount?: number;
  pendingDebtAmount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type UpsertEmployeeInput = Omit<
  Employee,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export type UpsertCompanyInput = Omit<
  Company,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export type UpsertCurrentAccountInput = Omit<
  CurrentAccount,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export type UpsertHourRecordInput = Omit<
  HourRecord,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export type UpsertDistanceTripInput = Omit<
  DistanceTrip,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;
