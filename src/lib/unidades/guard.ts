import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { Unidade, Usuario } from "@/types/database";

export function ehAdministrador(usuario: Usuario) {
  return usuario.perfil === "administrador";
}

export function podeGerenciarUnidade(usuario: Usuario, unidadeId: string) {
  return ehAdministrador(usuario) ||
    (usuario.perfil === "gestor" && usuario.unidade_id === unidadeId);
}

export async function unidadeDoUsuario(unidadeId: string): Promise<{ usuario: Usuario; unidade: Unidade } | null> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id || !podeGerenciarUnidade(usuario, unidadeId)) return null;
  const supabase = createClient();
  const { data: unidade } = await supabase.from("unidades").select("*").eq("id", unidadeId).eq("empresa_id", usuario.empresa_id).maybeSingle();
  return unidade ? { usuario, unidade: unidade as Unidade } : null;
}