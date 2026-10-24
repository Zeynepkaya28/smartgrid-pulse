"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import type { Alert, DeviceState, FaultMap, FleetState } from "@/lib/types";

/** Live points kept per device for the "15d" chart (15 min at 1 Hz). */
export const LIVE_POINTS = 900;
const MAX_ALERTS = 50;
const TOAST_LIMIT = 3;

export type ConnectionStatus = "connecting" | "live" | "reconnecting";

export interface LivePoint {
  t: number;
  temperature: number;
  vibration: number;
  pressure: number;
  current: number;
}

export interface Toast {
  key: string;
  alert: Alert;
}

export interface FleetData {
  devices: Record<string, DeviceState>;
  faults: FaultMap;
  live: Record<string, LivePoint[]>;
  alerts: Alert[];
  toasts: Toast[];
  status: ConnectionStatus;
  lastStateAt: number;
}

interface FleetActions {
  applyState: (state: FleetState) => void;
  applyFaults: (faults: FaultMap) => void;
  pushAlert: (alert: Alert) => void;
  dismissToast: (key: string) => void;
  markAcknowledged: (id: number) => void;
  setStatus: (status: ConnectionStatus) => void;
}

export type FleetStore = FleetData & FleetActions;

/**
 * One store per browser tab (and per server request during SSR), created by
 * FleetProvider with the server-rendered data. A module-level store would leak
 * state between requests on the server.
 */
export function createFleetStore(devices: DeviceState[], alerts: Alert[]): StoreApi<FleetStore> {
  return createStore<FleetStore>()((set) => ({
    devices: Object.fromEntries(devices.map((d) => [d.device_id, d])),
    faults: {},
    live: {},
    alerts,
    toasts: [],
    status: "connecting",
    lastStateAt: 0,

    applyState: (state) =>
      set((s) => {
        const devicesById = { ...s.devices };
        const live = { ...s.live };
        for (const d of state.devices) {
          devicesById[d.device_id] = d;
          const prev = live[d.device_id] ?? [];
          if (prev.at(-1)?.t === d.ts) continue;
          const next =
            prev.length >= LIVE_POINTS ? prev.slice(prev.length - LIVE_POINTS + 1) : prev.slice();
          next.push({ t: d.ts, ...d.values });
          live[d.device_id] = next;
        }
        return {
          devices: devicesById,
          live,
          faults: state.faults,
          lastStateAt: Date.now(),
          status: "live",
        };
      }),

    applyFaults: (faults) => set({ faults }),

    pushAlert: (alert) =>
      set((s) => ({
        alerts: [alert, ...s.alerts.filter((a) => a.id !== alert.id)].slice(0, MAX_ALERTS),
        toasts: [{ key: `${alert.id}-${alert.ts}`, alert }, ...s.toasts].slice(0, TOAST_LIMIT),
      })),

    dismissToast: (key) => set((s) => ({ toasts: s.toasts.filter((t) => t.key !== key) })),

    markAcknowledged: (id) =>
      set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      })),

    setStatus: (status) => set({ status }),
  }));
}

export const FleetStoreContext = createContext<StoreApi<FleetStore> | null>(null);

export function useFleetStore<T>(selector: (s: FleetStore) => T): T {
  const store = useContext(FleetStoreContext);
  if (!store) throw new Error("useFleetStore must be used inside <FleetProvider>");
  return useStore(store, selector);
}

export function useFleetStoreApi(): StoreApi<FleetStore> {
  const store = useContext(FleetStoreContext);
  if (!store) throw new Error("useFleetStoreApi must be used inside <FleetProvider>");
  return store;
}

const SEVERITY_RANK = { critical: 0, warning: 1, normal: 2 } as const;

/** Most urgent first, then lowest health. */
export function sortByUrgency(devices: DeviceState[]): DeviceState[] {
  return [...devices].sort(
    (a, b) => SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status] || a.health - b.health,
  );
}
