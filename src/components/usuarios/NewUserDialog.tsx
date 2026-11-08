"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Unidade } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function NewUserDialog({
  unidades,
  ehAdministrador,
  unidadeNome,
  action,
}: {
  unidades: Unidade[];
  ehAdministrador: boolean;
  unidadeNome: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("erro") || searchParams.get("sucesso") === "convite") {
      dialog.current?.close();
    }
  }, [searchParams]);

  return (
    <>
      <Button
        type="button"
        className="shrink-0"
        aria-haspopup="dialog"
        aria-controls="novo-usuario-dialog"
        onClick={() => dialog.current?.showModal()}
      >
        Novo usuário
      </Button>
      <dialog
        ref={dialog}
        id="novo-usuario-dialog"
        aria-labelledby="novo-usuario-titulo"
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg bg-surface p-0 text-ink shadow-pop backdrop:bg-navy-deep/55"
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2
              id="novo-usuario-titulo"
              className="font-display text-xl font-bold text-navy"
            >
              Convidar usuário
            </h2>
            <button
              type="button"
              aria-label="Fechar convite"
              className="rounded-md p-2 text-ink-muted hover:bg-navy/5 hover:text-navy"
              onClick={() => dialog.current?.close()}
            >
              ✕
            </button>
          </div>
          <form action={action} className="flex flex-col gap-4">
            <Input label="Nome" name="nome" required />
            <Input label="E-mail" name="email" type="email" required />
            <label className="flex flex-col gap-1.5">
              <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">
                Perfil
              </span>
              <select
                name="perfil"
                className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy"
              >
                <option value="operacional">Operacional</option>
                {ehAdministrador && (
                  <>
                    <option value="gestor">Gestor</option>
                    <option value="administrador">Administrador</option>
                  </>
                )}
              </select>
            </label>
            {ehAdministrador ? (
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">
                  Unidade
                </span>
                <select
                  name="unidade_id"
                  defaultValue={unidades[0]?.id ?? ""}
                  className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy"
                >
                  <option value="">Selecione para Gestor ou Operacional</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
                <span className="font-body text-xs text-ink-muted">
                  Obrigatória para Gestores e Operacionais.
                </span>
              </label>
            ) : (
              <p className="font-body text-xs text-ink-muted">
                O usuário será vinculado à sua unidade: {unidadeNome}.
              </p>
            )}
            <Button type="submit" className="self-start" loadingText="Enviando convite...">
              Enviar convite
            </Button>
          </form>
        </div>
      </dialog>
    </>
  );
}
