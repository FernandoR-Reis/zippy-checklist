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
 * a partir do metadata salvo em signUp() e o perfil como "administrador".
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
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  if (error) throw new Error("Não foi possível carregar os usuários da empresa.");
  return (data ?? []) as Usuario[];
}

export async function listarSetoresDosUsuarios(usuarioIds: string[]): Promise<Record<string, string[]>> {
  if (!usuarioIds.length) return {};

  const { data, error } = await createClient()
    .from("usuario_setores")
    .select("usuario_id, setor_id")
    .in("usuario_id", usuarioIds);
  if (error) throw new Error("Não foi possível carregar os setores dos usuários.");

  return (data ?? []).reduce<Record<string, string[]>>((setores, vinculo) => {
    (setores[vinculo.usuario_id] ??= []).push(vinculo.setor_id);
    return setores;
  }, {});
}

export async function atualizarSetoresDoUsuario(usuarioId: string, formData: FormData) {
  const solicitante = await getOrCreateUsuarioAtual();
  if (
    !solicitante ||
    (solicitante.perfil !== "administrador" && solicitante.perfil !== "gestor") ||
    !solicitante.empresa_id
  ) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não tem permissão para alterar os setores."));
  }

  const supabase = createClient();
  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", usuarioId)
    .eq("empresa_id", solicitante.empresa_id)
    .eq("perfil", "operacional")
    .maybeSingle();
  if (usuarioError || !usuario) {
    redirect("/usuarios?erro=" + encodeURIComponent("Usuário operacional não encontrado."));
  }

  const setorIds = [...new Set(formData.getAll("setor_ids").map((id) => String(id)))];
  const { error } = await supabase.rpc("definir_setores_usuario", {
    p_usuario_id: usuarioId,
    p_setor_ids: setorIds,
  });
  if (error) {
    console.error("Falha ao atualizar setores do usuário:", error.message);
    redirect("/usuarios?erro=" + encodeURIComponent("Não foi possível salvar os setores do usuário."));
  }

  revalidatePath("/usuarios");
  revalidatePath("/hoje");
  redirect(`/usuarios?sucesso=setores&usuarioId=${encodeURIComponent(usuarioId)}`);
}

export async function atualizarUsuario(usuarioId: string, formData: FormData) {
  const solicitante = await getOrCreateUsuarioAtual();
  if (!solicitante?.empresa_id) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não tem permissão para editar usuários."));
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "");
  const unidadeId = String(formData.get("unidade_id") ?? "").trim();
  const ehAdministrador = solicitante.perfil === "administrador";
  const ehGestor = solicitante.perfil === "gestor";
  if (!nome || nome.length > 120) {
    redirect("/usuarios?erro=" + encodeURIComponent("Informe um nome válido."));
  }
  if (
    (ehAdministrador && !["administrador", "gestor", "operacional"].includes(perfil)) ||
    (ehGestor && perfil !== "operacional") ||
    (!ehAdministrador && !ehGestor)
  ) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não pode atribuir esse perfil."));
  }

  let unidadeDestino: string | null = null;
  if (perfil !== "administrador") {
    unidadeDestino = ehGestor ? solicitante.unidade_id : unidadeId;
    if (!unidadeDestino) {
      redirect("/usuarios?erro=" + encodeURIComponent("Selecione uma unidade válida."));
    }
    const { data: unidade, error } = await createClient()
      .from("unidades")
      .select("id")
      .eq("id", unidadeDestino)
      .eq("empresa_id", solicitante.empresa_id)
      .maybeSingle();
    if (error || !unidade) {
      redirect("/usuarios?erro=" + encodeURIComponent("Selecione uma unidade válida."));
    }
  }

  const { error } = await createClient().rpc("atualizar_usuario", {
    p_usuario_id: usuarioId,
    p_nome: nome,
    p_perfil: perfil,
    p_unidade_id: unidadeDestino,
  });
  if (error) {
    console.error("Falha ao atualizar usuário:", error.message);
    redirect("/usuarios?erro=" + encodeURIComponent("Não foi possível salvar as alterações."));
  }

  revalidatePath("/usuarios");
  revalidatePath("/hoje");
  redirect(`/usuarios?sucesso=usuario&usuarioId=${encodeURIComponent(usuarioId)}`);
}

export async function convidarUsuario(empresaId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "operacional");
  const unidadeId = String(formData.get("unidade_id") ?? "").trim();

  const solicitante = await getOrCreateUsuarioAtual();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const administrador = solicitante?.perfil === "administrador";
  const gestor = solicitante?.perfil === "gestor";
  const perfilValido =
    perfil === "operacional" ||
    (administrador && (perfil === "gestor" || perfil === "administrador"));

  if (
    !solicitante ||
    (!administrador && !gestor) ||
    solicitante.empresa_id !== empresaId
  ) {
    redirect("/usuarios?erro=" + encodeURIComponent("Você não tem permissão para convidar usuários."));
  }

  const unidadeDestino = gestor ? solicitante.unidade_id : unidadeId;
  if (!emailValido || !nome || !perfilValido || (perfil !== "administrador" && !unidadeDestino)) {
    redirect("/usuarios?erro=" + encodeURIComponent("Preencha nome, e-mail, perfil e unidade."));
  }

  if (gestor && perfil !== "operacional") {
    redirect("/usuarios?erro=" + encodeURIComponent("Gestores podem convidar somente usuários operacionais."));
  }

  if (perfil !== "administrador") {
    const { data: unidade, error } = await createClient()
      .from("unidades")
      .select("id")
      .eq("id", unidadeDestino)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (error || !unidade) {
      redirect("/usuarios?erro=" + encodeURIComponent("Selecione uma unidade válida."));
    }
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
    unidade_id: perfil === "administrador" ? null : unidadeDestino,
    nome,
    email,
    perfil,
  });

  if (perfilError) {
    console.error("Falha ao criar perfil do usuário convidado:", perfilError.message);
    const { error: erroLimpeza } = await admin.auth.admin.deleteUser(data.user.id);
    if (erroLimpeza) {
      console.error("Falha ao remover convite sem perfil:", erroLimpeza.message);
    }
    redirect("/usuarios?erro=" + encodeURIComponent("Não foi possível concluir o convite. Tente novamente."));
  }

  revalidatePath("/usuarios");
  redirect("/usuarios?sucesso=convite");
}

export async function excluirUsuario(usuarioId: string) {
  const solicitante = await getOrCreateUsuarioAtual();

  if (!solicitante || (solicitante.perfil !== "administrador" && solicitante.perfil !== "gestor")) {
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
    .select("id, empresa_id, unidade_id, perfil")
    .eq("id", usuarioId)
    .maybeSingle();

  const podeRemover =
    solicitante.perfil === "administrador" ||
    (solicitante.perfil === "gestor" &&
      solicitante.unidade_id === usuario?.unidade_id &&
      usuario?.perfil === "operacional");
  if (usuarioError || !usuario || usuario.empresa_id !== solicitante.empresa_id || !podeRemover) {
    redirect("/usuarios?erro=" + encodeURIComponent("Usuário não encontrado na sua empresa."));
  }

  const { error } = await admin.auth.admin.deleteUser(usuarioId);

  if (error) {
    redirect("/usuarios?erro=" + encodeURIComponent("Não foi possível excluir o usuário. Tente novamente."));
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
