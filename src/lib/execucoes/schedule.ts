export interface AgendaOperacional {
  fuso_horario: string;
  inicio_operacao: string;
  fim_operacao: string;
}

export const AGENDA_OPERACIONAL_PADRAO: AgendaOperacional = {
  fuso_horario: "America/Sao_Paulo",
  inicio_operacao: "00:00",
  fim_operacao: "23:59",
};

const HORARIO_VALIDO = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function partesDataHora(valor: Date, fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(valor);

  return Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
}

function minutos(horario: string) {
  const valido = HORARIO_VALIDO.exec(horario);
  if (!valido) return null;
  return Number(valido[1]) * 60 + Number(horario.slice(3, 5));
}

function deslocarData(data: string, dias: number) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const valor = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, "0")}-${String(valor.getUTCDate()).padStart(2, "0")}`;
}

function operacaoAtravessaMeiaNoite(agenda: AgendaOperacional) {
  const inicio = minutos(agenda.inicio_operacao);
  const fim = minutos(agenda.fim_operacao);
  return inicio !== null && fim !== null && inicio > fim;
}

export function horarioNoDiaSeguinte(
  horario: string,
  agenda: AgendaOperacional = AGENDA_OPERACIONAL_PADRAO,
) {
  const hora = minutos(horario);
  const inicio = minutos(agenda.inicio_operacao);
  const fim = minutos(agenda.fim_operacao);
  return hora !== null && inicio !== null && fim !== null &&
    inicio > fim && hora < inicio && hora <= fim;
}

export function horarioDentroDaOperacao(
  horario: string,
  agenda: AgendaOperacional = AGENDA_OPERACIONAL_PADRAO,
) {
  const hora = minutos(horario);
  const inicio = minutos(agenda.inicio_operacao);
  const fim = minutos(agenda.fim_operacao);
  if (hora === null || inicio === null || fim === null || inicio === fim) return false;
  return inicio < fim
    ? hora >= inicio && hora <= fim
    : hora >= inicio || hora <= fim;
}

export function analisarPrazoOperacional(
  horario: string,
  limiteMinutos: number,
  agenda: AgendaOperacional = AGENDA_OPERACIONAL_PADRAO,
) {
  const inicioAgenda = minutos(agenda.inicio_operacao);
  const fimAgenda = minutos(agenda.fim_operacao);
  const inicioChecklist = minutos(horario);
  if (
    inicioAgenda === null ||
    fimAgenda === null ||
    inicioChecklist === null ||
    !Number.isInteger(limiteMinutos) ||
    limiteMinutos <= 0 ||
    inicioAgenda === fimAgenda
  ) {
    return null;
  }

  const duracaoOperacao = (fimAgenda - inicioAgenda + 1440) % 1440;
  const inicioRelativo = (inicioChecklist - inicioAgenda + 1440) % 1440;
  const foraDaOperacao = !horarioDentroDaOperacao(horario, agenda);
  const terminaDepoisDoFim = inicioRelativo + limiteMinutos > duracaoOperacao;
  const terminoRelativo = inicioRelativo + limiteMinutos;
  const minutoDoDia = (inicioAgenda + terminoRelativo) % 1440;
  const diaSeguinte = Math.floor((inicioAgenda + terminoRelativo) / 1440);

  return {
    foraDaOperacao,
    terminaDepoisDoFim,
    horarioTermino: `${String(Math.floor(minutoDoDia / 60)).padStart(2, "0")}:${String(minutoDoDia % 60).padStart(2, "0")}`,
    terminoNoDiaSeguinte: diaSeguinte > 0,
  };
}

export function dataOperacional(
  agora = new Date(),
  agenda: AgendaOperacional = AGENDA_OPERACIONAL_PADRAO,
  horarioChecklist?: string | null,
  limiteMinutos?: number,
) {
  const partes = partesDataHora(agora, agenda.fuso_horario);
  const data = `${partes.year}-${partes.month}-${partes.day}`;
  if (!operacaoAtravessaMeiaNoite(agenda)) return data;

  const horarioLocal = `${partes.hour}:${partes.minute}`;
  const dataAnterior = deslocarData(data, -1);
  if (horarioChecklist && horarioNoDiaSeguinte(horarioChecklist, agenda)) {
    if (horarioLocal < agenda.inicio_operacao.slice(0, 5)) return dataAnterior;

    const janelaAnterior = limiteMinutos
      ? janelaChecklist(dataAnterior, horarioChecklist, limiteMinutos, agenda)
      : null;
    // Keep an overnight checklist on its original operation while its full deadline is open.
    return janelaAnterior && agora <= janelaAnterior.prazoFinal
      ? dataAnterior
      : data;
  }

  return !horarioChecklist && horarioLocal <= agenda.fim_operacao.slice(0, 5)
    ? dataAnterior
    : data;
}

function instanteNoFuso(data: string, horario: string, fusoHorario: string) {
  const combinacao = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(
    `${data}T${horario.slice(0, 5)}`,
  );
  if (!combinacao) return null;

  const [, ano, mes, dia, hora, minuto] = combinacao;
  const instanteIngenuo = Date.UTC(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
  );
  const partesLocais = partesDataHora(new Date(instanteIngenuo), fusoHorario);
  const instanteRepresentado = Date.UTC(
    Number(partesLocais.year),
    Number(partesLocais.month) - 1,
    Number(partesLocais.day),
    Number(partesLocais.hour),
    Number(partesLocais.minute),
    Number(partesLocais.second),
  );

  return new Date(instanteIngenuo - (instanteRepresentado - instanteIngenuo));
}

export function janelaChecklist(
  data: string,
  horario: string | null,
  limiteMinutos: number,
  agenda: AgendaOperacional = AGENDA_OPERACIONAL_PADRAO,
) {
  if (
    !horario ||
    minutos(horario) === null ||
    !Number.isInteger(limiteMinutos) ||
    limiteMinutos <= 0
  ) {
    return null;
  }

  const horarioNormalizado = horario.slice(0, 5);
  const dataInicio = horarioNoDiaSeguinte(horarioNormalizado, agenda)
    ? deslocarData(data, 1)
    : data;
  const inicio = instanteNoFuso(dataInicio, horarioNormalizado, agenda.fuso_horario);
  if (!inicio) return null;

  return {
    inicio,
    prazoFinal: new Date(inicio.getTime() + limiteMinutos * 60_000),
  };
}

export function formatarHoraOperacional(
  valor: Date,
  fusoHorario = AGENDA_OPERACIONAL_PADRAO.fuso_horario,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}
