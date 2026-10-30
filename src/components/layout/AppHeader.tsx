import { signOut } from "@/lib/auth/actions";
import type { Usuario } from "@/types/database";

export function AppHeader({ usuario }: { usuario: Usuario }) {
  return (
    <header className="bg-gradient-to-br from-navy-soft via-navy to-navy-deep text-white px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="whitespace-nowrap font-display font-extrabold text-lg text-orange">
        zippy<span className="text-pink">.</span>
        <span className="ml-1 font-body font-semibold text-white text-sm align-middle">
          check·list
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 text-right leading-tight">
          <div className="max-w-32 truncate font-body font-semibold text-sm sm:max-w-48">{usuario.nome}</div>
          <div className="font-mono text-[11px] text-[#B8BFE6] uppercase tracking-wide">
            {usuario.perfil}
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="font-body text-xs font-semibold text-[#C7CCEC] hover:text-white border border-white/20 rounded-sm px-3 py-2 transition"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
