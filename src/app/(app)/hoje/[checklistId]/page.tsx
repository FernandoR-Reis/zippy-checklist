import { redirect } from "next/navigation";
import Link from "next/link";
import {
  buscarExecucaoDoDia,
  iniciarOuContinuarExecucao,
} from "@/lib/execucoes/actions";
import { ExecutionTasks } from "@/components/hoje/ExecutionTasks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckMark } from "@/components/ui/CheckMark";

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    tarefas,
    podeEditar,
    podeIniciar,
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
            Este checklist não está disponível para execução no momento.
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
              Início: {formatarHora(execucao.inicio)}
            </div>
          )}
          {execucao.fim && (
            <div className="font-mono text-xs text-ink-muted">
              Conclusão: {formatarHora(execucao.fim)}
            </div>
          )}
        </Card>
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
      <Link
        href="/hoje"
        className="font-mono text-xs text-ink-muted hover:text-navy"
      >
        ← Hoje
      </Link>
      <div className="mb-6 mt-5">
        <div className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          {unidadeNome} · {setorNome}
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">
          {checklist.nome}
        </h1>
      </div>

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
      {!podeEditar && (
        <p className="mt-6 text-center font-body text-xs text-ink-muted">
          Somente leitura — esta execução pertence a outro usuário.
        </p>
      )}
    </div>
  );
}
