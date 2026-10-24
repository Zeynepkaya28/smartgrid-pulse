"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | undefined;

/** Singleton browser client (anon key + the user's session cookie). */
export function getBrowserSupabase(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}
