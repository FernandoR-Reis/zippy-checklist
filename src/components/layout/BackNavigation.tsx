"use client";

import { useRouter, usePathname } from "next/navigation";

export function BackNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const areaPrincipal = ["/hoje", "/unidades", "/usuarios", "/empresa"].includes(pathname);
  const possuiRetorno = pathname.startsWith("/hoje/");

  if (areaPrincipal || possuiRetorno) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-2 font-mono text-xs text-ink-muted hover:text-navy transition-colors duration-200"
      aria-label="Voltar para a seção anterior"
    >
      <span aria-hidden="true">←</span>
      Voltar
    </button>
  );
}