import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { Unidade, Usuario } from "@/types/database";

export async function unidadeDoUsuario(unidadeId: string): Promise<{ usuario: Usuario; unidade: Unidade } | null> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) return null;
  const supabase = createClient();
  const { data: unidade } = await supabase.from("unidades").select("*").eq("id", unidadeId).eq("empresa_id", usuario.empresa_id).maybeSingle();
  return unidade ? { usuario, unidade: unidade as Unidade } : null;
}