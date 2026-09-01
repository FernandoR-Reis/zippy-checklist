"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Toast = { mensagem: string; tipo: "success" | "error" } | null;

export function AppFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navegando, setNavegando] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    setNavegando(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const erro = searchParams.get("erro");
    const sucesso = searchParams.get("sucesso");
    if (erro) setToast({ mensagem: erro, tipo: "error" });
    else if (sucesso) setToast({ mensagem: "Alterações salvas com sucesso.", tipo: "success" });
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function iniciarNavegacao(event: MouseEvent) {
      const alvo = event.target as Element | null;
      const link = alvo?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destino = new URL(link.href, window.location.href);
      if (destino.origin === window.location.origin && destino.href !== window.location.href && !link.target) setNavegando(true);
    }
    document.addEventListener("click", iniciarNavegacao);
    return () => document.removeEventListener("click", iniciarNavegacao);
  }, []);

  return <>
    <div className={`fixed inset-x-0 top-0 z-50 h-0.5 bg-orange origin-left transition-transform duration-300 ${navegando ? "scale-x-100" : "scale-x-0"}`} aria-hidden="true" />
    {toast && <div role="status" className={`fixed right-5 top-5 z-50 max-w-sm rounded-md px-4 py-3 font-body text-sm font-medium text-white shadow-pop ${toast.tipo === "success" ? "bg-success" : "bg-danger"}`}>{toast.mensagem}</div>}
  </>;
}