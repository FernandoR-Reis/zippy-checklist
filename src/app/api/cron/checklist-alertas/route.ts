import { createAdminClient } from "@/lib/supabase/server";
import {
  dataOperacional,
  formatarHoraOperacional,
  janelaChecklist,
  type AgendaOperacional,
} from "@/lib/execucoes/schedule";
import { enviarPush, type PushSubscriptionSalva } from "@/lib/push/web-push";
import type { ChecklistTemplate, Execucao } from "@/types/database";

interface AlertaPendente {
  id: string;
  checklist_template_id: string;
  data: string;
  tipo: "nao_executado" | "atrasado";
  push_enviado: boolean;
}

function respostaErro(mensagem: string, status = 500) {
  return Response.json({ error: mensagem }, { status });
}

async function destinatarios(admin: NonNullable<ReturnType<typeof createAdminClient>>, unidadeId: string) {
  const { data: unidade, error: erroUnidade } = await admin
    .from("unidades")
    .select("empresa_id")
    .eq("id", unidadeId)
    .maybeSingle();
  if (erroUnidade || !unidade) {
    throw new Error(erroUnidade?.message ?? "Unidade do checklist não encontrada.");
  }

  const { data: usuarios, error } = await admin
    .from("usuarios")
    .select("id, perfil, unidade_id")
    .eq("empresa_id", unidade.empresa_id)
    .in("perfil", ["administrador", "gestor"]);
  if (error) throw new Error(error.message);

  return (usuarios ?? [])
    .filter((usuario) => usuario.perfil === "administrador" || usuario.unidade_id === unidadeId)
    .map((usuario) => usuario.id);
}

