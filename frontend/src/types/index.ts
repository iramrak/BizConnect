/* ──────────────────────────────────────────────
   BizConnect CRM — TypeScript Interfaces
   Mirrors Django models + DRF serializer output
   ────────────────────────────────────────────── */

// ── Enums ────────────────────────────────────

export type UserRole = "admin" | "manager" | "head";

export type DealStage =
  | "new"
  | "in_progress"
  | "proposal"
  | "negotiation"
  | "payment"
  | "closed_won"
  | "closed_lost";

export type DealCurrency = "KZT" | "RUB" | "USD" | "EUR";

export type TaskType = "call" | "meeting" | "email";

export type TaskStatus = "open" | "completed";

// ── Short (nested) representations ───────────

export interface UserShort {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface ClientShort {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
}

// ── Full entities ────────────────────────────

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  title: string;
  client: ClientShort;
  amount: string; // Decimal comes as string from DRF
  currency: DealCurrency;
  currency_display: string;
  stage: DealStage;
  stage_display: string;
  probability: number;
  expected_close_date: string | null;
  manager: UserShort;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  deal: { id: number; title: string } | null;
  client: ClientShort | null;
  task_type: TaskType;
  task_type_display: string;
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  status_display: string;
  creator: UserShort;
  created_at: string;
}

export interface ActionLog {
  id: number;
  user: UserShort | null;
  action: string;
  created_at: string;
}

// ── API response wrappers ────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Auth types ───────────────────────────────

export interface TokenPair {
  access: string;
  refresh: string;
}
