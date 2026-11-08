import { redirect } from "next/navigation";
import Link from "next/link";
import {
  buscarExecucaoDoDia,
  iniciarOuContinuarExecucao,
  liberarExecucao,
} from "@/lib/execucoes/actions";
import { ExecutionTasks } from "@/components/hoje/ExecutionTasks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckMark } from "@/components/ui/CheckMark";
import { tarefaNaoFeita } from "@/lib/execucoes/tarefas";
import {
  formatarHoraOperacional,
  horarioNoDiaSeguinte,
} from "@/lib/execucoes/schedule";

function formatarHora(iso: string, fusoHorario: string) {
  return formatarHoraOperacional(new Date(iso), fusoHorario);
}

export default async function ExecutarChecklistPage({
  params,
  searchParams,
}: {
  params: { checklistId: string };
  searchParams: { erro?: string };
}) {
  const detalhes = await buscarExecucaoDoDia(params.checklistId);
  if (!detalhes) redirect("/hoje");

  const {
    checklist,
    unidadeNome,
    setorNome,
    execucao,
    executorNome,
    tarefas,
    podeEditar,
    podeLiberar,
    podeIniciar,
    prazoFinal,
    prazoExpirado,
    agenda,
  } = detalhes;

  if (!execucao) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          {unidadeNome} · {setorNome}
        </div>
        <h1 className="mb-6 font-display text-2xl font-bold text-navy">
          {checklist.nome}
        </h1>
        {podeIniciar ? (
          <form action={iniciarOuContinuarExecucao.bind(null, checklist.id)}>
            <Button type="submit" loadingText="Entrando..." className="w-full">
              Começar
            </Button>
          </form>
        ) : (
          <p className="font-body text-sm text-ink-muted">
            {prazoExpirado
              ? "O prazo para iniciar este checklist terminou."
              : checklist.horario
                ? `Este checklist estará disponível às ${checklist.horario.slice(0, 5)}${horarioNoDiaSeguinte(checklist.horario, agenda) ? " do dia seguinte" : ""}.`
                : "Este checklist não está disponível para execução no momento."}
          </p>
        )}
        <Link
          href="/hoje"
          className="mt-4 block font-mono text-xs text-ink-muted"
        >
          ← Hoje
        </Link>
      </div>
    );
  }

  const total = tarefas.length;
  const concluidas = tarefas.filter((tarefa) => tarefa.concluida).length;
  const naoFeitas = tarefas.filter(tarefaNaoFeita);

  if (execucao.status === "concluido") {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <CheckMark className="mx-auto mb-4 h-16 w-16 text-success-text" />
        <div className="mb-3 inline-flex rounded-md bg-success px-4 py-2 text-white">
          <h1 className="font-display text-2xl font-bold">
            Checklist concluído
          </h1>
        </div>
        <p className="mb-6 font-body text-sm text-ink-muted">
          {checklist.nome}
        </p>
        <Card className="mb-6 text-left">
          <div className="mb-2 font-mono text-sm text-ink-muted">
            {concluidas}/{total} tarefas concluídas
          </div>
          {execucao.inicio && (
            <div className="font-mono text-xs text-ink-muted">
              Início: {formatarHora(execucao.inicio, agenda.fuso_horario)}
            </div>
          )}
          {execucao.fim && (
            <div className="font-mono text-xs text-ink-muted">
              Conclusão: {formatarHora(execucao.fim, agenda.fuso_horario)}
            </div>
          )}
        </Card>
        {naoFeitas.length > 0 && (
          <div role="status" className="mb-6 rounded-md border border-orange/30 bg-[#FFF8F0] p-4 text-left font-body text-sm text-[#80501F]">
            <p className="font-semibold">
              Atenção: {naoFeitas.length === 1
                ? "existe 1 tarefa que não foi executada."
                : `existem ${naoFeitas.length} tarefas que não foram executadas.`}
            </p>
            <p className="mt-1">O checklist foi finalizado com as seguintes justificativas:</p>
            <ul className="mt-3 space-y-3">
              {naoFeitas.map((tarefa) => (
                <li key={tarefa.id}>
                  <span className="font-semibold">{tarefa.titulo}</span>
                  <p className="whitespace-pre-wrap">Motivo: {tarefa.observacao}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link
          href="/hoje"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-success px-4 py-2 font-semibold text-white"
        >
          <span aria-hidden="true">←</span>
          Retornar aos checklists
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/hoje"
          className="font-mono text-xs text-ink-muted hover:text-navy"
        >
          ← Checklists do dia
        </Link>
        {podeLiberar && (
          <form action={liberarExecucao.bind(null, checklist.id, execucao.id)}>
            <Button type="submit" variant="outline" loadingText="Liberando..." className="px-3 py-2 text-xs">
              Liberar para outra pessoa
            </Button>
          </form>
        )}
      </div>
      <div className="mb-6 mt-5">
        <div className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          {unidadeNome} · {setorNome}
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">
          {checklist.nome}
        </h1>
        <div className="mt-2">
          {prazoExpirado || execucao.status === "atrasado" ? (
            <Badge tone="late">Prazo encerrado</Badge>
          ) : (
            <Badge tone="progress">Em andamento por {executorNome ?? "usuário não identificado"}</Badge>
          )}
        </div>
      </div>

      {prazoFinal && (
        <p className="mb-4 font-mono text-xs text-ink-muted">
          Prazo para concluir: {formatarHora(prazoFinal, agenda.fuso_horario)}
        </p>
      )}

      {(prazoExpirado || execucao.status === "atrasado") && (
        <div role="status" className="mb-4 rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
          O prazo terminou. O progresso foi preservado e não pode mais ser alterado.
        </div>
      )}

      {searchParams.erro && (
        <div
          role="alert"
          className="mb-4 rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text"
        >
          {searchParams.erro}
        </div>
      )}

      <ExecutionTasks
        checklistId={checklist.id}
        execucaoId={execucao.id}
        tarefas={tarefas}
        podeEditar={podeEditar}
      />
      {!podeEditar && !prazoExpirado && execucao.status !== "atrasado" && (
        <p className="mt-6 text-center font-body text-xs text-ink-muted">
          Somente leitura — esta execução pertence a outro usuário.
        </p>
      )}
    </div>
  );
}
