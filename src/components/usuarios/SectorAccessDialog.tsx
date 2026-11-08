"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface SetorDisponivel {
  id: string;
  nome: string;
  unidadeNome: string;
}

export function SectorAccessDialog({
  usuarioId,
  usuarioNome,
  setores,
  setoresSelecionados,
  action,
}: {
  usuarioId: string;
  usuarioNome: string;
  setores: SetorDisponivel[];
  setoresSelecionados: string[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(setoresSelecionados),
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (
      searchParams.get("sucesso") === "setores" &&
      searchParams.get("usuarioId") === usuarioId
    ) {
      setSelecionados(new Set(setoresSelecionados));
      setAberto(false);
      router.replace("/usuarios?sucesso=setores", { scroll: false });
    }
  }, [router, searchParams, setoresSelecionados, usuarioId]);

  useEffect(() => {
    if (!aberto) return;

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelecionados(new Set(setoresSelecionados));
        setAberto(false);
      }
    }

    window.addEventListener("keydown", fecharComEscape);
    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [aberto, setoresSelecionados]);

  const grupos = setores.reduce<Map<string, SetorDisponivel[]>>((resultado, setor) => {
    const grupo = resultado.get(setor.unidadeNome) ?? [];
    grupo.push(setor);
    resultado.set(setor.unidadeNome, grupo);
    return resultado;
  }, new Map());
  const setoresSalvos = setores.filter((setor) => setoresSelecionados.includes(setor.id));
  const resumo = setoresSalvos.slice(0, 2);

  function alternarSetor(setorId: string) {
    setSelecionados((atuais) => {
      const novos = new Set(atuais);
      if (novos.has(setorId)) novos.delete(setorId);
      else novos.add(setorId);
      return novos;
    });
  }

  function fechar() {
    setSelecionados(new Set(setoresSelecionados));
    setAberto(false);
  }

  function abrir() {
    setSelecionados(new Set(setoresSelecionados));
    setAberto(true);
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {setoresSalvos.length ? (
            <>
              {resumo.map((setor) => (
                <span
                  key={setor.id}
                  className="max-w-full break-words rounded-full bg-orange/10 px-3 py-1 font-body text-xs font-medium text-orange"
                >
                  {setor.nome}
                </span>
              ))}
              {setoresSalvos.length > resumo.length && (
                <span className="font-body text-xs text-ink-muted">
                  +{setoresSalvos.length - resumo.length}
                </span>
              )}
            </>
          ) : (
            <span className="font-body text-sm text-ink-muted">
              Nenhum setor vinculado
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={abrir}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 font-body text-sm font-semibold text-navy transition-colors hover:border-navy hover:bg-navy/5 focus:outline-none focus:ring-2 focus:ring-orange/40"
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-controls={`setores-dialog-${usuarioId}`}
        >
          {setoresSalvos.length ? "Editar setores" : "Selecionar setores"}
          <span className="rounded-full bg-navy/5 px-2 py-0.5 font-mono text-xs">
            {setoresSalvos.length}
          </span>
        </button>
      </div>

      {aberto && (
        <div
          className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fechar();
          }}
        >
          <section
            id={`setores-dialog-${usuarioId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`setores-titulo-${usuarioId}`}
            className="modal-panel-enter flex max-h-[min(85dvh,720px)] w-full max-w-xl flex-col overflow-y-auto rounded-lg bg-surface shadow-pop"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
              <div className="min-w-0 break-words">
                <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-muted">
                  Acesso da equipe
                </p>
                <h2
                  id={`setores-titulo-${usuarioId}`}
                  className="font-display text-xl font-bold text-navy"
                >
                  Acesso de {usuarioNome}
                </h2>
                <p className="mt-1 font-body text-sm text-ink-muted">
                  Selecione onde este colaborador poderá ver e iniciar checklists.
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                className="shrink-0 rounded-md p-2 text-ink-muted hover:bg-navy/5 hover:text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
                aria-label="Fechar seleção de setores"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </header>

            <form action={action} className="flex min-h-0 flex-1 flex-col">
              <div className="overflow-y-auto px-5 py-5 sm:px-6">
                {!setores.length ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                    <p className="font-display font-semibold text-navy">
                      Nenhum setor disponível
                    </p>
                    <p className="mt-1 font-body text-sm text-ink-muted">
                      Cadastre setores ativos antes de vincular colaboradores.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {[...grupos.entries()].map(([unidadeNome, setoresDaUnidade]) => (
                      <fieldset key={unidadeNome}>
                        <legend className="mb-2 max-w-full break-words font-mono text-xs font-semibold uppercase tracking-wide text-ink-muted">
                          {unidadeNome}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {setoresDaUnidade.map((setor) => {
                            const marcado = selecionados.has(setor.id);
                            return (
                              <label
                                key={setor.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 transition-colors ${
                                  marcado
                                    ? "border-orange/50 bg-orange/10"
                                    : "border-border bg-white hover:border-navy/30 hover:bg-navy/5"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  name="setor_ids"
                                  value={setor.id}
                                  checked={marcado}
                                  onChange={() => alternarSetor(setor.id)}
                                  className="h-4 w-4 shrink-0 accent-orange"
                                />
                                <span className="min-w-0 break-words font-body text-sm font-medium text-navy">
                                  {setor.nome}
                                </span>
                                {marcado && (
                                  <span className="ml-auto shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-orange">
                                    Acesso
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                )}
              </div>

              <footer className="flex shrink-0 flex-col items-start gap-3 border-t border-border px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
                <span className="font-body text-sm text-ink-muted">
                  {selecionados.size} {selecionados.size === 1 ? "setor selecionado" : "setores selecionados"}
                </span>
                <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                  <Button type="button" variant="outline" onClick={fechar}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!setores.length}>
                    Salvar seleção
                  </Button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
