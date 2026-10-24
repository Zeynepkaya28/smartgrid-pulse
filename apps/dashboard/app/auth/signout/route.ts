import { NextResponse, type NextRequest } from "next/server";

import { publicOrigin } from "@/lib/origin";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", publicOrigin(request)), { status: 303 });
}
