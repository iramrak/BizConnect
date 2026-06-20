/**
 * BizConnect CRM — Global Store (Zustand)
 *
 * Tracks:
 * - "last updated" version counters for auto-refresh across pages
 * - Current locale for sending to API (e.g. AI chat prompts)
 */

import { create } from "zustand";

interface CRMStore {
    /** Increment counters trigger refetch in pages that subscribe */
    tasksVersion: number;
    dealsVersion: number;
    clientsVersion: number;

    /** Call after any mutation to trigger page refetch */
    invalidateTasks: () => void;
    invalidateDeals: () => void;
    invalidateClients: () => void;

    /** Current UI locale ('ru' | 'kk') — synced by LanguageSwitcher */
    locale: string;
    setLocale: (locale: string) => void;
}

export const useCRMStore = create<CRMStore>((set) => ({
    tasksVersion: 0,
    dealsVersion: 0,
    clientsVersion: 0,

    invalidateTasks: () => set((s) => ({ tasksVersion: s.tasksVersion + 1 })),
    invalidateDeals: () => set((s) => ({ dealsVersion: s.dealsVersion + 1 })),
    invalidateClients: () => set((s) => ({ clientsVersion: s.clientsVersion + 1 })),

    locale: "ru",
    setLocale: (locale) => set({ locale }),
}));
