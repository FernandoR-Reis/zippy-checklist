"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  alternarTarefaCheckbox,
  responderTarefa,
  reiniciarExecucao,
  registrarTarefaNaoFeita,
  finalizarExecucao,
} from "@/lib/execucoes/actions";
import { Button } from "@/components/ui/Button";
import { CheckMark } from "@/components/ui/CheckMark";
import type { TarefaExecucao } from "@/types/database";

export function ExecutionTasks({
  checklistId,
  execucaoId,
  tarefas: tarefasRecebidas,
  podeEditar,
}: {
  checklistId: string;
  execucaoId: string;
  tarefas: TarefaExecucao[];
  podeEditar: boolean;
}) {
  const [atualizacoes, setAtualizacoes] = useState<Record<string, Partial<TarefaExecucao>>>({});
  const tarefas = tarefasRecebidas.map((tarefa) => ({
    ...tarefa,
    ...atualizacoes[tarefa.id],
  }));
  const [indiceAtual, setIndiceAtual] = useState(() => {
    const indice = tarefas.findIndex((tarefa) => !tarefa.concluida);
    return indice === -1 ? tarefas.length : indice;
  });
  const [persistindo, setSalvando] = useState(false);
  const [voltando, setVoltando] = useState(false);
  const [avancando, setAvancando] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [marcandoNaoFeito, setMarcandoNaoFeito] = useState(false);
  const [observando, setObservando] = useState(false);
  const [erroObservacao, setErroObservacao] = useState<string | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);
  const salvando = persistindo || avancando;

  useEffect(() => {
    if (!voltando && !avancando) return;
    // Keep feedback visible before the otherwise instantaneous local navigation.
    const timeout = window.setTimeout(() => {
      setIndiceAtual((indice) =>
        voltando ? Math.max(0, indice - 1) : Math.min(indice + 1, tarefas.length)
      );
      setVoltando(false);
      setAvancando(false);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [voltando, avancando, tarefas.length]);

  const concluidas = tarefas.filter((tarefa) => tarefa.concluida).length;
  const obrigatorias = tarefas.filter((tarefa) => tarefa.obrigatoria);
  const obrigatoriasConcluidas = obrigatorias.filter(
    (tarefa) => tarefa.concluida
  ).length;
  const progresso = tarefas.length
    ? Math.round((concluidas / tarefas.length) * 100)
    : 0;
  const tarefaAtual = tarefas[indiceAtual];
  const podeFinalizar = podeEditar && !persistindo && obrigatoriasConcluidas === obrigatorias.length;

  function voltar() {
    if (salvando || voltando || indiceAtual === 0) return;
    setRevisando(true);
    setVoltando(true);
  }

  function avancar() {
    if (voltando) return;
    setIndiceAtual((indice) => Math.min(indice + 1, tarefas.length));
  }

  async function salvarTarefa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tarefaAtual || !podeEditar || salvando || voltando) return;

    const formData = new FormData(event.currentTarget);
    const valor = String(formData.get("resposta") ?? "").trim();
    const resposta = tarefaAtual.tipo === "numero"
      ? (valor ? Number(valor.replace(",", ".")) : null)
      : valor;
    const semAlteracoes = tarefaAtual.concluida && (
      tarefaAtual.tipo === "checkbox" ||
      resposta === tarefaAtual.resposta
    );

    if (semAlteracoes && indiceAtual < tarefas.length - 1) {
      setAvancando(true);
      return;
    }

    setErroSalvamento(null);
    setSalvando(true);
    setAtualizacoes((atuais) => ({
      ...atuais,
      [tarefaAtual.id]: {
        concluida: true,
        observacao: null,
        resposta: tarefaAtual.tipo === "checkbox" ? tarefaAtual.resposta : resposta,
      },
    }));
    avancar();
    let salva = false;
    try {
      salva =
        tarefaAtual.tipo === "checkbox"
          ? await alternarTarefaCheckbox(
              checklistId,
              execucaoId,
              tarefaAtual.id,
              true,
              formData
            )
          : await responderTarefa(
              checklistId,
              execucaoId,
              tarefaAtual.id,
              formData
            );

    } finally {
      if (!salva) {
        setAtualizacoes((atuais) => ({
          ...atuais,
          [tarefaAtual.id]: tarefaAtual,
        }));
        setIndiceAtual(indiceAtual);
        setErroSalvamento("Não foi possível salvar a tarefa. Tente novamente.");
      }
      setSalvando(false);
    }
  }

  async function reiniciar() {
    if (reiniciando || voltando || salvando) return;
    setReiniciando(true);
    try {
      if (await reiniciarExecucao(checklistId, execucaoId)) {
        setAtualizacoes(Object.fromEntries(tarefas.map((tarefa) => [
          tarefa.id,
          { concluida: false, resposta: null, observacao: null, concluida_em: null, evidencia: null },
        ])));
        setConfirmarReinicio(false);
        setRevisando(false);
        setIndiceAtual(0);
      }
    } finally {
      setReiniciando(false);
    }
  }

  async function naoFeito(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tarefaAtual || !podeEditar || salvando || voltando) return;
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("observacao") ?? "").trim()) {
      setErroObservacao("Informe por que a tarefa não foi feita.");
      return;
    }
    setErroObservacao(null);
    setMarcandoNaoFeito(true);
    setSalvando(true);
    try {
      const resultado = await registrarTarefaNaoFeita(
        checklistId, execucaoId, tarefaAtual.id, formData
      );
      if (resultado.sucesso) {
        setAtualizacoes((atuais) => ({
          ...atuais,
          [tarefaAtual.id]: {
            concluida: false,
            concluida_em: null,
            observacao: String(formData.get("observacao")).trim(),
          },
        }));
        setObservando(false);
        avancar();
      } else {
        setErroObservacao(resultado.erro ?? "Não foi possível salvar a observação.");
      }
    } finally {
      setMarcandoNaoFeito(false);
      setSalvando(false);
    }
  }

  return (
    <>
      {erroSalvamento && (
        <p role="alert" className="mb-4 rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
          {erroSalvamento}
        </p>
      )}
      {persistindo && !marcandoNaoFeito && (
        <p role="status" className="mb-3 font-body text-sm text-ink-muted">
          Confirmando o salvamento da tarefa anterior...
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-xs text-ink-muted">
        <span>
          {concluidas} de {tarefas.length} tarefas concluídas
        </span>
        <span>
          Obrigatórias {obrigatoriasConcluidas} de {obrigatorias.length}
        </span>
      </div>
      <div
        className="mb-7 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Progresso do checklist"
        aria-valuemin={0}
        aria-valuemax={tarefas.length}
        aria-valuenow={concluidas}
      >
        <div
          className="h-full rounded-full bg-orange transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {tarefaAtual ? (
        <section
          aria-live="polite"
          className="rounded-lg border border-border bg-surface p-5 shadow-card sm:p-10"
        >
          <div className="mb-10 flex items-center justify-between gap-4">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Tarefa {indiceAtual + 1} de {tarefas.length}
            </span>
            <span
              className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold ${
                tarefaAtual.obrigatoria
                  ? "bg-danger-soft text-danger-text"
                  : "bg-surface-soft text-ink-muted"
              }`}
            >
              {tarefaAtual.obrigatoria ? "Obrigatória" : "Opcional"}
            </span>
          </div>

          <h2 className="mb-2 font-display text-3xl font-bold text-navy sm:text-4xl">
            {tarefaAtual.titulo}
          </h2>
          <p className="font-body text-sm text-ink-muted">
            {tarefaAtual.concluida
              ? "Esta tarefa já foi concluída. Você pode revisar a resposta ou seguir para a próxima."
              : "Marque como feito ou não feito para continuar."}
          </p>

          <div className="my-8 border-t border-border" />

          {tarefaAtual.observacao && !observando && (
            <p className="mb-5 whitespace-pre-wrap rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
              Motivo de não realização: {tarefaAtual.observacao}
            </p>
          )}

          {tarefaAtual.tipo === "foto" ? (
            <>
              <p className="rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
                Tarefas com foto ainda não podem ser respondidas neste aplicativo.
              </p>
            </>
          ) : (
            <form id={`tarefa-${tarefaAtual.id}`} key={tarefaAtual.id} onSubmit={salvarTarefa} className="flex flex-col gap-5">
              {tarefaAtual.tipo === "sim_nao" && (
                <fieldset className="flex gap-3">
                  <legend className="sr-only">Selecione Sim ou Não</legend>
                  {(["sim", "nao"] as const).map((valor) => (
                    <label
                      key={valor}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-border px-4 py-3 font-body text-sm font-semibold text-ink transition has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white"
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="resposta"
                        value={valor}
                        defaultChecked={tarefaAtual.resposta === valor}
                        required
                        disabled={!podeEditar || salvando}
                      />
                      {valor === "sim" ? "Sim" : "Não"}
                    </label>
                  ))}
                  <input type="hidden" name="tipo" value="sim_nao" />
                </fieldset>
              )}

              {tarefaAtual.tipo === "numero" && (
                <>
                  <input type="hidden" name="tipo" value="numero" />
                  <label className="flex flex-col gap-1.5 font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Resposta
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      name="resposta"
                      defaultValue={
                        typeof tarefaAtual.resposta === "number"
                          ? tarefaAtual.resposta
                          : ""
                      }
                      required
                      disabled={!podeEditar || salvando}
                      className="rounded-sm border border-border px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-navy"
                    />
                  </label>
                </>
              )}

              {tarefaAtual.tipo === "texto" && (
                <>
                  <input type="hidden" name="tipo" value="texto" />
                  <label className="flex flex-col gap-1.5 font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Resposta
                    <textarea
                      name="resposta"
                      rows={3}
                      defaultValue={
                        typeof tarefaAtual.resposta === "string"
                          ? tarefaAtual.resposta
                          : ""
                      }
                      required
                      disabled={!podeEditar || salvando}
                      placeholder="Digite uma observação..."
                      className="resize-none rounded-sm border border-border px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-navy"
                    />
                  </label>
                </>
              )}

            </form>
          )}

          {podeEditar && !observando && (
            <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-border pt-6">
              <Button
                type="button"
                variant="danger"
                onClick={() => { setErroObservacao(null); setObservando(true); }}
                disabled={salvando || voltando}
                aria-busy={marcandoNaoFeito || undefined}
                className="min-w-32"
              >
                {marcandoNaoFeito ? "Salvando..." : "Não feito ✕"}
              </Button>
              <Button
                type="submit"
                variant="success"
                form={`tarefa-${tarefaAtual.id}`}
                disabled={salvando || voltando || tarefaAtual.tipo === "foto"}
                aria-busy={persistindo && !marcandoNaoFeito || undefined}
                className="min-w-32"
              >
                {salvando && !marcandoNaoFeito ? "Próxima..." : "Feito ✓"}
              </Button>
            </div>
          )}
          {observando && (
            <form key={`observacao-${tarefaAtual.id}`} onSubmit={naoFeito} className="mt-6 flex flex-col gap-3 rounded-md border border-border p-4">
              <label className="flex flex-col gap-2 font-body text-sm font-semibold text-navy">
                Por que a tarefa não foi feita?
                <textarea
                  name="observacao"
                  defaultValue={tarefaAtual.observacao ?? ""}
                  required
                  autoFocus
                  rows={3}
                  disabled={salvando}
                  className="rounded-sm border border-border px-3 py-2.5 font-body text-sm font-normal text-ink outline-none focus:border-navy"
                />
              </label>
              {erroObservacao && <p role="alert" className="font-body text-sm text-danger-text">{erroObservacao}</p>}
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" variant="outline" disabled={salvando} onClick={() => { setObservando(false); setErroObservacao(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" disabled={salvando}>
                  {marcandoNaoFeito ? "Salvando..." : "Salvar observação e avançar"}
                </Button>
              </div>
            </form>
          )}
          {(revisando || !podeEditar) && !observando && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {indiceAtual > 0 && (
                <Button type="button" variant="outline" onClick={voltar} disabled={salvando || voltando} aria-busy={voltando || undefined}>
                  {voltando ? "Indo..." : "← Tarefa anterior"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setAvancando(true)} disabled={salvando || voltando} aria-busy={avancando || undefined}>
                {avancando ? "Indo..." : "Próxima tarefa →"}
              </Button>
            </div>
          )}
          {!podeEditar && (
            <p className="mt-5 text-center font-body text-xs text-ink-muted">
              Somente leitura — esta execução pertence a outro usuário.
            </p>
          )}
        </section>
      ) : concluidas === tarefas.length ? (
        <div
          role="status"
          className="relative rounded-lg border border-success bg-success-soft px-6 pb-10 pt-16 text-center"
        >
          {tarefas.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={voltar}
              disabled={voltando || reiniciando || salvando}
              aria-busy={voltando || undefined}
              aria-label="Voltar à tarefa anterior"
              className="absolute left-3 top-3 text-success-text"
            >
              {voltando ? "Indo..." : "←"}
            </Button>
          )}
          <CheckMark className="mx-auto mb-3 h-12 w-12 text-success-text" />
          <h2 className="font-display text-2xl font-bold text-success-text">
            Todas as tarefas foram concluídas!
          </h2>
          <p className="mt-2 font-body text-sm text-success-text">
            Revise o progresso e finalize o checklist quando estiver pronto.
          </p>
          {podeEditar && tarefas.length > 0 && (
            <div className="mt-6">
              {confirmarReinicio ? (
                <div role="group" aria-label="Confirmar reset do checklist">
                  <p className="mb-4 font-body text-sm text-success-text">
                    Resetar do começo? Todas as respostas e conclusões serão apagadas. Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button type="button" variant="danger" onClick={reiniciar} disabled={reiniciando || voltando} aria-busy={reiniciando || undefined}>
                      {reiniciando ? "Resetando..." : "Apagar e resetar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setConfirmarReinicio(false)} disabled={reiniciando}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="danger" onClick={() => setConfirmarReinicio(true)} disabled={voltando || salvando}>
                  Resetar checklist
                </Button>
              )}
            </div>
          )}
          {podeFinalizar && !confirmarReinicio && (
            <form action={finalizarExecucao.bind(null, checklistId, execucaoId)} className="mt-6">
              <Button type="submit" loadingText="Finalizando..." className="w-full sm:w-auto">
                Finalizar checklist
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg border border-border bg-surface px-6 py-8 text-center shadow-card"
        >
          <h2 className="font-display text-xl font-bold text-navy">
            Você chegou ao fim das tarefas
          </h2>
          <p className="mt-2 font-body text-sm text-ink-muted">
            {obrigatoriasConcluidas < obrigatorias.length
              ? "Existem tarefas obrigatórias não feitas. Revise e conclua essas tarefas antes de finalizar o checklist."
              : "As tarefas opcionais restantes podem ficar pendentes ao finalizar o checklist."}
          </p>
          {tarefas.length > 0 && (
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={voltar} disabled={voltando || salvando} aria-busy={voltando || undefined}>
                {voltando ? "Indo..." : "← Tarefa anterior"}
              </Button>
            </div>
          )}
          <button
            type="button"
            disabled={salvando || voltando}
            onClick={() => {
              setRevisando(true);
              const primeiraPendente = tarefas.findIndex(
                (tarefa) => !tarefa.concluida
              );
              setIndiceAtual(
                primeiraPendente === -1 ? tarefas.length : primeiraPendente
              );
            }}
            className="mt-4 font-body text-sm font-semibold text-navy underline"
          >
            Revisar tarefas pendentes
          </button>
          {podeFinalizar && (
            <form action={finalizarExecucao.bind(null, checklistId, execucaoId)} className="mt-4">
              <Button type="submit" loadingText="Finalizando..." className="w-full sm:w-auto">
                Finalizar checklist
              </Button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
