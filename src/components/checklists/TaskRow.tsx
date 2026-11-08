"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { excluirTarefa, moverTarefa, reordenarTarefa } from "@/lib/tarefas/actions";
import type { TarefaTemplate, TipoTarefa } from "@/types/database";

const labels: Record<TipoTarefa, string> = { checkbox: "Checkbox", sim_nao: "Sim / Não", numero: "Número", texto: "Texto", foto: "Foto" };

export function TaskRow({
  unidadeId,
  checklistId,
  tarefa,
  primeira,
  ultima,
  podeGerenciar,
}: {
  unidadeId: string;
  checklistId: string;
  tarefa: TarefaTemplate;
  primeira: boolean;
  ultima: boolean;
  podeGerenciar: boolean;
}) {
  const [excluindo, setExcluindo] = useState(false);
  const [removida, setRemovida] = useState(false);
  const [erro, setErro] = useState("");
  const [posiçãoAlvo, setPosiçãoAlvo] = useState<"antes" | "depois" | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const router = useRouter();

  if (removida) return null;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!podeGerenciar || reordenando) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosiçãoAlvo(event.clientY > bounds.top + bounds.height / 2 ? "depois" : "antes");
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setPosiçãoAlvo(null);

    const tarefaArrastadaId = event.dataTransfer.getData("text/plain");
    if (!podeGerenciar || !tarefaArrastadaId || tarefaArrastadaId === tarefa.id || reordenando) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const posição = event.clientY > bounds.top + bounds.height / 2 ? "depois" : "antes";

    setReordenando(true);
    setErro("");

    try {
      const resultado = await reordenarTarefa(
        unidadeId,
        checklistId,
        tarefaArrastadaId,
        tarefa.id,
        posição,
      );
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível reordenar as tarefas. Tente novamente.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Falha ao reordenar tarefas:", error);
      setErro("Não foi possível reordenar as tarefas. Tente novamente.");
    } finally {
      setReordenando(false);
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (excluindo) return;

    setExcluindo(true);
    setErro("");
    setRemovida(true);

    try {
      const resultado = await excluirTarefa(unidadeId, checklistId, tarefa.id);
      if (!resultado.ok) {
        setRemovida(false);
        setErro(resultado.error ?? "Não foi possível excluir a tarefa. Tente novamente.");
      }
    } catch (error) {
      console.error("Falha ao excluir tarefa:", error);
      setRemovida(false);
      setErro("Não foi possível excluir a tarefa. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setPosiçãoAlvo(null)}
      onDrop={handleDrop}
      className={posiçãoAlvo === "antes" ? "border-t-2 border-navy" : posiçãoAlvo === "depois" ? "border-b-2 border-navy" : ""}
    >
      <div className="flex items-center gap-3 bg-surface border border-border rounded-sm px-4 py-3">
        {podeGerenciar ? (
          <button
            type="button"
            draggable={!reordenando}
            aria-label={`Arrastar para reordenar: ${tarefa.titulo}`}
            title="Arraste para reordenar"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", tarefa.id);
            }}
            onDragEnd={() => setPosiçãoAlvo(null)}
            className="cursor-grab touch-none text-ink-muted font-mono text-sm active:cursor-grabbing"
          >
            ☰
          </button>
        ) : (
          <span className="text-ink-muted font-mono text-sm">☰</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-body font-medium text-sm text-ink truncate">{tarefa.titulo}</div>
          <div className="font-mono text-[11px] text-ink-muted mt-0.5">
            {labels[tarefa.tipo]}{tarefa.obrigatoria ? " · obrigatória" : ""}
          </div>
        </div>
        {podeGerenciar && (
          <div className="flex items-center gap-2 shrink-0">
            <form action={moverTarefa.bind(null, unidadeId, checklistId, tarefa.id, "cima")}>
              <button type="submit" disabled={primeira} aria-label="Mover para cima">↑</button>
            </form>
            <form action={moverTarefa.bind(null, unidadeId, checklistId, tarefa.id, "baixo")}>
              <button type="submit" disabled={ultima} aria-label="Mover para baixo">↓</button>
            </form>
            <a
              href={`/unidades/${unidadeId}/checklists/${checklistId}?editarTarefa=${tarefa.id}`}
              className="font-body font-semibold text-xs text-navy"
            >
              Editar
            </a>
            <form onSubmit={handleDelete}>
              <button
                type="submit"
                disabled={excluindo}
                aria-busy={excluindo}
                className="font-body font-semibold text-xs text-danger-text"
              >
                Excluir
              </button>
            </form>
          </div>
        )}
      </div>
      {erro && <p role="alert" className="mt-1 font-body text-xs text-danger-text">{erro}</p>}
    </div>
  );
}