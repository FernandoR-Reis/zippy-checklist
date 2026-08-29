"use client";

import { useState } from "react";
import Link from "next/link";
import type { TarefaTemplate } from "@/types/database";

export function ExecutionTasks({ tarefas }: { tarefas: TarefaTemplate[] }) {
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const total = tarefas.length;
  const progresso = total ? Math.round((concluidas.length / total) * 100) : 0;

  function alternar(id: string) {
    setConcluidas((atuais) => (atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3 font-mono text-xs text-ink-muted">
        <span>Progresso</span>
        <span>{concluidas.length}/{total} concluídas</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden mb-6">
        <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progresso}%` }} />
      </div>
      <div className="flex flex-col gap-3">
        {tarefas.map((tarefa) => {
          const concluida = concluidas.includes(tarefa.id);
          return (
            <label key={tarefa.id} className={`flex items-center gap-3 rounded-md border px-4 py-4 cursor-pointer transition ${concluida ? "bg-success-soft border-success" : "bg-surface border-border"}`}>
              <input type="checkbox" checked={concluida} onChange={() => alternar(tarefa.id)} className="h-5 w-5 accent-orange" />
              <span className={`font-body text-sm text-ink ${concluida ? "line-through text-ink-muted" : ""}`}>{tarefa.titulo}</span>
            </label>
          );
        })}
      </div>
      {total > 0 && concluidas.length === total && (
        <div className="mt-6 flex flex-col items-start gap-3 text-success-text text-sm font-body">
          <Link href="/hoje" className="inline-flex w-fit items-center gap-2 rounded-md bg-success text-white font-semibold px-4 py-2">
            <span aria-hidden="true">←</span>
            check list concluido
          </Link>
        </div>
      )}
    </>
  );
}