"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { podeGerenciarUnidade } from "@/lib/unidades/guard";
import { execucaoComContexto } from "@/lib/execucoes/guard";
import { tarefaNaoFeita, tarefaResolvida } from "@/lib/execucoes/tarefas";
import {
  dataOperacional,
  janelaChecklist,
  type AgendaOperacional,
} from "@/lib/execucoes/schedule";
import type { ChecklistTemplate, Execucao, TarefaExecucao, TarefaTemplate, TipoTarefa, Usuario } from "@/types/database";

function caminho(checklistId: string) {
  return `/hoje/${checklistId}`;
}

export interface ChecklistDoDia {
  checklist: ChecklistTemplate;
  setorNome: string;
  totalTarefas: number;
  execucao: Execucao | null;
  executorNome: string | null;
  concluidas: number;
  naoFeitas: number;
}

export async function listarChecklistsDoDia(): Promise<ChecklistDoDia[]> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) return [];
  const agenda = await buscarAgendaEmpresa(usuario.empresa_id);
  const supabase = createClient();
  const { data: checklists } = await supabase.from("checklist_templates").select("*");
  const lista = (checklists ?? []) as ChecklistTemplate[];
  if (!lista.length) return [];
  const ids = lista.map((item) => item.id);
  const agora = new Date();
  const dataPorChecklist = new Map(
    lista.map((checklist) => [
      checklist.id,
      dataOperacional(agora, agenda, checklist.horario, checklist.limite_minutos ?? 90),
    ]),
  );
  const datas = [...new Set(dataPorChecklist.values())];
  const [{ data: tarefas }, { data: execucoes }, { data: setores }] = await Promise.all([
    supabase.from("tarefa_templates").select("id, checklist_template_id").in("checklist_template_id", ids),
    supabase.from("execucoes").select("*").in("checklist_template_id", ids).in("data", datas),
    supabase.from("setores").select("id, nome"),
  ]);
  const totalPorChecklist = new Map<string, number>();
  (tarefas ?? []).forEach((tarefa) => totalPorChecklist.set(tarefa.checklist_template_id, (totalPorChecklist.get(tarefa.checklist_template_id) ?? 0) + 1));
  const execucaoPorChecklistData = new Map<string, Execucao>();
  (execucoes ?? []).forEach((execucao) => {
    execucaoPorChecklistData.set(
      `${execucao.checklist_template_id}:${execucao.data}`,
      execucao as Execucao,
    );
  });
  const usuarioIds = [...new Set((execucoes ?? []).flatMap((execucao) => execucao.usuario_id ? [execucao.usuario_id] : []))];
  const { data: usuarios, error: usuariosError } = usuarioIds.length
    ? await supabase.from("usuarios").select("id, nome").in("id", usuarioIds)
    : { data: [], error: null };
  if (usuariosError) {
    console.error("Falha ao carregar responsáveis pelas execuções:", usuariosError.message);
    throw new Error("Não foi possível carregar quem está executando os checklists.");
  }
  const nomePorUsuarioId = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario.nome]));
  const setorPorId = new Map((setores ?? []).map((setor) => [setor.id, setor.nome]));
  const concluidasPorExecucao = new Map<string, number>();
  const naoFeitasPorExecucao = new Map<string, number>();
  const execucaoIds = (execucoes ?? []).map((execucao) => execucao.id);
  if (execucaoIds.length) {
    const { data: respostas, error: respostasError } = await supabase.from("tarefa_execucoes").select("execucao_id, concluida, observacao").in("execucao_id", execucaoIds);
    if (respostasError) {
      console.error("Falha ao carregar o progresso das execuções:", respostasError.message);
      throw new Error("Não foi possível carregar o progresso dos checklists.");
    }
    (respostas ?? []).forEach((resposta) => {
      if (resposta.concluida) {
        concluidasPorExecucao.set(resposta.execucao_id, (concluidasPorExecucao.get(resposta.execucao_id) ?? 0) + 1);
      } else if (tarefaNaoFeita(resposta)) {
        naoFeitasPorExecucao.set(resposta.execucao_id, (naoFeitasPorExecucao.get(resposta.execucao_id) ?? 0) + 1);
      }
    });
  }
  const resultado = lista
    .filter((checklist) => (totalPorChecklist.get(checklist.id) ?? 0) > 0)
    .map((checklist) => {
      const dataChecklist = dataPorChecklist.get(checklist.id);
      const execucao = dataChecklist
        ? execucaoPorChecklistData.get(`${checklist.id}:${dataChecklist}`) ?? null
        : null;
      return { checklist, setorNome: setorPorId.get(checklist.setor_id) ?? "", totalTarefas: totalPorChecklist.get(checklist.id) ?? 0, execucao, executorNome: execucao?.usuario_id ? nomePorUsuarioId.get(execucao.usuario_id) ?? null : null, concluidas: execucao ? concluidasPorExecucao.get(execucao.id) ?? 0 : 0, naoFeitas: execucao ? naoFeitasPorExecucao.get(execucao.id) ?? 0 : 0 };
    });
  const peso = (item: ChecklistDoDia) => (item.execucao?.status === "concluido" ? 2 : item.execucao ? 1 : 0);
  return resultado.sort((a, b) => peso(a) - peso(b));
}

