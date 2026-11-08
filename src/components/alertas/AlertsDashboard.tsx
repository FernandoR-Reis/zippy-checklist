"use client";

import { useState } from "react";
import Link from "next/link";
import type { AlertaHistorico, EstadoAlerta, ItemAlertaChecklist } from "@/lib/execucoes/alertas";
import { formatarHoraOperacional } from "@/lib/execucoes/schedule";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PushNotificationsButton } from "@/components/alertas/PushNotificationsButton";
import { filtrarAlertas, type FiltrosAlertas } from "@/components/alertas/filtros";

const estados: Record<EstadoAlerta, { titulo: string; tone: "idle" | "progress" | "done" | "late" }> = {
  agendado: { titulo: "Agendado", tone: "idle" },
  nao_iniciado: { titulo: "Ainda não iniciado", tone: "idle" },
  em_andamento: { titulo: "Em andamento", tone: "progress" },
  nao_executado: { titulo: "Não executado", tone: "late" },
  atrasado: { titulo: "Prazo vencido", tone: "late" },
  concluido: { titulo: "Concluído", tone: "done" },
};

const filtrosIniciais: FiltrosAlertas = { busca: "", unidadeId: "", setorId: "", estado: "todos" };
const campo = "w-full min-w-0 rounded-sm border border-border bg-white px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/10";

function estadoValido(valor: string): valor is FiltrosAlertas["estado"] {
  return valor === "todos" || valor === "atencao" || Object.hasOwn(estados, valor);
}

function formatarData(data: string) {
  return data.split("-").reverse().join("/");
}

