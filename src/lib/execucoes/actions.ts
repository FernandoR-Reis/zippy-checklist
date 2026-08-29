"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { execucaoComContexto } from "@/lib/execucoes/guard";
import type { ChecklistTemplate, Execucao, TarefaExecucao, TarefaTemplate, TipoTarefa, Usuario } from "@/types/database";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function caminho(checklistId: string) {
  return `/hoje/${checklistId}`;
}

export interface ChecklistDoDia {
  checklist: ChecklistTemplate;
  setorNome: string;
  totalTarefas: number;
  execucao: Execucao | null;
  concluidas: number;
}

export async function listarChecklistsDoDia(): Promise<ChecklistDoDia[]> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario) return [];
  const supabase = createClient();
  const { data: checklists } = await supabase.from("checklist_templates").select("*").eq("responsavel_id", usuario.id);
  const lista = (checklists ?? []) as ChecklistTemplate[];
  if (!lista.length) return [];
  const ids = lista.map((item) => item.id);
  const [{ data: tarefas }, { data: execucoes }, { data: setores }] = await Promise.all([
    supabase.from("tarefa_templates").select("id, checklist_template_id").in("checklist_template_id", ids),
    supabase.from("execucoes").select("*").in("checklist_template_id", ids).eq("data", hoje()),
    supabase.from("setores").select("id, nome"),
  ]);
  const totalPorChecklist = new Map<string, number>();
  (tarefas ?? []).forEach((tarefa) => totalPorChecklist.set(tarefa.checklist_template_id, (totalPorChecklist.get(tarefa.checklist_template_id) ?? 0) + 1));
  const execucaoPorChecklist = new Map<string, Execucao>();
  (execucoes ?? []).forEach((execucao) => execucaoPorChecklist.set(execucao.checklist_template_id, execucao as Execucao));
  const setorPorId = new Map((setores ?? []).map((setor) => [setor.id, setor.nome]));
  const concluidasPorExecucao = new Map<string, number>();
  const execucaoIds = (execucoes ?? []).map((execucao) => execucao.id);
  if (execucaoIds.length) {
    const { data: respostas } = await supabase.from("tarefa_execucoes").select("execucao_id, concluida").in("execucao_id", execucaoIds).eq("concluida", true);
    (respostas ?? []).forEach((resposta) => concluidasPorExecucao.set(resposta.execucao_id, (concluidasPorExecucao.get(resposta.execucao_id) ?? 0) + 1));
  }
  const resultado = lista
    .filter((checklist) => (totalPorChecklist.get(checklist.id) ?? 0) > 0)
    .filter((checklist) => checklist.ativo || execucaoPorChecklist.has(checklist.id))
    .map((checklist) => {
      const execucao = execucaoPorChecklist.get(checklist.id) ?? null;
      return { checklist, setorNome: setorPorId.get(checklist.setor_id) ?? "", totalTarefas: totalPorChecklist.get(checklist.id) ?? 0, execucao, concluidas: execucao ? concluidasPorExecucao.get(execucao.id) ?? 0 : 0 };
    });
  const peso = (item: ChecklistDoDia) => (item.execucao?.status === "concluido" ? 2 : item.execucao ? 1 : 0);
  return resultado.sort((a, b) => peso(a) - peso(b));
}

export async function iniciarOuContinuarExecucao(checklistId: string, _formData: FormData) {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = createClient();
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).eq("responsavel_id", usuario.id).maybeSingle();
  if (!checklist) redirect("/hoje");
  const data = hoje();
  const { data: existente } = await supabase.from("execucoes").select("id").eq("checklist_template_id", checklistId).eq("data", data).maybeSingle();
  if (existente) redirect(caminho(checklistId));
  if (!checklist.ativo) redirect("/hoje");
  const { data: tarefas } = await supabase.from("tarefa_templates").select("*").eq("checklist_template_id", checklistId).order("ordem");
  const lista = (tarefas ?? []) as TarefaTemplate[];
  if (!lista.length) redirect("/hoje");
  const { data: novaExecucao, error } = await supabase.from("execucoes").insert({ checklist_template_id: checklistId, usuario_id: usuario.id, data, inicio: new Date().toISOString(), status: "em_andamento" }).select("id").single();
  if (error || !novaExecucao) redirect(caminho(checklistId));
  const { error: tarefasError } = await supabase.from("tarefa_execucoes").insert(lista.map((tarefa) => ({ execucao_id: novaExecucao.id, tarefa_template_id: tarefa.id, titulo: tarefa.titulo, tipo: tarefa.tipo, obrigatoria: tarefa.obrigatoria, ordem: tarefa.ordem, concluida: false })));
  if (tarefasError) redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível preparar as tarefas.")}`);
  revalidatePath("/hoje");
  redirect(caminho(checklistId));
}