export async function iniciarOuContinuarExecucao(checklistId: string, _formData: FormData) {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) redirect("/login");
  const supabase = createClient();
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).maybeSingle();
  if (!checklist) redirect("/hoje");
  const agenda = await buscarAgendaEmpresa(usuario.empresa_id);
  const data = dataOperacional(new Date(), agenda, checklist.horario, checklist.limite_minutos ?? 90);
  if (!checklist.ativo) redirect("/hoje");
  const janela = janelaChecklist(data, checklist.horario, checklist.limite_minutos ?? 90, agenda);
  const agora = new Date();
  if (!janela || agora < janela.inicio) {
    redirect(`/hoje?erro=${encodeURIComponent(`Este checklist só pode ser iniciado após ${checklist.horario?.slice(0, 5) ?? "o horário configurado"}.`)}`);
  }
  if (agora > janela.prazoFinal) {
    redirect(`/hoje?erro=${encodeURIComponent("O prazo para iniciar este checklist já terminou.")}`);
  }
  const { data: existente } = await supabase
    .from("execucoes")
    .select("id, usuario_id, status")
    .eq("checklist_template_id", checklistId)
    .eq("data", data)
    .maybeSingle();
  if (existente) {
    if (existente.usuario_id === usuario.id) redirect(caminho(checklistId));
    if (existente.usuario_id || existente.status !== "nao_iniciado") redirect("/hoje");

    const { data: assumida, error: erroAoAssumir } = await supabase
      .from("execucoes")
      .update({
        usuario_id: usuario.id,
        inicio: new Date().toISOString(),
        status: "em_andamento",
      })
      .eq("id", existente.id)
      .is("usuario_id", null)
      .eq("status", "nao_iniciado")
      .select("id")
      .maybeSingle();

    if (erroAoAssumir) {
      console.error("Falha ao assumir execução liberada:", erroAoAssumir.message);
      redirect(`/hoje?erro=${encodeURIComponent("Não foi possível assumir o checklist. Tente novamente.")}`);
    }
    if (!assumida) redirect("/hoje");

    revalidatePath("/hoje");
    redirect(caminho(checklistId));
  }
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
  executorNome: string | null;
  tarefas: TarefaExecucao[];
  podeEditar: boolean;
  podeLiberar: boolean;
  podeIniciar: boolean;
  prazoFinal: string | null;
  prazoExpirado: boolean;
  agenda: AgendaOperacional;
}

