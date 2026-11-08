"use client";

import { useEffect, useId, useRef, useState } from "react";

const horas = Array.from({ length: 24 }, (_, indice) => String(indice).padStart(2, "0"));
const minutos = Array.from({ length: 60 }, (_, indice) => String(indice).padStart(2, "0"));

export function TimePicker({
  label,
  name,
  defaultValue = "",
  value,
  onChange,
  required = false,
  size = "default",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  size?: "default" | "compact";
}) {
  const id = useId();
  const [valorInterno, setValorInterno] = useState(defaultValue);
  const valor = value ?? valorInterno;
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const [hora, minuto] = valor.split(":");

  useEffect(() => {
    if (!aberto) return;
    const selecionados = painel.current?.querySelectorAll<HTMLInputElement>("input:checked");
    selecionados?.forEach((input) => {
      const linha = input.parentElement;
      const coluna = linha?.parentElement;
      if (linha && coluna) {
        coluna.scrollTop = linha.offsetTop - (coluna.clientHeight - linha.clientHeight) / 2;
      }
    });
    selecionados?.[0]?.focus({ preventScroll: true });

    const fecharFora = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !raiz.current?.contains(evento.target)) {
        setAberto(false);
      }
    };
    document.addEventListener("pointerdown", fecharFora);
    return () => document.removeEventListener("pointerdown", fecharFora);
  }, [aberto]);

  function fechar() {
    setAberto(false);
    gatilho.current?.focus();
  }

  function selecionar(novoValor: string) {
    setValorInterno(novoValor);
    setErro(false);
    onChange?.(novoValor);
  }

  return (
    <div
      ref={raiz}
      className={`flex min-w-0 flex-col font-body ${size === "compact" ? "gap-1.5" : "gap-2"}`}
      onBlur={(evento) => {
        if (evento.relatedTarget instanceof Node && !evento.currentTarget.contains(evento.relatedTarget)) {
          setAberto(false);
        }
      }}
      onKeyDown={(evento) => {
        if (aberto && evento.key === "Escape") {
          evento.preventDefault();
          fechar();
        }
      }}
    >
      <span
        id={`${id}-label`}
        className={`text-xs text-ink-muted ${size === "compact" ? "font-medium uppercase tracking-wide" : "font-semibold"}`}
      >
        {label}
      </span>
      <input
        type={required ? "text" : "hidden"}
        name={name}
        value={valor}
        required={required}
        tabIndex={-1}
        aria-label={label}
        className="sr-only"
        onChange={(evento) => selecionar(evento.target.value)}
        onInvalid={(evento) => {
          evento.preventDefault();
          setErro(true);
          setAberto(true);
          gatilho.current?.focus();
        }}
      />
      <button
        ref={gatilho}
        type="button"
        aria-labelledby={`${id}-label ${id}-valor`}
        aria-expanded={aberto}
        aria-controls={`${id}-painel`}
        aria-invalid={erro || undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onClick={() => setAberto((atual) => !atual)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3 outline-none transition focus-visible:border-navy focus-visible:ring-2 focus-visible:ring-navy/10 ${size === "compact" ? "h-10 text-sm text-ink" : "py-3 text-lg text-navy sm:text-xl"}`}
      >
        <span id={`${id}-valor`} className="tabular-nums">{valor || "Selecione"}</span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-xs text-danger-text">
          Selecione um horário.
        </p>
      )}
      {aberto ? (
        <div ref={painel} id={`${id}-painel`} className="rounded-sm border border-border bg-surface p-2 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            {[
              { titulo: "Horas", parte: "hora", opcoes: horas, selecionado: hora },
              { titulo: "Minutos", parte: "minuto", opcoes: minutos, selecionado: minuto },
            ].map(({ titulo, parte, opcoes, selecionado }) => (
              <div key={parte} className="min-w-0">
                <p id={`${id}-${parte}-label`} className="mb-2 text-center text-xs font-medium text-ink-muted">{titulo}</p>
                <div
                  role="radiogroup"
                  aria-labelledby={`${id}-label ${id}-${parte}-label`}
                  className="relative flex max-h-48 flex-col gap-1 overflow-y-auto overscroll-contain"
                >
                  {opcoes.map((opcao) => (
                    <label key={opcao} className="relative shrink-0 cursor-pointer">
                      <input
                        type="radio"
                        name={`${id}-${parte}`}
                        value={opcao}
                        checked={selecionado === opcao}
                        onChange={() => {
                          selecionar(parte === "hora" ? `${opcao}:${minuto || "00"}` : `${hora || "00"}:${opcao}`);
                          if (parte === "minuto") fechar();
                        }}
                        onClick={() => {
                          if (parte === "minuto" && selecionado === opcao) {
                            selecionar(valor);
                            fechar();
                          }
                        }}
                        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="flex min-h-11 items-center justify-center rounded-sm text-sm tabular-nums text-navy transition hover:bg-surface-soft peer-checked:bg-navy peer-checked:font-semibold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-orange">
                        {opcao}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
