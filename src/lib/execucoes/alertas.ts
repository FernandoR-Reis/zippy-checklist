import { createClient } from "@/lib/supabase/server";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import {
  dataOperacional,
  horarioNoDiaSeguinte,
  janelaChecklist,
} from "@/lib/execucoes/schedule";
import type { ChecklistTemplate, Execucao, PerfilUsuario, TarefaExecucao } from "@/types/database";

export type EstadoAlerta =
  | "agendado"
  | "nao_iniciado"
  | "em_andamento"
  | "nao_executado"
  | "atrasado"
  | "concluido";

export interface ItemAlertaChecklist {
  checklistId: string;
  nome: string;
  unidadeId: string;
  unidadeNome: string;
  setorNome: string;
  horario: string;
  horarioNoDiaSeguinte: boolean;
  prazoFinal: string;
  fusoHorario: string;
  limiteMinutos: number;
  estado: EstadoAlerta;
  executorNome: string | null;
  concluidas: number;
  total: number;
  tarefasPendentes: string[];
}

export interface AlertaHistorico {
  id: string;
  data: string;
  tipo: "nao_executado" | "atrasado";
  checklistNome: string;
  unidadeNome: string;
  setorNome: string;
}

export async function listarHistoricoAlertasGestor(): Promise<AlertaHistorico[]> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id || !["administrador", "gestor"].includes(usuario.perfil as PerfilUsuario)) {
    return [];
  }

  const agenda = await buscarAgendaEmpresa(usuario.empresa_id);
  const data = dataOperacional(new Date(), agenda);
  const desde = new Date(`${data}T12:00:00.000Z`);
  desde.setUTCDate(desde.getUTCDate() - 30);
  const supabase = createClient();
  const { data: alertas, error } = await supabase
    .from("checklist_alertas_enviados")
    .select("id, checklist_template_id, data, tipo")
    .gte("data", desde.toISOString().slice(0, 10))
    .lt("data", data)
    .order("data", { ascending: false });
  if (error) {
    console.error("Falha ao carregar histórico de alertas:", error.message);
    throw new Error("Não foi possível carregar o histórico de alertas.");
  }
  if (!alertas?.length) return [];

  const ids = [...new Set(alertas.map((alerta) => alerta.checklist_template_id))];
  const { data: checklists, error: erroChecklists } = await supabase
    .from("checklist_templates")
    .select("id, nome, unidade_id, setor_id")
    .in("id", ids);
  if (erroChecklists) {
    console.error("Falha ao carregar checklists do histórico:", erroChecklists.message);
    throw new Error("Não foi possível carregar o histórico de alertas.");
  }

  const lista = checklists ?? [];
  const unidadeIds = [...new Set(lista.map((checklist) => checklist.unidade_id))];
  const setorIds = [...new Set(lista.map((checklist) => checklist.setor_id))];
  const [{ data: unidades, error: erroUnidades }, { data: setores, error: erroSetores }] = await Promise.all([
    unidadeIds.length
      ? supabase.from("unidades").select("id, nome").in("id", unidadeIds)
      : Promise.resolve({ data: [], error: null }),
    setorIds.length
      ? supabase.from("setores").select("id, nome").in("id", setorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (erroUnidades || erroSetores) {
    console.error("Falha ao carregar unidades/setores do histórico:", erroUnidades?.message ?? erroSetores?.message);
    throw new Error("Não foi possível carregar o histórico de alertas.");
  }

  const checklistPorId = new Map(lista.map((checklist) => [checklist.id, checklist]));
  const unidadePorId = new Map((unidades ?? []).map((unidade) => [unidade.id, unidade.nome]));
  const setorPorId = new Map((setores ?? []).map((setor) => [setor.id, setor.nome]));
  return alertas.flatMap((alerta) => {
    const checklist = checklistPorId.get(alerta.checklist_template_id);
    if (!checklist || (usuario.perfil === "gestor" && usuario.unidade_id !== checklist.unidade_id)) return [];
    return [{
      id: alerta.id,
      data: alerta.data,
      tipo: alerta.tipo as AlertaHistorico["tipo"],
      checklistNome: checklist.nome,
      unidadeNome: unidadePorId.get(checklist.unidade_id) ?? "",
      setorNome: setorPorId.get(checklist.setor_id) ?? "",
    }];
  });
}

export async function listarAlertasGestor(): Promise<ItemAlertaChecklist[]> {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario || !["administrador", "gestor"].includes(usuario.perfil as PerfilUsuario)) {
    return [];
  }
  if (!usuario.empresa_id) return [];

  const supabase = createClient();
  const agenda = await buscarAgendaEmpresa(usuario.empresa_id);
  const agora = new Date();
  const { data: checklists, error: erroChecklists } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("ativo", true)
    .order("nome");
  if (erroChecklists) {
    console.error("Falha ao carregar checklists para os alertas:", erroChecklists.message);
    throw new Error("Não foi possível carregar o relatório de checklists.");
  }

  const lista = (checklists ?? []) as ChecklistTemplate[];
  if (!lista.length) return [];
  const ids = lista.map((checklist) => checklist.id);
  const dataPorChecklist = new Map(
    lista.map((checklist) => [
      checklist.id,
      dataOperacional(agora, agenda, checklist.horario, checklist.limite_minutos ?? 90),
    ]),
  );
  const datas = [...new Set(dataPorChecklist.values())];
  const unidadeIds = [...new Set(lista.map((checklist) => checklist.unidade_id))];
  const [
    { data: execucoes, error: erroExecucoes },
    { data: setores, error: erroSetores },
    { data: unidades, error: erroUnidades },
    { data: tarefasModelo, error: erroTarefasModelo },
  ] = await Promise.all([
    supabase.from("execucoes").select("*").in("checklist_template_id", ids).in("data", datas),
    supabase.from("setores").select("id, nome"),
    supabase.from("unidades").select("id, nome").in("id", unidadeIds),
    supabase.from("tarefa_templates").select("checklist_template_id, titulo").in("checklist_template_id", ids),
  ]);
  if (erroExecucoes || erroSetores || erroUnidades || erroTarefasModelo) {
    console.error("Falha ao carregar dados do relatório:", erroExecucoes?.message ?? erroSetores?.message ?? erroUnidades?.message ?? erroTarefasModelo?.message);
    throw new Error("Não foi possível carregar o relatório de checklists.");
  }

  const totalModeloPorChecklist = new Map<string, number>();
  const titulosModeloPorChecklist = new Map<string, string[]>();
  (tarefasModelo ?? []).forEach((tarefa) => {
    totalModeloPorChecklist.set(
      tarefa.checklist_template_id,
      (totalModeloPorChecklist.get(tarefa.checklist_template_id) ?? 0) + 1,
    );
    const titulos = titulosModeloPorChecklist.get(tarefa.checklist_template_id) ?? [];
    titulos.push(tarefa.titulo);
    titulosModeloPorChecklist.set(tarefa.checklist_template_id, titulos);
  });
  const execucaoPorChecklistData = new Map(
    (execucoes ?? []).map((execucao) => [
      `${execucao.checklist_template_id}:${execucao.data}`,
      execucao as Execucao,
    ]),
  );
  const execucaoIds = (execucoes ?? []).map((execucao) => execucao.id);
  const [{ data: tarefas, error: erroTarefas }, { data: responsaveis, error: erroResponsaveis }] = await Promise.all([
    execucaoIds.length
      ? supabase.from("tarefa_execucoes").select("execucao_id, titulo, concluida").in("execucao_id", execucaoIds)
      : Promise.resolve({ data: [], error: null }),
    (() => {
      const responsavelIds = [...new Set((execucoes ?? []).flatMap((execucao) => execucao.usuario_id ? [execucao.usuario_id] : []))];
      return responsavelIds.length
        ? supabase.from("usuarios").select("id, nome").in("id", responsavelIds)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);
  if (erroTarefas || erroResponsaveis) {
    console.error("Falha ao carregar tarefas/responsáveis do relatório:", erroTarefas?.message ?? erroResponsaveis?.message);
    throw new Error("Não foi possível carregar o progresso dos checklists.");
  }

  const setorPorId = new Map((setores ?? []).map((setor) => [setor.id, setor.nome]));
  const unidadePorId = new Map((unidades ?? []).map((unidade) => [unidade.id, unidade.nome]));
  const responsavelPorId = new Map((responsaveis ?? []).map((responsavel) => [responsavel.id, responsavel.nome]));
  const tarefasPorExecucao = new Map<string, Pick<TarefaExecucao, "titulo" | "concluida">[]>();
  (tarefas ?? []).forEach((tarefa) => {
    const grupo = tarefasPorExecucao.get(tarefa.execucao_id) ?? [];
    grupo.push(tarefa);
    tarefasPorExecucao.set(tarefa.execucao_id, grupo);
  });

  const resultado = lista.flatMap((checklist) => {
    const totalModelo = totalModeloPorChecklist.get(checklist.id) ?? 0;
    if (totalModelo === 0) return [];
    const limiteMinutos = checklist.limite_minutos ?? 90;
    const data = dataPorChecklist.get(checklist.id);
    if (!data) return [];
    const janela = janelaChecklist(data, checklist.horario, limiteMinutos, agenda);
    if (!janela || !checklist.horario) return [];

    const execucao = execucaoPorChecklistData.get(`${checklist.id}:${data}`) ?? null;
    const tarefasDaExecucao = execucao ? tarefasPorExecucao.get(execucao.id) ?? [] : [];
    const tarefasPendentes = tarefasDaExecucao.length
      ? tarefasDaExecucao.filter((tarefa) => !tarefa.concluida).map((tarefa) => tarefa.titulo)
      : execucao ? titulosModeloPorChecklist.get(checklist.id) ?? [] : [];
    const concluidas = Math.max(0, tarefasDaExecucao.length - tarefasPendentes.length);
    let estado: EstadoAlerta;

    if (execucao?.status === "concluido") {
      estado = "concluido";
    } else if (execucao?.status === "atrasado" || agora > janela.prazoFinal) {
      estado = execucao?.usuario_id ? "atrasado" : "nao_executado";
    } else if (execucao?.usuario_id) {
      estado = "em_andamento";
    } else if (agora < janela.inicio) {
      estado = "agendado";
    } else {
      estado = "nao_iniciado";
    }

    if (usuario.perfil === "gestor" && usuario.unidade_id !== checklist.unidade_id) return [];

    return [{
      checklistId: checklist.id,
      nome: checklist.nome,
      unidadeId: checklist.unidade_id,
      unidadeNome: unidadePorId.get(checklist.unidade_id) ?? "",
      setorNome: setorPorId.get(checklist.setor_id) ?? "",
      horario: checklist.horario.slice(0, 5),
      horarioNoDiaSeguinte: horarioNoDiaSeguinte(checklist.horario, agenda),
      prazoFinal: janela.prazoFinal.toISOString(),
      fusoHorario: agenda.fuso_horario,
      limiteMinutos,
      estado,
      executorNome: execucao?.usuario_id ? responsavelPorId.get(execucao.usuario_id) ?? null : null,
      concluidas,
      total: tarefasDaExecucao.length || totalModelo,
      tarefasPendentes,
    }];
  });

  const prioridade: Record<EstadoAlerta, number> = {
    atrasado: 0,
    nao_executado: 1,
    em_andamento: 2,
    nao_iniciado: 3,
    agendado: 4,
    concluido: 5,
  };
  return resultado.sort((a, b) => prioridade[a.estado] - prioridade[b.estado] || a.horario.localeCompare(b.horario));
}
