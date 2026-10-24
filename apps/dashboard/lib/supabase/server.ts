import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

import { AUTH_COOKIE_NAME } from "./config";

/**
 * URL the Next.js server uses to reach Supabase. In Docker this differs from the
 * browser-facing URL (host.docker.internal vs 127.0.0.1); elsewhere they are equal.
 */
export const SUPABASE_SERVER_URL =
  process.env.SUPABASE_INTERNAL_URL || publicEnv.NEXT_PUBLIC_SUPABASE_URL;

/** Per-request server client. Uses the anon key: RLS applies, never the service role. */
export async function createSupabaseServer(): Promise<SupabaseClient<Database>> {
  const store = await cookies();
  return createServerClient<Database>(
    SUPABASE_SERVER_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Called from a Server Component: the middleware refreshes the cookie instead.
          }
        },
      },
    },
  );
}

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
