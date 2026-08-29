import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { ExecutionTasks } from "@/components/hoje/ExecutionTasks";
import type { ChecklistTemplate, TarefaTemplate } from "@/types/database";

export default async function ExecutarChecklistPage({ params }: { params: { checklistId: string } }) {
  const usuario = await getOrCreateUsuarioAtual();
  const supabase = createClient();
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", params.checklistId).eq("ativo", true).maybeSingle();
  if (!checklist || !usuario) notFound();
  const { data: tarefas } = await supabase.from("tarefa_templates").select("*").eq("checklist_template_id", params.checklistId).order("ordem");
  const { data: unidade } = await supabase.from("unidades").select("nome").eq("id", checklist.unidade_id).maybeSingle();
  const { data: setor } = await supabase.from("setores").select("nome").eq("id", checklist.setor_id).maybeSingle();

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/hoje" className="font-mono text-xs text-ink-muted hover:text-navy">← Hoje</Link>
      <div className="mt-5 mb-6">
        <div className="font-mono text-xs text-ink-muted uppercase tracking-wide mb-2">{unidade?.nome ?? "Unidade"} · {setor?.nome ?? "Setor"}</div>
        <h1 className="font-display font-bold text-2xl text-navy">{(checklist as ChecklistTemplate).nome}</h1>
      </div>
      <ExecutionTasks tarefas={(tarefas ?? []) as TarefaTemplate[]} />
    </div>
  );
}