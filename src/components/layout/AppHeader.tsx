import { signOut } from "@/lib/auth/actions";
import type { Usuario } from "@/types/database";

export function AppHeader({ usuario }: { usuario: Usuario }) {
  return (
    <header className="bg-gradient-to-br from-navy-soft via-navy to-navy-deep text-white px-6 py-4 flex items-center justify-between">
      <div className="font-display font-extrabold text-lg text-orange">
        zippy<span className="text-pink">.</span>
        <span className="ml-1 font-body font-semibold text-white text-sm align-middle">
          check·list
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="font-body font-semibold text-sm">{usuario.nome}</div>
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
