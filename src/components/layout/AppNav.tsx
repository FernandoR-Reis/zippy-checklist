"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import type { PerfilUsuario } from "@/types/database";

const linksGestor = [
  { href: "/hoje", label: "Hoje" },
  { href: "/unidades", label: "Unidades" },
  { href: "/usuarios", label: "Usuários" },
  { href: "/empresa", label: "Empresa" },
];

const linksOperacional = [{ href: "/hoje", label: "Hoje" }];

export function AppNav({ perfil }: { perfil: PerfilUsuario }) {
  const pathname = usePathname();
  const links = perfil === "gestor" ? linksGestor : linksOperacional;

  return (
    <nav className="bg-surface border-b border-border px-6 flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "font-body font-semibold text-sm px-3 py-3 border-b-2 whitespace-nowrap transition-colors duration-200",
              active
                ? "border-orange text-navy"
                : "border-transparent text-ink-muted hover:text-navy"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
