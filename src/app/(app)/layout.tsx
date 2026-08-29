import { redirect } from "next/navigation";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageTransition } from "@/components/layout/PageTransition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getOrCreateUsuarioAtual();

  // O middleware já barra usuários deslogados; isto cobre o caso raro
  // de sessão presente mas sem usuário correspondente.
  if (!usuario) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader usuario={usuario} />
      <AppNav perfil={usuario.perfil} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
