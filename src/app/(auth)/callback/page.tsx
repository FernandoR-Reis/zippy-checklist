"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  useEffect(() => {
    async function concluirConvite() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const fragmento = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragmento.get("access_token");
      const refreshToken = fragmento.get("refresh_token");

      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : { error: new Error("Convite sem credenciais de acesso.") };

      window.location.replace(
        error
          ? `/login?erro=${encodeURIComponent("Convite inválido ou expirado.")}`
          : "/definir-senha"
      );
    }

    void concluirConvite();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy px-4">
      <p className="font-body text-sm text-white">Ativando seu acesso...</p>
    </main>
  );
}