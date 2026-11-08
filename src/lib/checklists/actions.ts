"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import type { ChecklistTemplate, Recorrencia, TarefaTemplate } from "@/types/database";
const recorrencias: Recorrencia[] = ["diaria", "semanal", "mensal"];
const listaPath = (u: string) => `/unidades/${u}/checklists`;
const itemPath = (u: string, c: string) => `${listaPath(u)}/${c}`;
export async function listarChecklists(unidadeId: string) { const { data } = await createClient().from("checklist_templates").select("*").eq("unidade_id", unidadeId).order("nome"); return (data ?? []) as ChecklistTemplate[]; }
export async function buscarChecklist(unidadeId: string, checklistId: string) { const supabase = createClient(); const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).eq("unidade_id", unidadeId).maybeSingle(); if (!checklist) return null; const { data: tarefas } = await supabase.from("tarefa_templates").select("*").eq("checklist_template_id", checklistId).order("ordem"); return { checklist: checklist as ChecklistTemplate, tarefas: (tarefas ?? []) as TarefaTemplate[] }; }
async function campos(unidadeId: string, empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const setor_id = String(formData.get("setor_id") ?? "").trim();
  const responsavel_id = String(formData.get("responsavel_id") ?? "").trim();
  const recorrencia = String(formData.get("recorrencia") ?? "") as Recorrencia;
  const horario = String(formData.get("horario") ?? "").trim();
  const limite_minutos = Number(formData.get("limite_minutos"));
  if (!nome || !setor_id || !responsavel_id || !horario || !recorrencias.includes(recorrencia)) {
    return { ok: false as const, erro: "Preencha nome, setor, responsável, frequência e horário." };
  }
  if (!Number.isInteger(limite_minutos) || limite_minutos < 1 || limite_minutos > 1440) {
    return { ok: false as const, erro: "Informe um tempo limite entre 1 e 1440 minutos." };
  }

  const supabase = createClient();
  const [resultadoSetor, resultadoResponsavel] = await Promise.all([
    supabase
      .from("setores")
      .select("id")
      .eq("id", setor_id)
      .eq("unidade_id", unidadeId)
      .maybeSingle(),
    supabase
      .from("usuarios")
      .select("id, perfil, unidade_id")
      .eq("id", responsavel_id)
      .eq("empresa_id", empresaId)
      .maybeSingle(),
  ]);
  if (resultadoSetor.error || resultadoResponsavel.error) {
    return { ok: false as const, erro: "Não foi possível validar setor e responsável. Tente novamente." };
  }
  if (!resultadoSetor.data) {
    return { ok: false as const, erro: "Setor inválido para esta unidade." };
  }
  if (
    !resultadoResponsavel.data ||
    (resultadoResponsavel.data.perfil !== "administrador" &&
      resultadoResponsavel.data.unidade_id !== unidadeId)
  ) {
    return { ok: false as const, erro: "Selecione um responsável vinculado a esta unidade." };
  }

  return {
    ok: true as const,
    valores: {
      nome,
      setor_id,
      responsavel_id,
      recorrencia,
      horario,
      limite_minutos,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
    },
  };
}
export async function criarChecklist(unidadeId: string, formData: FormData) { const contexto = await unidadeDoUsuario(unidadeId); if (!contexto?.usuario.empresa_id) redirect(`${listaPath(unidadeId)}/novo?erro=Sem%20permiss%C3%A3o`); const validacao = await campos(unidadeId, contexto.usuario.empresa_id, formData); if (!validacao.ok) redirect(`${listaPath(unidadeId)}/novo?erro=${encodeURIComponent(validacao.erro)}`); const { data } = await createClient().from("checklist_templates").insert({ unidade_id: unidadeId, ...validacao.valores }).select("id").single(); if (!data) redirect(`${listaPath(unidadeId)}/novo?erro=Não%20foi%20possível%20criar`); revalidatePath(listaPath(unidadeId)); redirect(`${itemPath(unidadeId, data.id)}?novaTarefa=1&sucesso=1`); }
export async function atualizarChecklist(unidadeId: string, checklistId: string, formData: FormData) { const contexto = await unidadeDoUsuario(unidadeId); if (!contexto?.usuario.empresa_id) redirect(itemPath(unidadeId, checklistId)); const validacao = await campos(unidadeId, contexto.usuario.empresa_id, formData); if (!validacao.ok) redirect(`${itemPath(unidadeId, checklistId)}?erro=${encodeURIComponent(validacao.erro)}`); const { data, error } = await createClient().from("checklist_templates").update(validacao.valores).eq("id", checklistId).eq("unidade_id", unidadeId).select("id").maybeSingle(); if (error || !data) { if (error) console.error("Falha ao atualizar checklist:", error.message); redirect(`${itemPath(unidadeId, checklistId)}?erro=${encodeURIComponent("Não foi possível salvar o checklist.")}`); } revalidatePath(itemPath(unidadeId, checklistId)); revalidatePath(listaPath(unidadeId)); revalidatePath("/hoje"); redirect(`${listaPath(unidadeId)}?sucesso=1`); }
export async function alternarStatusChecklist(unidadeId: string, checklistId: string, ativo: boolean, _formData: FormData) { const contexto = await unidadeDoUsuario(unidadeId); if (!contexto) return; await createClient().from("checklist_templates").update({ ativo }).eq("id", checklistId).eq("unidade_id", unidadeId); revalidatePath(listaPath(unidadeId)); revalidatePath(itemPath(unidadeId, checklistId)); }
export async function excluirChecklist(unidadeId: string, checklistId: string, formData: FormData) {
  function falha(mensagem: string): never {
    redirect(`${listaPath(unidadeId)}?erro=${encodeURIComponent(mensagem)}`);
  }
  const contexto = await unidadeDoUsuario(unidadeId);
  if (!contexto) falha("Você não tem permissão para excluir este checklist.");
  if (formData.get("confirmar") !== "excluir") {
    falha("Confirme a exclusão do checklist antes de continuar.");
  }

  const { data, error } = await createClient()
    .from("checklist_templates")
    .delete()
    .eq("id", checklistId)
    .eq("unidade_id", unidadeId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Falha ao excluir checklist:", error?.message ?? "Nenhum checklist removido.");
    falha("Não foi possível excluir o checklist. Verifique sua permissão e tente novamente.");
  }

  revalidatePath(listaPath(unidadeId));
  revalidatePath(itemPath(unidadeId, checklistId));
  revalidatePath("/hoje");
  redirect(`${listaPath(unidadeId)}?excluido=1`);
}
export async function duplicarChecklist(unidadeId: string, checklistId: string, _formData: FormData) {
  const origem = itemPath(unidadeId, checklistId);
  function falha(mensagem: string): never {
    redirect(`${origem}?erroDuplicacao=${encodeURIComponent(mensagem)}`);
  }
  const contexto = await unidadeDoUsuario(unidadeId);
  if (!contexto) falha("Você não tem permissão para duplicar este checklist.");

  const supabase = createClient();
  const { data: original, error: erroOriginal } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", checklistId)
    .eq("unidade_id", unidadeId)
    .maybeSingle();
  if (erroOriginal || !original) {
    if (erroOriginal) console.error("Falha ao buscar checklist para duplicação:", erroOriginal.message);
    falha("Não foi possível encontrar o checklist para duplicar.");
  }

  const { data: tarefas, error: erroLeitura } = await supabase
    .from("tarefa_templates")
    .select("*")
    .eq("checklist_template_id", checklistId)
    .order("ordem");
  if (erroLeitura) {
    console.error("Falha ao buscar tarefas para duplicação:", erroLeitura.message);
    falha("Não foi possível carregar as tarefas. Nenhuma cópia foi criada.");
  }

  const { data: copia, error: erroCopia } = await supabase
    .from("checklist_templates")
    .insert({
      unidade_id: unidadeId,
      setor_id: original.setor_id,
      responsavel_id: original.responsavel_id,
      nome: `${original.nome} - Cópia`,
      descricao: original.descricao,
      recorrencia: original.recorrencia,
      horario: original.horario,
      limite_minutos: original.limite_minutos ?? 90,
      ativo: true,
    })
    .select("id")
    .single();
  if (erroCopia || !copia) {
    if (erroCopia) console.error("Falha ao duplicar checklist:", erroCopia.message);
    falha("Não foi possível criar a cópia do checklist. Tente novamente.");
  }

  if (tarefas?.length) {
    const { error: erroTarefas } = await supabase
      .from("tarefa_templates")
      .insert(tarefas.map((t: TarefaTemplate) => ({
        checklist_template_id: copia.id,
        titulo: t.titulo,
        tipo: t.tipo,
        obrigatoria: t.obrigatoria,
        ordem: t.ordem,
      })));
    if (erroTarefas) {
      console.error("Falha ao duplicar tarefas:", erroTarefas.message);
      const { data: removida, error: erroRemocao } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", copia.id)
        .eq("unidade_id", unidadeId)
        .select("id")
        .maybeSingle();
      if (erroRemocao || !removida) {
        console.error("Falha ao remover cópia incompleta:", erroRemocao?.message ?? "Nenhum checklist removido.");
        revalidatePath(listaPath(unidadeId));
        redirect(`${itemPath(unidadeId, copia.id)}?erroDuplicacao=${encodeURIComponent("A cópia foi criada, mas as tarefas não foram copiadas. Revise este checklist antes de usá-lo.")}`);
      }
      falha("Não foi possível copiar as tarefas. A cópia incompleta foi removida.");
    }
  }

  revalidatePath(listaPath(unidadeId));
  revalidatePath("/hoje");
  redirect(`${itemPath(unidadeId, copia.id)}?duplicado=1`);
}