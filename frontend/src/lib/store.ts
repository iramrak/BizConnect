/**
 * CleanDerect CRM — Global Event Store (Zustand)
 *
 * Lightweight store that tracks "last updated" timestamps
 * so pages can auto-refresh when data changes elsewhere
 * (e.g. AI creates a task → Tasks page refetches).
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
}

export const useCRMStore = create<CRMStore>((set) => ({
    tasksVersion: 0,
    dealsVersion: 0,
    clientsVersion: 0,

    invalidateTasks: () => set((s) => ({ tasksVersion: s.tasksVersion + 1 })),
    invalidateDeals: () => set((s) => ({ dealsVersion: s.dealsVersion + 1 })),
    invalidateClients: () => set((s) => ({ clientsVersion: s.clientsVersion + 1 })),
}));
