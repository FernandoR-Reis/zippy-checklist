"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const tipos = [
  ["checkbox", "Checkbox"],
  ["sim_nao", "Sim / Não"],
  ["numero", "Número"],
  ["texto", "Texto"],
] as const;

export function BulkTaskForm({ action, erro }: { action: (formData: FormData) => void | Promise<void>; erro?: string }) {
  const [quantidade, setQuantidade] = useState(1);

  return (
    <form action={action} className="flex flex-col gap-4">
      {erro && <div className="rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">{erro}</div>}
      <div className="flex flex-col gap-3">
        {Array.from({ length: quantidade }, (_, index) => (
          <div key={index} className="border border-border rounded-sm p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-ink-muted">Tarefa {index + 1}</span>
              {quantidade > 1 && <button type="button" onClick={() => setQuantidade((total) => total - 1)} className="font-body text-xs text-danger-text">Remover</button>}
            </div>
            <input name="titulo" aria-label={`Título da tarefa ${index + 1}`} placeholder="Ex.: Conferir gás" required autoFocus={index === 0} className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy" />
            <div className="flex items-center gap-3">
              <select name="tipo" aria-label={`Tipo da tarefa ${index + 1}`} defaultValue="checkbox" className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy">{tipos.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <label className="flex items-center gap-2 font-body text-sm text-ink"><input type="checkbox" name={`obrigatoria-${index}`} defaultChecked />Obrigatória</label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setQuantidade((total) => total + 1)} className="self-start font-body font-semibold text-sm text-navy">+ Adicionar outra tarefa</button>
      <div className="flex gap-3"><Button type="submit">Salvar tarefas</Button><a href="." className="font-body font-semibold text-sm text-ink-muted px-2 py-2.5">Cancelar</a></div>
    </form>
  );
}