export async function buscarExecucaoDoDia(checklistId: string): Promise<ExecucaoDoDia | null> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id) return null;
  const supabase = createClient();
  const { data: checklist } = await supabase.from("checklist_templates").select("*").eq("id", checklistId).maybeSingle();
  if (!checklist) return null;
  const { data: unidade } = await supabase.from("unidades").select("empresa_id, nome").eq("id", checklist.unidade_id).maybeSingle();
  if (!unidade || unidade.empresa_id !== usuario.empresa_id) return null;
  const { data: setor } = await supabase.from("setores").select("nome").eq("id", checklist.setor_id).maybeSingle();
  const agenda = await buscarAgendaEmpresa(usuario.empresa_id);
  const data = dataOperacional(new Date(), agenda, checklist.horario, checklist.limite_minutos ?? 90);
  const janela = janelaChecklist(data, checklist.horario, checklist.limite_minutos ?? 90, agenda);
  const agora = new Date();
  const prazoFinal = janela?.prazoFinal ?? null;
  const prazoExpirado = Boolean(prazoFinal && agora > prazoFinal);
  const { data: execucao } = await supabase.from("execucoes").select("*").eq("checklist_template_id", checklistId).eq("data", data).maybeSingle();
  const gestor = podeGerenciarUnidade(usuario, checklist.unidade_id);
  const iniciador =
    execucao?.usuario_id === usuario.id &&
    (usuario.perfil === "administrador" || usuario.unidade_id === checklist.unidade_id);
  if (execucao && !iniciador && !gestor) return null;
  let executorNome: string | null = null;
  if (execucao?.usuario_id) {
    const { data: executor, error: executorError } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("id", execucao.usuario_id)
      .maybeSingle();
    if (executorError) {
      console.error("Falha ao carregar responsável pela execução:", executorError.message);
      throw new Error("Não foi possível carregar quem está executando este checklist.");
    }
    executorNome = executor?.nome ?? null;
  }
  let tarefas: TarefaExecucao[] = [];
  if (execucao) {
    const { data } = await supabase.from("tarefa_execucoes").select("*").eq("execucao_id", execucao.id).order("ordem");
    tarefas = (data ?? []) as TarefaExecucao[];
  }
  return {
    usuario,
    checklist: checklist as ChecklistTemplate,
    unidadeNome: unidade.nome,
    setorNome: setor?.nome ?? "",
    execucao: execucao as Execucao | null,
    executorNome,
    tarefas,
    podeEditar: Boolean(execucao) && (iniciador || gestor) && execucao?.status !== "concluido" && execucao?.status !== "atrasado" && !prazoExpirado,
    podeLiberar: Boolean(execucao) && iniciador && execucao?.status === "em_andamento" && !prazoExpirado,
    podeIniciar: !execucao && checklist.ativo && janela !== null && agora >= janela.inicio && agora <= janela.prazoFinal,
    prazoFinal: prazoFinal?.toISOString() ?? null,
    prazoExpirado,
    agenda,
  };
}

async function contextoEditavel(execucaoId: string) {
  const contexto = await execucaoComContexto(execucaoId);
  if (!contexto?.podeEditar || !contexto.usuario.empresa_id) return null;

  const agenda = await buscarAgendaEmpresa(contexto.usuario.empresa_id);
  const janela = janelaChecklist(
    contexto.execucao.data,
    contexto.checklist.horario,
    contexto.checklist.limite_minutos ?? 90,
    agenda,
  );
  if (!janela || new Date() > janela.prazoFinal) {
    const { error } = await createClient()
      .from("execucoes")
      .update({ status: "atrasado" })
      .eq("id", execucaoId)
      .eq("status", "em_andamento");
    if (error) console.error("Falha ao marcar execução fora do prazo:", error.message);
    return null;
  }

  return contexto;
}

export async function liberarExecucao(checklistId: string, execucaoId: string, _formData: FormData) {
  const contexto = await contextoEditavel(execucaoId);
  if (
    !contexto ||
    contexto.checklist.id !== checklistId ||
    contexto.execucao.usuario_id !== contexto.usuario.id ||
    contexto.execucao.status !== "em_andamento"
  ) {
    redirect(caminho(checklistId));
  }

  const { data: liberada, error } = await createClient()
    .from("execucoes")
    .update({ usuario_id: null, inicio: null, status: "nao_iniciado" })
    .eq("id", execucaoId)
    .eq("usuario_id", contexto.usuario.id)
    .eq("status", "em_andamento")
    .select("id")
    .maybeSingle();

  if (error || !liberada) {
    if (error) console.error("Falha ao liberar execução:", error.message);
    redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível liberar o checklist. Tente novamente.")}`);
  }

  revalidatePath("/hoje");
  redirect("/hoje");
}