export function AlertsDashboard({ itens, historico, hoje }: {
  itens: ItemAlertaChecklist[];
  historico: AlertaHistorico[];
  hoje: string;
}) {
  const [aba, setAba] = useState<"hoje" | "historico">("hoje");
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const anteriores = historico.map((alerta) => ({
    ...alerta, nome: alerta.checklistNome, estado: alerta.tipo,
  }));
  const origem = aba === "hoje" ? itens : anteriores;
  const unidades = [...new Map(origem.map((item) => [item.unidadeId, item.unidadeNome])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const setores = [...new Map(origem
    .filter((item) => !filtros.unidadeId || item.unidadeId === filtros.unidadeId)
    .map((item) => [item.setorId, item.setorNome])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const escopo = aba === "hoje"
    ? filtrarAlertas(itens, { ...filtros, estado: "todos" })
    : filtrarAlertas(anteriores, { ...filtros, estado: "todos" });
  const resultados = filtrarAlertas(itens, filtros);
  const historicoFiltrado = filtrarAlertas(anteriores, filtros);
  const totalResultados = aba === "hoje" ? resultados.length : historicoFiltrado.length;
  const temFiltros = filtros.busca !== "" || filtros.unidadeId !== "" || filtros.setorId !== "" || filtros.estado !== "todos";
  const resumos: { titulo: string; estado: FiltrosAlertas["estado"]; valor: number; cor: string }[] = [
    { titulo: "Visão geral", estado: "todos", valor: escopo.length, cor: "text-navy" },
    { titulo: "Precisam de atenção", estado: "atencao", valor: escopo.filter((item) => ["nao_iniciado", "nao_executado", "atrasado"].includes(item.estado)).length, cor: "text-danger-text" },
    { titulo: "Em andamento", estado: "em_andamento", valor: escopo.filter((item) => item.estado === "em_andamento").length, cor: "text-orange-dark" },
    { titulo: "Concluídos", estado: "concluido", valor: escopo.filter((item) => item.estado === "concluido").length, cor: "text-success-text" },
  ];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-body text-xs font-bold uppercase tracking-[0.16em] text-orange-dark">Controle da operação</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy">Central de alertas</h1>
          <p className="mt-2 font-body text-sm leading-6 text-ink-muted">Priorize pendências e acompanhe os checklists da sua equipe.</p>
        </div>
        <span className="rounded-full border border-border bg-white px-4 py-2 font-mono text-xs text-navy">{hoje}</span>
      </header>

      <div className="mb-5 flex gap-1 rounded-md bg-border/50 p-1" role="group" aria-label="Período dos alertas">
        {(["hoje", "historico"] as const).map((periodo) => (
          <button key={periodo} type="button" aria-pressed={aba === periodo}
            onClick={() => { setAba(periodo); setFiltros(filtrosIniciais); }}
            className={`flex-1 rounded-sm px-3 py-3 font-body text-sm font-semibold transition ${aba === periodo ? "bg-white text-navy shadow-sm" : "text-ink-muted hover:text-navy"}`}>
            {periodo === "hoje" ? "Operação de hoje" : "Histórico · 30 dias"}
          </button>
        ))}
      </div>

      <Card className="mb-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="font-body text-xs font-semibold text-ink-muted">Buscar</span>
            <input type="search" value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              placeholder="Checklist ou responsável" className={campo} />
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="font-body text-xs font-semibold text-ink-muted">Unidade</span>
            <select value={filtros.unidadeId} onChange={(e) => setFiltros({ ...filtros, unidadeId: e.target.value, setorId: "" })} className={campo}>
              <option value="">Todas as unidades</option>
              {unidades.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="font-body text-xs font-semibold text-ink-muted">Setor</span>
            <select value={filtros.setorId} onChange={(e) => setFiltros({ ...filtros, setorId: e.target.value })} className={campo}>
              <option value="">Todos os setores</option>
              {setores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="font-body text-xs font-semibold text-ink-muted">Status</span>
            <select value={filtros.estado} onChange={(e) => {
              const estado = e.target.value;
              if (estadoValido(estado)) {
                setFiltros({ ...filtros, estado });
              }
            }} className={campo}>
              <option value="todos">Todos os status</option>
              <option value="atencao">Precisam de atenção</option>
              {Object.entries(estados).filter(([estado]) => aba === "hoje" || estado === "atrasado" || estado === "nao_executado")
                .map(([estado, info]) => <option key={estado} value={estado}>{info.titulo}</option>)}
            </select>
          </label>
        </div>
        {temFiltros && (
          <button type="button" onClick={() => setFiltros(filtrosIniciais)} className="mt-3 font-body text-xs font-semibold text-navy underline underline-offset-4">Limpar filtros</button>
        )}
      </Card>

      {aba === "hoje" && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {resumos.map((resumo) => (
            <button key={resumo.estado} type="button" aria-pressed={filtros.estado === resumo.estado}
              onClick={() => setFiltros({ ...filtros, estado: resumo.estado })}
              className={`rounded-md border bg-white p-4 text-left transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange ${filtros.estado === resumo.estado ? "border-navy ring-1 ring-navy" : "border-border"}`}>
              <p className="font-body text-xs font-semibold text-ink-muted">{resumo.titulo}</p>
              <p className={`mt-2 font-display text-3xl font-bold ${resumo.cor}`}>{resumo.valor}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-navy">{aba === "hoje" ? "Checklists da operação" : "Alertas registrados"}</h2>
        <p role="status" aria-live="polite" className="font-body text-xs text-ink-muted">{totalResultados} de {origem.length} {aba === "hoje" ? "checklists" : "alertas"}</p>
      </div>
      {totalResultados === 0 ? (
        <Card className="py-10 text-center">
          <h3 className="font-display text-lg font-bold text-navy">{temFiltros ? "Nenhum resultado para estes filtros" : "Nenhum alerta por aqui"}</h3>
          <p className="mt-2 font-body text-sm text-ink-muted">{temFiltros ? "Ajuste a busca ou limpe os filtros para ver outros itens." : aba === "hoje" ? "Não há checklists ativos disponíveis para acompanhar." : "Não há alertas registrados nos últimos 30 dias."}</p>
          {temFiltros && <button type="button" onClick={() => setFiltros(filtrosIniciais)} className="mt-4 font-body text-sm font-semibold text-navy underline">Mostrar todos</button>}
        </Card>
      ) : aba === "hoje" ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {resultados.map((item) => {
            const estado = estados[item.estado];
            const critico = item.estado === "atrasado" || item.estado === "nao_executado";
            const progresso = item.total ? Math.min(100, Math.round(item.concluidas / item.total * 100)) : 0;
            return (
              <Card key={item.checklistId} className={`overflow-hidden border-t-[3px] ${critico ? "border-t-danger" : item.estado === "concluido" ? "border-t-success" : "border-t-orange/60"}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-surface-soft px-2.5 py-1 font-body text-xs font-semibold text-navy-soft">{item.setorNome}</span>
                  <Badge tone={estado.tone}>{estado.titulo}</Badge>
                </div>
                <h3 className="break-words font-display text-lg font-bold leading-6 text-navy">{item.nome}</h3>
                <p className="mt-1 font-body text-xs text-ink-muted">{item.unidadeNome}</p>
                <dl className="my-4 grid grid-cols-2 gap-3 rounded-sm bg-surface-soft p-3">
                  <div><dt className="font-body text-xs text-ink-muted">Início previsto</dt><dd className="mt-1 font-mono text-sm font-semibold text-navy">{item.horario}{item.horarioNoDiaSeguinte && <span className="block font-body text-[11px] font-normal text-ink-muted">Dia seguinte</span>}</dd></div>
                  <div><dt className="font-body text-xs text-ink-muted">Prazo final</dt><dd className={`mt-1 font-mono text-sm font-semibold ${critico ? "text-danger-text" : "text-navy"}`}>{formatarHoraOperacional(new Date(item.prazoFinal), item.fusoHorario)}</dd></div>
                </dl>
                <p className="mb-3 font-body text-xs text-ink-muted">Responsável: <span className="font-semibold text-ink">{item.executorNome ?? "Ainda não assumido"}</span></p>
                <div className="mb-2 flex justify-between gap-2 font-body text-xs text-ink-muted"><span>Tarefas concluídas</span><span className="font-semibold text-navy">{item.concluidas}/{item.total}</span></div>
                <div role="progressbar" aria-label={`Progresso de ${item.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={`h-full rounded-full ${item.estado === "concluido" ? "bg-success" : "bg-orange"}`} style={{ width: `${progresso}%` }} />
                </div>
                {item.tarefasPendentes.length > 0 && (
                  <details className="mt-4 border-t border-border pt-3">
                    <summary className="cursor-pointer font-body text-sm font-semibold text-navy">{item.tarefasPendentes.length} tarefas não concluídas</summary>
                    <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pl-4 font-body text-sm leading-5 text-ink-muted">
                      {item.tarefasPendentes.map((titulo, index) => <li key={index} className="list-disc break-words">{titulo}</li>)}
                    </ul>
                  </details>
                )}
                {["em_andamento", "atrasado", "concluido"].includes(item.estado) && (
                  <Link href={`/hoje/${item.checklistId}`} className="mt-4 flex items-center justify-between rounded-sm border border-border px-3 py-2.5 font-body text-sm font-semibold text-navy transition hover:bg-surface-soft">
                    {item.estado === "concluido" ? "Ver checklist" : "Abrir execução"}<span aria-hidden="true">→</span>
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {historicoFiltrado.map((alerta) => (
            <Card key={alerta.id} className="flex flex-wrap items-center gap-4">
              <span className="rounded-sm bg-surface-soft px-3 py-2 font-mono text-xs font-semibold text-navy">{formatarData(alerta.data)}</span>
              <div className="min-w-0 flex-1"><h3 className="break-words font-display font-bold text-navy">{alerta.checklistNome}</h3><p className="mt-1 font-body text-xs text-ink-muted">{alerta.unidadeNome} · {alerta.setorNome}</p></div>
              <Badge tone="late">{estados[alerta.tipo].titulo}</Badge>
            </Card>
          ))}
        </div>
      )}

      <details className="mt-8 rounded-md border border-border bg-white p-4 sm:p-5">
        <summary className="cursor-pointer font-display font-semibold text-navy">Notificações no celular</summary>
        <p className="mb-4 mt-3 font-body text-sm text-ink-muted">Receba avisos quando um checklist não for iniciado ou ultrapassar o prazo.</p>
        <PushNotificationsButton />
      </details>
    </div>
  );
}
