"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/database";

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

  let empresaId: string | null = null;

  if (empresaNome) {
    const { data: empresa } = await supabase
      .from("empresas")
      .insert({ nome: empresaNome })
      .select("id")
      .single();
    empresaId = empresa?.id ?? null;
  }

  const { data: novo } = await supabase
    .from("usuarios")
    .insert({
      id: user.id,
      empresa_id: empresaId,
      nome,
      email: user.email!,
      perfil: "gestor",
    })
    .select("*")
    .single();

  return novo as Usuario;
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

  if (!email || !nome) {
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

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
  });

  if (error || !data?.user) {
    redirect(
      "/usuarios?erro=" + encodeURIComponent(error?.message ?? "Não foi possível enviar o convite.")
    );
  }

  await admin.from("usuarios").insert({
    id: data.user.id,
    empresa_id: empresaId,
    nome,
    email,
    perfil,
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
