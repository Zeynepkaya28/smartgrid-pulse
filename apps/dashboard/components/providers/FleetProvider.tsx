"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AlertToaster } from "@/components/ui/AlertToaster";
import { useFleetSubscription } from "@/hooks/useFleet";
import { createFleetStore, FleetStoreContext } from "@/lib/store/fleet";
import type { Alert, DeviceState } from "@/lib/types";

import { SessionProvider, type SessionUser } from "./SessionProvider";

function Subscriber() {
  useFleetSubscription();
  return null;
}

interface FleetProviderProps {
  initialDevices: DeviceState[];
  initialAlerts: Alert[];
  user: SessionUser | null;
  children: ReactNode;
}

/** Store, query cache, session and the single Realtime subscription for the whole app. */
export function FleetProvider({ initialDevices, initialAlerts, user, children }: FleetProviderProps) {
  const [store] = useState(() => createFleetStore(initialDevices, initialAlerts));
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } }),
  );

  return (
    <SessionProvider initialUser={user}>
      <QueryClientProvider client={queryClient}>
        <FleetStoreContext.Provider value={store}>
          <Subscriber />
          {children}
          <AlertToaster />
        </FleetStoreContext.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
