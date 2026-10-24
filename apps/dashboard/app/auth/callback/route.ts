import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";

/** Magic-link landing: exchange the PKCE code for a session cookie, then go back. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  // Only same-site relative redirects (no open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?hata=baglanti", url.origin));
}
