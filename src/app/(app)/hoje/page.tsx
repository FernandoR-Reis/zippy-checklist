import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import {
  listarChecklistsDoDia,
  iniciarOuContinuarExecucao,
} from "@/lib/execucoes/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import {
  AGENDA_OPERACIONAL_PADRAO,
  dataOperacional,
  horarioNoDiaSeguinte,
  janelaChecklist,
} from "@/lib/execucoes/schedule";

export default async function HojePage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  const usuario = await getOrCreateUsuarioAtual();
  const [itens, agenda] = await Promise.all([
    listarChecklistsDoDia(),
    usuario?.empresa_id
      ? buscarAgendaEmpresa(usuario.empresa_id)
      : Promise.resolve(AGENDA_OPERACIONAL_PADRAO),
  ]);
  const agora = new Date();

  return (
    <div className="mx-auto max-w-2xl">
      <section className="relative mb-7 overflow-hidden rounded-lg bg-gradient-to-br from-navy via-navy-soft to-[#39478F] p-6 text-white shadow-pop sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[24px] border-white/[0.06]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-orange/10 blur-2xl"
        />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D8DDF7]">
            <span className="h-1.5 w-1.5 rounded-full bg-orange" />
            Painel de operação
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Olá, {usuario?.nome?.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-lg font-body text-sm leading-6 text-[#D8DDF7] sm:text-base">
            Tudo pronto para manter a operação em dia? Acompanhe seus checklists abaixo.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-white/10 bg-white/[0.08] px-4 py-3">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5 text-orange"
            >
              <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 5.5v4.75l3 1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-body text-xs font-medium text-[#D8DDF7]">Horário da operação</span>
            <span className="font-mono text-sm font-semibold text-white">
              {agenda.inicio_operacao.slice(0, 5)}–{agenda.fim_operacao.slice(0, 5)}
            </span>
            <span className="font-body text-xs text-[#B8BFE6]">{agenda.fuso_horario}</span>
          </div>
        </div>
      </section>

      {agenda.inicio_operacao.slice(0, 5) > agenda.fim_operacao.slice(0, 5) && (
        <div className="mb-6 flex gap-3 rounded-md border border-orange/20 bg-[#FFF8F0] px-4 py-3.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="mt-0.5 h-5 w-5 shrink-0 text-orange-dark"
          >
            <path d="M10 2.75 18 17H2L10 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7.25v4.5M10 14.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="font-body text-sm leading-6 text-[#80501F]">
            A operação começa em um dia e termina no seguinte. Checklists após a meia-noite continuam vinculados à operação em que começaram.
          </p>
        </div>
      )}

      {searchParams.erro && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-danger/15 bg-danger-soft px-4 py-3 font-body text-sm text-danger-text"
        >
          {searchParams.erro}
        </div>
      )}

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-orange-dark">
            Sua rotina
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight text-navy sm:text-2xl">
            Checklists de hoje
          </h2>
        </div>
        {itens.length > 0 && (
          <div className="shrink-0 rounded-full border border-border bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-muted shadow-sm">
            {itens.length} {itens.length === 1 ? "checklist" : "checklists"}
          </div>
        )}
      </div>

      {itens.length === 0 ? (
        <Card className="rounded-lg border-white p-6 sm:p-8">
          <EmptyState
            title="Nada por aqui"
            description="Não há checklists para seus setores. Peça ao gestor para vincular você a um setor."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {itens.map(({ checklist, setorNome, totalTarefas, execucao, executorNome, concluidas, naoFeitas }) => {
            const concluido = execucao?.status === "concluido";
            const data = dataOperacional(agora, agenda, checklist.horario, checklist.limite_minutos ?? 90);
            const janela = janelaChecklist(data, checklist.horario, checklist.limite_minutos ?? 90, agenda);
            const horario = checklist.horario
              ? `${checklist.horario.slice(0, 5)}${horarioNoDiaSeguinte(checklist.horario, agenda) ? " (dia seguinte)" : ""}`
              : "";
            const prazoVencido = Boolean(janela && agora > janela.prazoFinal);
            const atrasado = execucao !== null && !concluido && (execucao.status === "atrasado" || prazoVencido);
            const emAndamento = execucao !== null && !concluido && !atrasado && execucao.usuario_id !== null;
            const liberado = execucao !== null && !concluido && !atrasado && execucao.usuario_id === null;
            const naoExecutadoNoPrazo = !execucao && prazoVencido;
            const podeComecar = Boolean(janela && agora >= janela.inicio && agora <= janela.prazoFinal);
            const horarioFuturo = Boolean(janela && agora < janela.inicio);
            const podeGerenciar =
              usuario?.perfil === "administrador" ||
              (usuario?.perfil === "gestor" &&
                usuario.unidade_id === checklist.unidade_id);
            const bloqueado =
              execucao !== null &&
              execucao.usuario_id !== null &&
              execucao.usuario_id !== usuario?.id &&
              !podeGerenciar;
            const indisponivel = !checklist.ativo && !execucao;
            const mostrarProgresso = execucao !== null && !bloqueado;
            const progresso = totalTarefas > 0
              ? Math.min(100, Math.round((concluidas / totalTarefas) * 100))
              : 0;

            return (
              <Card
                key={checklist.id}
                className="group relative overflow-hidden rounded-lg border-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop sm:p-6"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange via-[#F7A442] to-transparent opacity-80" />
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#FFF3E8] text-orange-dark">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <rect x="5" y="4" width="14" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M9 4.5h6M8.5 10h7M8.5 14h7M8.5 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <h3 className="min-w-0 flex-1 font-display text-base font-bold leading-6 tracking-tight text-navy sm:text-lg">
                        {checklist.nome}
                      </h3>
                      {concluido ? (
                        <Badge tone="done">Concluído</Badge>
                      ) : emAndamento ? (
                        <Badge tone="progress">Em andamento</Badge>
                      ) : liberado ? (
                        <Badge tone="idle">Disponível</Badge>
                      ) : atrasado || naoExecutadoNoPrazo ? (
                        <Badge tone="late">{execucao?.usuario_id ? "Prazo vencido" : "Não executado"}</Badge>
                      ) : indisponivel ? (
                        <Badge tone="idle">Inativo</Badge>
                      ) : null}
                    </div>

                    {emAndamento && (
                      <p className="mt-1 font-body text-xs font-medium text-orange-dark">
                        Em andamento por {executorNome ?? "usuário não identificado"}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-body text-xs text-ink-muted">
                      <span className="rounded-full bg-surface-soft px-2.5 py-1 font-semibold text-navy-soft">{setorNome}</span>
                      <span>{totalTarefas} {totalTarefas === 1 ? "tarefa" : "tarefas"}</span>
                      {horario && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span className="inline-flex items-center gap-1 font-mono font-medium">
                            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M8 4.5v3.75l2.25 1.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                            {horario}
                          </span>
                        </>
                      )}
                    </div>

                    {mostrarProgresso && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between font-body text-xs">
                          <span className="text-ink-muted">Progresso</span>
                          <span className="font-semibold text-navy">{concluidas}/{totalTarefas} concluídas</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`Progresso de ${checklist.nome}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progresso}
                          className="h-1.5 overflow-hidden rounded-full bg-[#ECEEF7]"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange to-[#F7A442] transition-[width] duration-300"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {naoFeitas > 0 && (
                      <p className="mt-4 rounded-sm bg-[#FFF8F0] px-3 py-2 font-body text-xs font-semibold text-[#80501F]">
                        Atenção: {naoFeitas === 1
                          ? "existe 1 tarefa que não foi executada."
                          : `existem ${naoFeitas} tarefas que não foram executadas.`} Observações registradas.
                      </p>
                    )}
                    <div className="mt-4 border-t border-border/70 pt-4">
                      {bloqueado ? (
                        <p className="font-body text-sm leading-5 text-ink-muted">
                          Execução reservada a quem iniciou e ao gestor.
                        </p>
                      ) : concluido ? (
                        <a
                          href={`/hoje/${checklist.id}`}
                          className="block w-full rounded-md border border-navy/20 bg-white px-4 py-2.5 text-center font-body text-sm font-semibold text-navy transition hover:border-navy hover:bg-surface-soft"
                        >
                          Ver checklist
                        </a>
                      ) : emAndamento ? (
                        <a
                          href={`/hoje/${checklist.id}`}
                          className="block w-full rounded-md bg-orange px-4 py-2.5 text-center font-body text-sm font-semibold text-white shadow-sm transition hover:bg-orange-dark"
                        >
                          Continuar checklist
                        </a>
                      ) : atrasado && !bloqueado && execucao?.usuario_id ? (
                        <a
                          href={`/hoje/${checklist.id}`}
                          className="block w-full rounded-md border border-danger/25 bg-danger-soft px-4 py-2.5 text-center font-body text-sm font-semibold text-danger-text transition hover:border-danger/50"
                        >
                          Ver execução
                        </a>
                      ) : atrasado ? (
                        <p className="font-body text-sm leading-5 text-ink-muted">O prazo para execução terminou.</p>
                      ) : liberado ? (
                        podeComecar ? (
                          <form action={iniciarOuContinuarExecucao.bind(null, checklist.id)}>
                            <Button type="submit" loadingText="Assumindo..." className="w-full">
                              Assumir checklist
                            </Button>
                          </form>
                        ) : (
                          <p className="font-body text-sm leading-5 text-ink-muted">
                            {horarioFuturo ? `Disponível às ${horario}.` : "O prazo para iniciar terminou."}
                          </p>
                        )
                      ) : indisponivel ? (
                        <p className="font-body text-sm leading-5 text-ink-muted">
                          Este checklist está inativo.
                        </p>
                      ) : naoExecutadoNoPrazo ? (
                        <p className="font-body text-sm leading-5 text-ink-muted">O prazo para iniciar terminou.</p>
                      ) : (
                        podeComecar ? (
                          <form action={iniciarOuContinuarExecucao.bind(null, checklist.id)}>
                            <Button type="submit" loadingText="Entrando..." className="w-full">
                              Começar checklist
                            </Button>
                          </form>
                        ) : (
                          <p className="font-body text-sm leading-5 text-ink-muted">
                            {horarioFuturo ? `Disponível às ${horario}.` : "O prazo para iniciar terminou."}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
