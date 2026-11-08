"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PerfilUsuario, Unidade, Usuario } from "@/types/database";
import { Button } from "@/components/ui/Button";

export function UserEditDialog({
  usuario,
  unidades,
  podeEditarPerfil,
  action,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  podeEditarPerfil: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilUsuario>(usuario.perfil);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (
      searchParams.get("sucesso") === "usuario" &&
      searchParams.get("usuarioId") === usuario.id
    ) {
      setAberto(false);
      router.replace("/usuarios?sucesso=usuario", { scroll: false });
    }
  }, [router, searchParams, usuario.id]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 px-3 py-2 text-xs"
        onClick={() => {
          setPerfil(usuario.perfil);
          setAberto(true);
        }}
      >
        Editar
      </Button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/55 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAberto(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`editar-usuario-${usuario.id}`}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-lg bg-surface p-5 shadow-pop sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`editar-usuario-${usuario.id}`}
                  className="font-display text-xl font-bold text-navy"
                >
                  Editar usuário
                </h2>
                <p className="mt-1 font-body text-sm text-ink-muted">
                  Atualize nome, perfil e unidade.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-md p-2 text-ink-muted hover:bg-navy/5 hover:text-navy"
                aria-label="Fechar edição"
              >
                ✕
              </button>
            </div>

            <form action={action} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Nome
                </span>
                <input
                  name="nome"
                  defaultValue={usuario.nome}
                  required
                  maxLength={120}
                  className="rounded-sm border border-border px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-navy"
                />
              </label>

              {podeEditarPerfil ? (
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Perfil
                  </span>
                  <select
                    name="perfil"
                    value={perfil}
                    onChange={(event) => setPerfil(event.target.value as PerfilUsuario)}
                    className="rounded-sm border border-border px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-navy"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="gestor">Gestor</option>
                    <option value="operacional">Operacional</option>
                  </select>
                </label>
              ) : (
                <input type="hidden" name="perfil" value="operacional" />
              )}

              {perfil !== "administrador" && (
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Unidade
                  </span>
                  <select
                    name="unidade_id"
                    defaultValue={usuario.unidade_id ?? ""}
                    required
                    disabled={!podeEditarPerfil}
                    className="rounded-sm border border-border px-3 py-2.5 font-body text-sm text-ink outline-none focus:border-navy disabled:bg-navy/5"
                  >
                    <option value="" disabled>
                      Selecione uma unidade
                    </option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar alterações</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
