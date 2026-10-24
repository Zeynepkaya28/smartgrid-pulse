"use client";

import { useQuery } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  HealthPointSchema,
  HistoryPointSchema,
  type HealthPoint,
  type HistoryPoint,
  type Range,
} from "@/lib/types";

const REFETCH_MS = 30_000;

/** get_device_history RPC for the selected range, refreshed every 30 s. */
export function useDeviceHistory(deviceId: string, range: Range) {
  return useQuery({
    queryKey: ["device-history", deviceId, range],
    refetchInterval: REFETCH_MS,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<HistoryPoint[]> => {
      const { data, error } = await getBrowserSupabase().rpc("get_device_history", {
        p_device: deviceId,
        p_range: range,
      });
      if (error) throw new Error(error.message);
      return HistoryPointSchema.array().parse(
        (data ?? []).map((row) => ({ ...row, bucket: Date.parse(row.bucket) })),
      );
    },
  });
}

/** 24 h health score in 5-minute buckets (get_health_history RPC). */
export function useHealthHistory(deviceId: string) {
  return useQuery({
    queryKey: ["health-history", deviceId],
    refetchInterval: 60_000,
    queryFn: async (): Promise<HealthPoint[]> => {
      const { data, error } = await getBrowserSupabase().rpc("get_health_history", {
        p_device: deviceId,
        p_hours: 24,
      });
      if (error) throw new Error(error.message);
      return HealthPointSchema.array().parse(
        (data ?? []).map((row) => ({ ...row, bucket: Date.parse(row.bucket) })),
      );
    },
  });
}
