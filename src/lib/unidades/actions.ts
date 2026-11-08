"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { Unidade } from "@/types/database";

export async function listarUnidades(empresaId: string): Promise<Unidade[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("unidades")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  if (error) throw new Error("Não foi possível carregar as unidades.");
  return (data ?? []) as Unidade[];
}

export async function criarUnidade(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const usuario = await getOrCreateUsuarioAtual();
  if (!nome || !usuario || usuario.perfil !== "administrador" || usuario.empresa_id !== empresaId) return;

  const supabase = createClient();
  const { error } = await supabase.from("unidades").insert({ empresa_id: empresaId, nome });
  if (error) throw new Error("Não foi possível criar a unidade.");
  revalidatePath("/unidades");
}

export async function atualizarUnidade(unidadeId: string, formData: FormData) {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id || usuario.perfil !== "administrador") {
    redirect("/unidades?erro=" + encodeURIComponent("Somente administradores podem editar unidades."));
  }

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome || nome.length > 120) {
    redirect(`/unidades?editar=${encodeURIComponent(unidadeId)}&erro=${encodeURIComponent("Informe um nome com até 120 caracteres.")}`);
  }

  const { data, error } = await createClient()
    .from("unidades")
    .update({ nome })
    .eq("id", unidadeId)
    .eq("empresa_id", usuario.empresa_id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Falha ao atualizar unidade:", error.message);
    redirect(`/unidades?editar=${encodeURIComponent(unidadeId)}&erro=${encodeURIComponent("Não foi possível salvar a unidade.")}`);
  }

  revalidatePath("/unidades");
  revalidatePath(`/unidades/${unidadeId}`, "layout");
  revalidatePath("/usuarios");
  revalidatePath("/hoje");
  redirect("/unidades?sucesso=1");
}
