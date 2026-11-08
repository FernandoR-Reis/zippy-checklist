"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { excluirChecklist } from "@/lib/checklists/actions";
import { Button } from "@/components/ui/Button";

function ConfirmationButtons({ cancelar }: { cancelar: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <Button type="button" variant="outline" disabled={pending} onClick={cancelar}>
        Cancelar
      </Button>
      <Button type="submit" variant="danger" loadingText="Excluindo...">
        Excluir definitivamente
      </Button>
    </div>
  );
}

export function DeleteChecklistButton({
  unidadeId,
  checklistId,
  nome,
}: {
  unidadeId: string;
  checklistId: string;
  nome: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="px-3 py-2 text-xs text-danger-text"
        onClick={() => dialog.current?.showModal()}
      >
        Excluir checklist
      </Button>
      <dialog
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        aria-labelledby={`excluir-checklist-${checklistId}`}
        aria-describedby={`excluir-checklist-aviso-${checklistId}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-surface p-6 text-ink shadow-pop backdrop:bg-navy-deep/55"
      >
        <h2 id={`excluir-checklist-${checklistId}`} className="font-display text-xl font-bold text-navy">
          Excluir checklist?
        </h2>
        <p className="mt-3 break-words font-body text-sm">
          Você está prestes a excluir <strong>{nome}</strong>.
        </p>
        <p id={`excluir-checklist-aviso-${checklistId}`} className="mt-3 font-body text-sm text-ink-muted">
          Todas as tarefas e o histórico de execuções deste checklist serão apagados permanentemente.
          Esta ação não pode ser desfeita. Para manter o histórico, cancele e desative o checklist.
        </p>
        <form action={excluirChecklist.bind(null, unidadeId, checklistId)}>
          <input type="hidden" name="confirmar" value="excluir" />
          <ConfirmationButtons cancelar={() => dialog.current?.close()} />
        </form>
      </dialog>
    </>
  );
}
