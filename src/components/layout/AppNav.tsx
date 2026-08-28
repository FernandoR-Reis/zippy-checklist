"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

const links = [
  { href: "/hoje", label: "Hoje" },
  { href: "/unidades", label: "Unidades" },
  { href: "/usuarios", label: "Usuários" },
  { href: "/empresa", label: "Empresa" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-surface border-b border-border px-6 flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "font-body font-semibold text-sm px-3 py-3 border-b-2 whitespace-nowrap transition",
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