async function notificarAlerta(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  alerta: AlertaPendente,
  checklist: ChecklistTemplate,
  tarefasPendentes: number,
  agenda: AgendaOperacional,
) {
  if (alerta.push_enviado) return;

  const usuarioIds = await destinatarios(admin, checklist.unidade_id);
  if (!usuarioIds.length) {
    const { error } = await admin.from("checklist_alertas_enviados").update({ push_enviado: true }).eq("id", alerta.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: inscricoes, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("usuario_id", usuarioIds);
  if (error) throw new Error(error.message);

  let sucesso = true;
  const endpointsExpirados: string[] = [];
  const horario = checklist.horario?.slice(0, 5) ?? "";
  const prazoFinal = janelaChecklist(
    alerta.data,
    checklist.horario,
    checklist.limite_minutos ?? 90,
    agenda,
  )?.prazoFinal;
  const titulo = alerta.tipo === "nao_executado" ? "Checklist não executado" : "Checklist atrasado";
  const corpo = alerta.tipo === "nao_executado"
    ? `${checklist.nome}: não foi iniciado até o prazo das ${prazoFinal ? formatarHoraOperacional(prazoFinal, agenda.fuso_horario) : horario}.`
    : `${checklist.nome}: prazo encerrado com ${tarefasPendentes} tarefa(s) pendente(s).`;

  for (const inscricao of inscricoes ?? []) {
    try {
      await enviarPush(inscricao as PushSubscriptionSalva, { title: titulo, body: corpo, url: "/alertas" });
    } catch (error) {
      const codigo = typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : undefined;
      if (codigo === 404 || codigo === 410) {
        endpointsExpirados.push(inscricao.endpoint);
      } else {
        sucesso = false;
        console.error("Falha ao enviar push de checklist:", error);
      }
    }
  }

  if (endpointsExpirados.length) {
    const { error: erroRemocao } = await admin.from("push_subscriptions").delete().in("endpoint", endpointsExpirados);
    if (erroRemocao) {
      console.error("Falha ao remover inscrições push expiradas:", erroRemocao.message);
      sucesso = false;
    }
  }

  if (!sucesso) throw new Error("Uma ou mais notificações push não puderam ser enviadas.");

  const { error: erroMarcacao } = await admin
    .from("checklist_alertas_enviados")
    .update({ push_enviado: true })
    .eq("id", alerta.id);
  if (erroMarcacao) throw new Error(erroMarcacao.message);
}

export async function POST(request: Request) {
  const segredo = process.env.CHECKLIST_ALERTS_SECRET;
  if (!segredo) return respostaErro("CHECKLIST_ALERTS_SECRET não está configurado.", 503);
  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return respostaErro("Não autorizado.", 401);
  }

  const admin = createAdminClient();
  if (!admin) return respostaErro("SUPABASE_SERVICE_ROLE_KEY não está configurada.", 503);

  const agora = new Date();
  const { data: checklists, error: erroChecklists } = await admin
    .from("checklist_templates")
    .select("*")
    .eq("ativo", true);
  if (erroChecklists) {
    console.error("Falha ao carregar checklists para a rotina de alertas:", erroChecklists.message);
    return respostaErro("Não foi possível carregar os checklists.");
  }

  const lista = (checklists ?? []) as ChecklistTemplate[];
  if (!lista.length) return Response.json({ processados: 0 });

  const ids = lista.map((checklist) => checklist.id);
  const unidadeIds = [...new Set(lista.map((checklist) => checklist.unidade_id))];
  const { data: unidades, error: erroUnidades } = await admin
    .from("unidades")
    .select("id, empresa_id")
    .in("id", unidadeIds);
  if (erroUnidades) {
    console.error("Falha ao carregar empresas das unidades para os alertas:", erroUnidades.message);
    return respostaErro("Não foi possível carregar as configurações das empresas.");
  }
  const empresaIds = [...new Set((unidades ?? []).map((unidade) => unidade.empresa_id))];
  const { data: empresas, error: erroEmpresas } = await admin
    .from("empresas")
    .select("id, fuso_horario, inicio_operacao, fim_operacao")
    .in("id", empresaIds);
  if (erroEmpresas) {
    console.error("Falha ao carregar agendas das empresas para os alertas:", erroEmpresas.message);
    return respostaErro("Não foi possível carregar as configurações das empresas.");
  }
  const unidadePorId = new Map((unidades ?? []).map((unidade) => [unidade.id, unidade.empresa_id]));
  const agendaPorEmpresa = new Map(
    (empresas ?? []).map((empresa) => [
      empresa.id,
      {
        fuso_horario: empresa.fuso_horario,
        inicio_operacao: empresa.inicio_operacao,
        fim_operacao: empresa.fim_operacao,
      } satisfies AgendaOperacional,
    ]),
  );
  const agendaPorChecklist = new Map<string, AgendaOperacional>();
  const dataPorChecklist = new Map<string, string>();
  for (const checklist of lista) {
    const empresaId = unidadePorId.get(checklist.unidade_id);
    const agenda = empresaId ? agendaPorEmpresa.get(empresaId) : undefined;
    if (!agenda) {
      console.error("Agenda não encontrada para o checklist:", checklist.id);
      return respostaErro("Não foi possível carregar as configurações das empresas.");
    }
    agendaPorChecklist.set(checklist.id, agenda);
    dataPorChecklist.set(
      checklist.id,
      dataOperacional(agora, agenda, checklist.horario, checklist.limite_minutos ?? 90),
    );
  }
  const datas = [...new Set(dataPorChecklist.values())];
  const [{ data: modelos, error: erroModelos }, { data: execucoes, error: erroExecucoes }] = await Promise.all([
    admin.from("tarefa_templates").select("checklist_template_id").in("checklist_template_id", ids),
    admin.from("execucoes").select("*").in("checklist_template_id", ids).in("data", datas),
  ]);
  if (erroModelos || erroExecucoes) {
    console.error("Falha ao carregar progresso para a rotina de alertas:", erroModelos?.message ?? erroExecucoes?.message);
    return respostaErro("Não foi possível carregar o progresso dos checklists.");
  }

  const comTarefas = new Set((modelos ?? []).map((tarefa) => tarefa.checklist_template_id));
  const execucaoPorChecklistData = new Map(
    (execucoes ?? []).map((execucao) => [
      `${execucao.checklist_template_id}:${execucao.data}`,
      execucao as Execucao,
    ]),
  );
  const execucaoIds = (execucoes ?? []).map((execucao) => execucao.id);
  const { data: tarefasExecucao, error: erroTarefas } = execucaoIds.length
    ? await admin.from("tarefa_execucoes").select("execucao_id, concluida").in("execucao_id", execucaoIds)
    : { data: [], error: null };
  if (erroTarefas) {
    console.error("Falha ao carregar tarefas da rotina de alertas:", erroTarefas.message);
    return respostaErro("Não foi possível carregar as tarefas dos checklists.");
  }

  const pendentesPorExecucao = new Map<string, number>();
  (tarefasExecucao ?? []).forEach((tarefa) => {
    if (!tarefa.concluida) {
      pendentesPorExecucao.set(tarefa.execucao_id, (pendentesPorExecucao.get(tarefa.execucao_id) ?? 0) + 1);
    }
  });
  let processados = 0;

  for (const checklist of lista) {
    if (!comTarefas.has(checklist.id)) continue;
    const data = dataPorChecklist.get(checklist.id);
    const agenda = agendaPorChecklist.get(checklist.id);
    if (!data || !agenda) continue;
    const janela = janelaChecklist(data, checklist.horario, checklist.limite_minutos ?? 90, agenda);
    if (!janela || agora <= janela.prazoFinal) continue;

    let execucao = execucaoPorChecklistData.get(`${checklist.id}:${data}`) ?? null;
    if (execucao?.status === "concluido") continue;

    if (execucao && execucao.status !== "atrasado") {
      const { data: atualizada, error } = await admin
        .from("execucoes")
        .update({ status: "atrasado" })
        .eq("id", execucao.id)
        .neq("status", "concluido")
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("Falha ao marcar checklist atrasado:", error.message);
        return respostaErro("Não foi possível marcar uma execução atrasada.");
      }
      if (atualizada) execucao = atualizada as Execucao;
    }

    const tipo = execucao?.usuario_id ? "atrasado" : "nao_executado";
    let { data: alerta, error: erroAlerta } = await admin
      .from("checklist_alertas_enviados")
      .select("id, checklist_template_id, data, tipo, push_enviado")
      .eq("checklist_template_id", checklist.id)
      .eq("data", data)
      .eq("tipo", tipo)
      .maybeSingle();
    if (erroAlerta) {
      console.error("Falha ao consultar alerta de checklist:", erroAlerta.message);
      return respostaErro("Não foi possível consultar os alertas de checklist.");
    }

    if (!alerta) {
      const insercao = await admin
        .from("checklist_alertas_enviados")
        .insert({ checklist_template_id: checklist.id, data, tipo })
        .select("id, checklist_template_id, data, tipo, push_enviado")
        .maybeSingle();
      alerta = insercao.data;
      erroAlerta = insercao.error;
      if (erroAlerta?.code === "23505") {
        const consulta = await admin
          .from("checklist_alertas_enviados")
          .select("id, checklist_template_id, data, tipo, push_enviado")
          .eq("checklist_template_id", checklist.id)
          .eq("data", data)
          .eq("tipo", tipo)
          .maybeSingle();
        alerta = consulta.data;
        erroAlerta = consulta.error;
      }
      if (erroAlerta || !alerta) {
        console.error("Falha ao registrar alerta de checklist:", erroAlerta?.message ?? "Nenhum alerta retornado.");
        return respostaErro("Não foi possível registrar um alerta de checklist.");
      }
    }

    try {
      await notificarAlerta(
        admin,
        alerta as AlertaPendente,
        checklist,
        execucao ? pendentesPorExecucao.get(execucao.id) ?? 0 : 0,
        agenda,
      );
    } catch (error) {
      console.error("Falha ao processar notificação de checklist:", error);
      return respostaErro("Uma notificação de checklist não pôde ser enviada.");
    }
    processados += 1;
  }

  return Response.json({ data: dataOperacional(agora), datas, processados });
}
