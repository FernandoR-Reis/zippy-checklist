"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/database";

function mensagemErroConvite(mensagem: string) {
  const erro = mensagem.toLowerCase();

  if (erro.includes("rate limit")) {
    return "O limite de envio de e-mails foi atingido. Aguarde alguns minutos e tente novamente.";
  }

  if (erro.includes("already") && erro.includes("registered")) {
    return "Este e-mail já possui uma conta ou convite ativo.";
  }

  if (erro.includes("redirect") || erro.includes("url")) {
    return "A URL de retorno do convite não está autorizada no Supabase.";
  }

  if (erro.includes("api key") || erro.includes("jwt")) {
    return "A chave administrativa do Supabase configurada na Vercel é inválida.";
  }

  return "O Supabase não conseguiu enviar o e-mail. Verifique a configuração de SMTP no Supabase.";
}

/**
 * Garante que existe um registro em public.usuarios para o usuário
 * autenticado. Na primeira vez (logo após o cadastro), cria a Empresa
 * a partir do metadata salvo em signUp() e o perfil como "gestor".
 */
export async function getOrCreateUsuarioAtual(): Promise<Usuario | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: existente } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existente) return existente as Usuario;

  const nome = (user.user_metadata?.nome as string) || user.email!.split("@")[0];
  const empresaNome = user.user_metadata?.empresa_nome as string | undefined;

  if (!empresaNome) return null;

  const { data: novo, error } = await supabase.rpc("criar_empresa_e_usuario", {
    nome_empresa: empresaNome,
    nome_usuario: nome,
  });

  return error || !novo ? null : (novo as Usuario);
}

export async function listarUsuariosDaEmpresa(empresaId: string): Promise<Usuario[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  return (data ?? []) as Usuario[];
}

export async function convidarUsuario(empresaId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "operacional") as "gestor" | "operacional";

  const solicitante = await getOrCreateUsuarioAtual();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const perfilValido = perfil === "gestor" || perfil === "operacional";

  if (
    !solicitante ||
    solicitante.perfil !== "gestor" ||
    solicitante.empresa_id !== empresaId
  ) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não tem permissão para convidar usuários."));
  }

  if (!emailValido || !nome || !perfilValido) {
    redirect("/usuarios?erro=" + encodeURIComponent("Preencha nome e e-mail."));
  }

  const admin = createAdminClient();

  if (!admin) {
    redirect(
      "/usuarios?erro=" +
        encodeURIComponent(
          "Convite por e-mail requer SUPABASE_SERVICE_ROLE_KEY configurada em .env.local (veja o README)."
        )
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zippy-checklist.vercel.app";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${siteUrl}/callback?next=/definir-senha`,
  });

  if (error || !data?.user) {
    console.error("Falha ao enviar convite:", error?.message);
    redirect(
      "/usuarios?erro=" +
        encodeURIComponent(mensagemErroConvite(error?.message ?? "Resposta inválida do Supabase."))
    );
  }

  const { error: perfilError } = await admin.from("usuarios").insert({
    id: data.user.id,
    empresa_id: empresaId,
    nome,
    email,
    perfil,
  });

  if (perfilError) {
    redirect("/usuarios?erro=" + encodeURIComponent("O convite foi enviado, mas não foi possível preparar o perfil do usuário."));
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function excluirUsuario(usuarioId: string) {
  const solicitante = await getOrCreateUsuarioAtual();

  if (!solicitante || solicitante.perfil !== "gestor") {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não tem permissão para excluir usuários."));
  }

  if (solicitante.id === usuarioId) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não pode excluir sua própria conta."));
  }

  const admin = createAdminClient();

  if (!admin) {
    redirect(
      "/usuarios?erro=" +
        encodeURIComponent("A exclusão de usuários requer SUPABASE_SERVICE_ROLE_KEY configurada.")
    );
  }

  const { data: usuario, error: usuarioError } = await admin
    .from("usuarios")
    .select("id, empresa_id")
    .eq("id", usuarioId)
    .maybeSingle();

  if (usuarioError || !usuario || usuario.empresa_id !== solicitante.empresa_id) {
    redirect("/usuarios?erro=" + encodeURIComponent("Usuário não encontrado na sua empresa."));
  }

  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    redirect("/usuarios?erro=" + encodeURIComponent("Não foi possível excluir o usuário. Tente novamente."));
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
