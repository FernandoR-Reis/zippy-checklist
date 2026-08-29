import { alternarTarefaCheckbox, responderTarefa } from "@/lib/execucoes/actions";
import { CheckMark } from "@/components/ui/CheckMark";
import type { TarefaExecucao } from "@/types/database";

export function ExecutionTasks({ checklistId, execucaoId, tarefas, podeEditar }: { checklistId: string; execucaoId: string; tarefas: TarefaExecucao[]; podeEditar: boolean }) {
  const concluidas = tarefas.filter((tarefa) => tarefa.concluida).length;
  const progresso = tarefas.length ? Math.round((concluidas / tarefas.length) * 100) : 0;
  return <>
    <div className="flex items-center justify-between mb-3 font-mono text-xs text-ink-muted"><span>Progresso</span><span>{concluidas}/{tarefas.length} concluídas</span></div>
    <div className="h-2 rounded-full bg-border overflow-hidden mb-6"><div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progresso}%` }} /></div>
    <div className="flex flex-col gap-3">{tarefas.map((tarefa) => <TaskRow key={tarefa.id} checklistId={checklistId} execucaoId={execucaoId} tarefa={tarefa} podeEditar={podeEditar} />)}</div>
  </>;
}

function TaskRow({ checklistId, execucaoId, tarefa, podeEditar }: { checklistId: string; execucaoId: string; tarefa: TarefaExecucao; podeEditar: boolean }) {
  if (tarefa.tipo === "checkbox") return <form id={`tarefa-${tarefa.id}`} action={alternarTarefaCheckbox.bind(null, checklistId, execucaoId, tarefa.id, !tarefa.concluida)} className="scroll-mt-24"><button type="submit" disabled={!podeEditar} className={`w-full flex items-center gap-3 rounded-md border px-4 py-4 text-left transition disabled:opacity-70 ${tarefa.concluida ? "bg-success-soft border-success" : "bg-surface border-border"}`}><span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${tarefa.concluida ? "bg-success border-success" : "border-border"}`}>{tarefa.concluida && <CheckMark className="w-5 h-5 text-white" />}</span><span className={`font-body text-sm text-ink ${tarefa.concluida ? "line-through text-ink-muted" : ""}`}>{tarefa.titulo}{tarefa.obrigatoria && !tarefa.concluida && <span className="text-danger-text ml-1">*</span>}</span></button></form>;
  return <div id={`tarefa-${tarefa.id}`} className="bg-surface border border-border rounded-sm p-4 scroll-mt-24"><div className="font-body text-sm font-medium text-ink mb-3">{tarefa.titulo}{tarefa.obrigatoria && !tarefa.concluida && <span className="text-danger-text ml-1">*</span>}</div>
    {tarefa.tipo === "sim_nao" && <div className="flex gap-3">{(["sim", "nao"] as const).map((valor) => <form key={valor} action={responderTarefa.bind(null, checklistId, execucaoId, tarefa.id)} className="flex-1"><input type="hidden" name="tipo" value="sim_nao" /><input type="hidden" name="resposta" value={valor} /><button type="submit" disabled={!podeEditar} className={`w-full font-body font-semibold text-sm rounded-md px-4 py-2.5 border-2 transition disabled:opacity-70 ${tarefa.resposta === valor ? "bg-navy border-navy text-white" : "bg-surface border-border text-ink-muted"}`}>{valor === "sim" ? "Sim" : "Não"}</button></form>)}</div>}
    {tarefa.tipo === "numero" && <form action={responderTarefa.bind(null, checklistId, execucaoId, tarefa.id)} className="flex gap-2"><input type="hidden" name="tipo" value="numero" /><input type="number" step="any" inputMode="decimal" name="resposta" defaultValue={typeof tarefa.resposta === "number" ? tarefa.resposta : ""} disabled={!podeEditar} className="flex-1 font-mono text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy" /><button type="submit" disabled={!podeEditar} className="font-body font-semibold text-sm bg-orange text-white rounded-md px-4 disabled:opacity-70">Salvar</button></form>}
    {tarefa.tipo === "texto" && <form action={responderTarefa.bind(null, checklistId, execucaoId, tarefa.id)} className="flex flex-col gap-2"><input type="hidden" name="tipo" value="texto" /><textarea name="resposta" rows={2} defaultValue={typeof tarefa.resposta === "string" ? tarefa.resposta : ""} disabled={!podeEditar} placeholder="Digite uma observação..." className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy resize-none" /><button type="submit" disabled={!podeEditar} className="self-start font-body font-semibold text-sm bg-orange text-white rounded-md px-4 py-2 disabled:opacity-70">Salvar</button></form>}
    {tarefa.concluida && <div className="flex items-center gap-1 font-mono text-[11px] text-success-text mt-2"><CheckMark className="w-3 h-3" /> respondida</div>}
  </div>;
}
