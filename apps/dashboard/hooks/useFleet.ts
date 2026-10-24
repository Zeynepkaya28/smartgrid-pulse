"use client";

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { sortByUrgency, useFleetStore, useFleetStoreApi } from "@/lib/store/fleet";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  AlertEventSchema,
  FaultsEventSchema,
  FleetStateSchema,
  type DeviceState,
  type FaultType,
} from "@/lib/types";

/** If no "state" arrives for this long, show "reconnecting" even if the socket is up. */
const STALE_AFTER_MS = 6_000;

/**
 * Subscribes once to the Realtime "fleet" channel and feeds the store:
 *   state  -> device states + fault map (1 Hz from the worker)
 *   alert  -> alert list + toast
 *   faults -> fault map changes between ticks
 * Payloads are validated with zod; anything malformed is ignored.
 */
export function useFleetSubscription(): void {
  const store = useFleetStoreApi();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { applyState, applyFaults, pushAlert, setStatus } = store.getState();

    const channel = supabase
      .channel("fleet", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const parsed = FleetStateSchema.safeParse(payload);
        if (parsed.success) applyState(parsed.data);
      })
      .on("broadcast", { event: "faults" }, ({ payload }) => {
        const parsed = FaultsEventSchema.safeParse(payload);
        if (parsed.success) applyFaults(parsed.data.faults);
      })
      .on("broadcast", { event: "alert" }, ({ payload }) => {
        const parsed = AlertEventSchema.safeParse(payload);
        if (parsed.success) {
          pushAlert({ ...parsed.data, id: parsed.data.id ?? -parsed.data.ts, acknowledged: false });
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setStatus("reconnecting");
        }
      });

    const watchdog = window.setInterval(() => {
      const { status, lastStateAt } = store.getState();
      if (status === "live" && Date.now() - lastStateAt > STALE_AFTER_MS) {
        setStatus("reconnecting");
      }
    }, 2_000);

    return () => {
      window.clearInterval(watchdog);
      void supabase.removeChannel(channel);
    };
  }, [store]);
}

export function useDevices(): DeviceState[] {
  const devices = useFleetStore(useShallow((s) => Object.values(s.devices)));
  return useMemo(() => sortByUrgency(devices), [devices]);
}

export function useDevice(id: string): DeviceState | undefined {
  return useFleetStore((s) => s.devices[id]);
}

export function useActiveFaults(id: string): FaultType[] {
  return useFleetStore(
    useShallow((s) => Object.keys(s.faults[id] ?? {}) as FaultType[]),
  );
}

export function useConnectionStatus() {
  return useFleetStore((s) => s.status);
}
