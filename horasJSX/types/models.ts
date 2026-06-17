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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export type UpsertHourRecordInput = Omit<
  HourRecord,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export type UpsertDistanceTripInput = Omit<
  DistanceTrip,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;
