"use client";

import { useState } from "react";

const tipos = [
  ["checkbox", "Checkbox"],
  ["sim_nao", "Sim / Não"],
  ["numero", "Número"],
  ["texto", "Texto"],
] as const;

export function BulkTaskFields() {
  const [quantidade, setQuantidade] = useState(1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <select name="tipo" aria-label="Tipo da tarefa 1" defaultValue="checkbox" className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy">
          {tipos.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label className="flex items-center gap-2 font-body text-sm text-ink">
          <input type="checkbox" name="obrigatoria-0" defaultChecked />
          Obrigatória
        </label>
      </div>
      {Array.from({ length: quantidade - 1 }, (_, index) => {
        const numero = index + 1;
        return (
          <div key={numero} className="border border-border rounded-sm p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-ink-muted">Tarefa {numero + 1}</span>
              <button type="button" onClick={() => setQuantidade((total) => total - 1)} className="font-body text-xs text-danger-text">
                Remover
              </button>
            </div>
            <input name="titulo" aria-label={`Título da tarefa ${numero + 1}`} placeholder="Ex.: Conferir gás" required className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy" />
            <div className="flex items-center gap-3">
              <select name="tipo" aria-label={`Tipo da tarefa ${numero + 1}`} defaultValue="checkbox" className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy">
                {tipos.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <label className="flex items-center gap-2 font-body text-sm text-ink"><input type="checkbox" name={`obrigatoria-${numero}`} defaultChecked />Obrigatória</label>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={() => setQuantidade((total) => total + 1)} className="self-start font-body font-semibold text-sm text-navy">
        + Adicionar outra tarefa
      </button>
    </div>
  );
}