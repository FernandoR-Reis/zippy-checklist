"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { TipoTarefa } from "@/types/database";

type TarefaPendente = {
  id: number;
  titulo: string;
  tipo: TipoTarefa;
  obrigatoria: boolean;
};

const tipos: { value: TipoTarefa; label: string }[] = [
  { value: "checkbox", label: "Checkbox" },
  { value: "sim_nao", label: "Sim / Não" },
  { value: "numero", label: "Número" },
  { value: "texto", label: "Texto" },
];

export function BulkTaskForm({ action, erro }: { action: (formData: FormData) => void | Promise<void>; erro?: string }) {
  const [tarefas, setTarefas] = useState<TarefaPendente[]>([]);
  const [proximoId, setProximoId] = useState(1);
  const tituloRef = useRef<HTMLInputElement>(null);
  const tipoRef = useRef<HTMLSelectElement>(null);
  const obrigatoriaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("tarefas-pendentes", { detail: tarefas.length }));
    return () => {
      window.dispatchEvent(new CustomEvent("tarefas-pendentes", { detail: 0 }));
    };
  }, [tarefas.length]);

  function adicionarTarefa() {
    const titulo = tituloRef.current?.value.trim() ?? "";
    const tipo = (tipoRef.current?.value ?? "checkbox") as TipoTarefa;
    const obrigatoria = obrigatoriaRef.current?.checked ?? true;
    if (!titulo) {
      tituloRef.current?.focus();
      return;
    }
    setTarefas((atuais) => [...atuais, { id: proximoId, titulo, tipo, obrigatoria }]);
    setProximoId((id) => id + 1);
    if (tituloRef.current) tituloRef.current.value = "";
    if (tipoRef.current) tipoRef.current.value = "checkbox";
    if (obrigatoriaRef.current) obrigatoriaRef.current.checked = true;
    tituloRef.current?.focus();
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {erro && <div className="rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">{erro}</div>}
      <div className="sticky top-2 z-10 rounded-sm border border-border bg-surface p-3 shadow-card">
        <div className="font-mono text-xs text-ink-muted mb-3">Próxima tarefa</div>
        <div className="flex flex-col gap-3">
          <input ref={tituloRef} aria-label="Título da próxima tarefa" placeholder="Ex.: Conferir gás" className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy" />
          <div className="flex flex-wrap items-center gap-3">
            <select ref={tipoRef} aria-label="Tipo da próxima tarefa" defaultValue="checkbox" className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy">
              {tipos.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
            </select>
            <label className="flex items-center gap-2 font-body text-sm text-ink"><input ref={obrigatoriaRef} type="checkbox" defaultChecked />Obrigatória</label>
            <button type="button" onClick={adicionarTarefa} className="font-body font-semibold text-sm text-navy">+ Adicionar à lista</button>
          </div>
        </div>
      </div>
      {tarefas.length > 0 && <div className="flex flex-col gap-2">
        <div className="font-mono text-xs text-ink-muted">Tarefas adicionadas: {tarefas.length}</div>
        {tarefas.map((tarefa, index) => <div key={tarefa.id} className="flex items-center justify-between gap-3 border border-border rounded-sm px-3 py-2"><div className="min-w-0"><input type="hidden" name="titulo" value={tarefa.titulo} /><input type="hidden" name="tipo" value={tarefa.tipo} /><input type="hidden" name={`obrigatoria-${index}`} value={tarefa.obrigatoria ? "on" : ""} /><div className="font-body text-sm font-medium text-ink truncate">{tarefa.titulo}</div><div className="font-mono text-[11px] text-ink-muted">{tipos.find((tipo) => tipo.value === tarefa.tipo)?.label}{tarefa.obrigatoria ? " · obrigatória" : ""}</div></div><button type="button" onClick={() => setTarefas((atuais) => atuais.filter((item) => item.id !== tarefa.id))} className="shrink-0 font-body text-xs text-danger-text">Remover</button></div>)}
      </div>}
      <div className="flex gap-3"><Button type="submit" disabled={tarefas.length === 0}>Salvar tarefas</Button><a href="." className="font-body font-semibold text-sm text-ink-muted px-2 py-2.5">Cancelar</a></div>
    </form>
  );
}
