import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { ChecklistTemplate, Execucao, Usuario } from "@/types/database";

export async function execucaoComContexto(execucaoId: string): Promise<{
  usuario: Usuario;
  execucao: Execucao;
  checklist: ChecklistTemplate;
  podeEditar: boolean;
} | null> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) return null;
  const supabase = createClient();
  const { data: execucao } = await supabase.from("execucoes").select("*").eq("id", execucaoId).maybeSingle();
  if (!execucao) return null;
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", execucao.checklist_template_id).maybeSingle();
  if (!checklist) return null;
  const { data: unidade } = await supabase.from("unidades").select("empresa_id").eq("id", checklist.unidade_id).maybeSingle();
  if (!unidade || unidade.empresa_id !== usuario.empresa_id) return null;
  const ehResponsavel = execucao.usuario_id === usuario.id;
  if (!ehResponsavel && usuario.perfil !== "gestor") return null;
  return { usuario, execucao: execucao as Execucao, checklist: checklist as ChecklistTemplate, podeEditar: ehResponsavel && execucao.status !== "concluido" };
}