import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recebe o redirect de confirmação de e-mail / magic link do Supabase
// (?code=...), troca por uma sessão e manda para /hoje.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/hoje`);
}
