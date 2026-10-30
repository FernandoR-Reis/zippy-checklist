"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { Unidade } from "@/types/database";

export async function listarUnidades(empresaId: string): Promise<Unidade[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("unidades")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  return (data ?? []) as Unidade[];
}

export async function criarUnidade(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const usuario = await getOrCreateUsuarioAtual();
  if (!nome || !usuario || usuario.perfil !== "gestor" || usuario.empresa_id !== empresaId) return;

  const supabase = createClient();
  await supabase.from("unidades").insert({ empresa_id: empresaId, nome });
  revalidatePath("/unidades");
}