export async function alternarTarefaCheckbox(checklistId: string, execucaoId: string, tarefaId: string, concluida: boolean, _formData: FormData): Promise<boolean> {
  if (!await contextoEditavel(execucaoId)) redirect(caminho(checklistId));
  const { error } = await createClient().from("tarefa_execucoes").update({ concluida, concluida_em: concluida ? new Date().toISOString() : null, ...(concluida ? { observacao: null } : {}) }).eq("id", tarefaId).eq("execucao_id", execucaoId);
  if (error) redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível salvar a tarefa. Tente novamente.")}`);
  revalidatePath(caminho(checklistId));
  return true;
}

export async function registrarTarefaNaoFeita(checklistId: string, execucaoId: string, tarefaId: string, formData: FormData): Promise<{ sucesso: boolean; erro?: string }> {
  const contexto = await contextoEditavel(execucaoId);
  if (!contexto || contexto.checklist.id !== checklistId) {
    return { sucesso: false, erro: "Esta tarefa não pode ser alterada." };
  }
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (!observacao) return { sucesso: false, erro: "Informe por que a tarefa não foi feita." };
  const { data, error } = await createClient().from("tarefa_execucoes").update({
    observacao,
    concluida: false,
    concluida_em: null,
    resposta: null,
    evidencia: null,
  }).eq("id", tarefaId).eq("execucao_id", execucaoId).select("id").maybeSingle();
  if (error || !data) {
    return { sucesso: false, erro: "Não foi possível salvar a observação. Tente novamente." };
  }
  revalidatePath(caminho(checklistId));
  revalidatePath("/hoje");
  return { sucesso: true };
}

export async function reiniciarExecucao(checklistId: string, execucaoId: string): Promise<boolean> {
  const contexto = await contextoEditavel(execucaoId);
  if (!contexto || contexto.checklist.id !== checklistId) {
    redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Esta execução não pode ser reiniciada.")}`);
  }
  const { error } = await createClient().from("tarefa_execucoes").update({
    resposta: null,
    concluida: false,
    concluida_em: null,
    evidencia: null,
    observacao: null,
  }).eq("execucao_id", execucaoId);
  if (error) {
    redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível reiniciar o checklist. Tente novamente.")}`);
  }
  revalidatePath(caminho(checklistId));
  revalidatePath("/hoje");
  return true;
}

export async function responderTarefa(checklistId: string, execucaoId: string, tarefaId: string, formData: FormData): Promise<boolean> {
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
  const { error } = await createClient().from("tarefa_execucoes").update({ resposta, concluida: true, concluida_em: new Date().toISOString(), observacao: null }).eq("id", tarefaId).eq("execucao_id", execucaoId);
  if (error) redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível salvar a resposta. Tente novamente.")}`);
  revalidatePath(caminho(checklistId));
  return true;
}

export async function finalizarExecucao(checklistId: string, execucaoId: string, _formData: FormData) {
  const contexto = await contextoEditavel(execucaoId);
  if (!contexto || contexto.checklist.id !== checklistId) redirect(caminho(checklistId));
  const { data: tarefas, error: tarefasError } = await createClient().from("tarefa_execucoes").select("obrigatoria, concluida, observacao").eq("execucao_id", execucaoId);
  if (tarefasError || !tarefas) redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível verificar as tarefas. Tente novamente.")}`);
  if (tarefas.some((tarefa) => tarefa.obrigatoria && !tarefaResolvida(tarefa))) {
    redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Conclua as tarefas obrigatórias ou marque como não feitas com uma observação antes de finalizar.")}`);
  }
  const { data: finalizada, error } = await createClient().from("execucoes").update({ status: "concluido", fim: new Date().toISOString() }).eq("id", execucaoId).select("id").maybeSingle();
  if (error || !finalizada) redirect(`${caminho(checklistId)}?erro=${encodeURIComponent("Não foi possível finalizar o checklist. Tente novamente.")}`);
  revalidatePath(caminho(checklistId));
  revalidatePath("/hoje");
  redirect("/hoje");
}