"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?erro=${encodeURIComponent("Informe e-mail e senha.")}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  }

  redirect("/hoje");
}

export async function signUp(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const empresaNome = String(formData.get("empresa_nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nome || !empresaNome || !emailValido || password.length < 6) {
    redirect(`/cadastro?erro=${encodeURIComponent("Preencha todos os campos e use uma senha com pelo menos 6 caracteres.")}`);
  }

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
    redirect(`/cadastro?erro=${encodeURIComponent("Não foi possível criar sua conta. Verifique os dados e tente novamente.")}`);
  }

  // Se a confirmação de e-mail estiver desativada no projeto Supabase
  // (recomendado em desenvolvimento), o signUp já retorna com sessão
  // ativa e o usuário cai direto em /hoje pelo middleware.
  redirect("/hoje");
}

export async function definirSenha(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (password.length < 6) {
    redirect("/definir-senha?erro=" + encodeURIComponent("A senha deve ter pelo menos 6 caracteres."));
  }

  if (password !== confirmacao) {
    redirect("/definir-senha?erro=" + encodeURIComponent("As senhas não coincidem."));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/definir-senha?erro=" + encodeURIComponent("Não foi possível definir sua senha. Abra o convite novamente."));
  }

  redirect("/hoje");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
