"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getBrowserSupabase } from "@/lib/supabase/client";

export interface SessionUser {
  id: string;
  email: string | null;
}

const SessionContext = createContext<SessionUser | null>(null);

/** Current user (null for visitors). Seeded by the server, kept in sync with Supabase Auth. */
export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}
