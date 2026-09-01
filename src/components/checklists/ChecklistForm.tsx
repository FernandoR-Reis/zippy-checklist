"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ChecklistTemplate, Setor, Usuario } from "@/types/database";

const frequencias = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
] as const;

export function ChecklistForm({ action, setores, usuarios, checklist, erro, submitLabel }: { action: (data: FormData) => void | Promise<void>; setores: Setor[]; usuarios: Usuario[]; checklist?: ChecklistTemplate; erro?: string; submitLabel: string }) {
  const [tarefasPendentes, setTarefasPendentes] = useState(0);
  const [aviso, setAviso] = useState(false);
  const select = "font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy";

  useEffect(() => {
    const atualizar = (event: Event) => setTarefasPendentes((event as CustomEvent<number>).detail);
    window.addEventListener("tarefas-pendentes", atualizar);
    return () => window.removeEventListener("tarefas-pendentes", atualizar);
  }, []);

  function salvar(event: FormEvent<HTMLFormElement>) {
    if (tarefasPendentes === 0) return;
    event.preventDefault();
    setAviso(true);
  }

  return (
    <>
    <form action={action} onSubmit={salvar} className="flex flex-col gap-4 max-w-lg">
      {erro && <div className="rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">{erro}</div>}
      <Input label="Nome do checklist" name="nome" defaultValue={checklist?.nome} placeholder="Ex.: Abertura da Cozinha" required />
      <label className="flex flex-col gap-1.5"><span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Descrição (opcional)</span><textarea name="descricao" defaultValue={checklist?.descricao ?? ""} rows={2} className={`${select} resize-none`} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5"><span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Setor</span><select name="setor_id" defaultValue={checklist?.setor_id ?? ""} required className={select}><option value="" disabled>Selecione</option>{setores.map((setor) => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}</select></label>
        <label className="flex flex-col gap-1.5"><span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Responsável</span><select name="responsavel_id" defaultValue={checklist?.responsavel_id ?? ""} required className={select}><option value="" disabled>Selecione</option>{usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5"><span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Frequência</span><select name="recorrencia" defaultValue={checklist?.recorrencia ?? "diaria"} className={select}>{frequencias.map((frequencia) => <option key={frequencia.value} value={frequencia.value}>{frequencia.label}</option>)}</select></label>
        <Input label="Horário" name="horario" type="time" defaultValue={checklist?.horario?.slice(0, 5) ?? ""} required />
      </div>
      <Button type="submit" className="self-start">{submitLabel}</Button>
    </form>
    {aviso && <div className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/45 px-6" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="aviso-titulo" className="modal-panel-enter w-full max-w-sm rounded-md bg-surface p-6 shadow-pop">
        <h2 id="aviso-titulo" className="font-display font-bold text-xl text-navy mb-2">Tarefas ainda não salvas</h2>
        <p className="font-body text-sm text-ink-muted mb-5">Salve as tarefas adicionadas antes de salvar as alterações do checklist.</p>
        <button type="button" onClick={() => setAviso(false)} className="w-full rounded-md bg-orange px-4 py-2.5 font-body font-semibold text-sm text-white">
          Entendi, vou salvar as tarefas
        </button>
      </div>
    </div>}
    </>
  );
}
