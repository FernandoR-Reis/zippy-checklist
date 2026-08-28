"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Empresa } from "@/types/database";

export async function buscarEmpresa(empresaId: string): Promise<Empresa | null> {
  const supabase = createClient();
  const { data } = await supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle();
  return data as Empresa | null;
}

export async function atualizarNomeEmpresa(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const supabase = createClient();
  await supabase.from("empresas").update({ nome }).eq("id", empresaId);
  revalidatePath("/empresa");
}
