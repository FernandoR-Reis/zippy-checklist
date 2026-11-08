import type { TarefaExecucao } from "@/types/database";

type SituacaoTarefa = Pick<TarefaExecucao, "concluida" | "observacao">;

export function tarefaNaoFeita(tarefa: SituacaoTarefa): boolean {
  return !tarefa.concluida && Boolean(tarefa.observacao?.trim());
}

export function tarefaResolvida(tarefa: SituacaoTarefa): boolean {
  return tarefa.concluida || tarefaNaoFeita(tarefa);
}