export interface ExecucaoDoDia {
  usuario: Usuario;
  checklist: ChecklistTemplate;
  unidadeNome: string;
  setorNome: string;
  execucao: Execucao | null;
  tarefas: TarefaExecucao[];
  podeEditar: boolean;
  podeIniciar: boolean;
}

export async function buscarExecucaoDoDia(checklistId: string): Promise<ExecucaoDoDia | null> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) return null;
  const supabase = createClient();
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).maybeSingle();
  if (!checklist) return null;
  const { data: unidade } = await supabase.from("unidades").select("empresa_id, nome").eq("id", checklist.unidade_id).maybeSingle();
  if (!unidade || unidade.empresa_id !== usuario.empresa_id) return null;
  const responsavel = checklist.responsavel_id === usuario.id;
  if (!responsavel && usuario.perfil !== "gestor") return null;
  const { data: setor } = await supabase.from("setores").select("nome").eq("id", checklist.setor_id).maybeSingle();
  const { data: execucao } = await supabase.from("execucoes").select("*").eq("checklist_template_id", checklistId).eq("data", hoje()).maybeSingle();
  let tarefas: TarefaExecucao[] = [];
  if (execucao) {
    const { data } = await supabase.from("tarefa_execucoes").select("*").eq("execucao_id", execucao.id).order("ordem");
    tarefas = (data ?? []) as TarefaExecucao[];
  }
  return { usuario, checklist: checklist as ChecklistTemplate, unidadeNome: unidade.nome, setorNome: setor?.nome ?? "", execucao: execucao as Execucao | null, tarefas, podeEditar: responsavel && (!execucao || execucao.status !== "concluido"), podeIniciar: responsavel && checklist.ativo };
}

async function contextoEditavel(execucaoId: string) {
  const contexto = await execucaoComContexto(execucaoId);
  return contexto?.podeEditar ? contexto : null;
}

export async function alternarTarefaCheckbox(checklistId: string, execucaoId: string, tarefaId: string, concluida: boolean, _formData: FormData) {
  if (!await contextoEditavel(execucaoId)) return;
  await createClient().from("tarefa_execucoes").update({ concluida, concluida_em: concluida ? new Date().toISOString() : null }).eq("id", tarefaId).eq("execucao_id", execucaoId);
  revalidatePath(caminho(checklistId));
}

export async function responderTarefa(checklistId: string, execucaoId: string, tarefaId: string, formData: FormData) {
  if (!await contextoEditavel(execucaoId)) redirect(caminho(checklistId));
  const tipo = String(formData.get("tipo") ?? "") as TipoTarefa;
  let resposta: string | number;
  if (tipo === "sim_nao") {
    const valor = String(formData.get("resposta") ?? "");
    if (valor !== "sim" && valor !== "nao") redirect(`${caminho(checklistId)}?erro=Selecione%20Sim%20ou%20Não.`);
    resposta = valor;
  } else if (tipo === "numero") {
    const bruto = String(formData.get("resposta") ?? "").trim().replace(",", ".");
    const numero = Number(bruto);
    if (!bruto || Number.isNaN(numero)) redirect(`${caminho(checklistId)}?erro=Informe%20um%20número%20válido.`);
    resposta = numero;
  } else if (tipo === "texto") {
    const valor = String(formData.get("resposta") ?? "").trim();
    if (!valor) redirect(`${caminho(checklistId)}?erro=Escreva%20uma%20observação.`);
    resposta = valor;
  } else {
    redirect(caminho(checklistId));
  }
  await createClient().from("tarefa_execucoes").update({ resposta, concluida: true, concluida_em: new Date().toISOString() }).eq("id", tarefaId).eq("execucao_id", execucaoId);
  revalidatePath(caminho(checklistId));
  redirect(caminho(checklistId));
}

export async function finalizarExecucao(checklistId: string, execucaoId: string, _formData: FormData) {
  const contexto = await contextoEditavel(execucaoId);
  if (!contexto) redirect(caminho(checklistId));
  const { data: tarefas } = await createClient().from("tarefa_execucoes").select("obrigatoria, concluida").eq("execucao_id", execucaoId);
  if ((tarefas ?? []).some((tarefa) => tarefa.obrigatoria && !tarefa.concluida)) redirect(caminho(checklistId));
  await createClient().from("execucoes").update({ status: "concluido", fim: new Date().toISOString() }).eq("id", execucaoId).eq("usuario_id", contexto.usuario.id);
  revalidatePath(caminho(checklistId));
  revalidatePath("/hoje");
  redirect(caminho(checklistId));
}