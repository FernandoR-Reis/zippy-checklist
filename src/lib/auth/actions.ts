"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/hoje");
}

export async function signUp(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const empresaNome = String(formData.get("empresa_nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Fica salvo em auth.users.user_metadata e é lido em
      // getOrCreateUsuarioAtual() para criar a Empresa + o perfil
      // (gestor) na primeira vez que a sessão é confirmada.
      data: { nome, empresa_nome: empresaNome },
    },
  });

  if (error) {
    redirect(`/cadastro?erro=${encodeURIComponent(error.message)}`);
  }

  // Se a confirmação de e-mail estiver desativada no projeto Supabase
  // (recomendado em desenvolvimento), o signUp já retorna com sessão
  // ativa e o usuário cai direto em /hoje pelo middleware.
  redirect("/hoje");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
