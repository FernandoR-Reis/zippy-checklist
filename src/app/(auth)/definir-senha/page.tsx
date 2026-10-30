import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { definirSenha } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function DefinirSenhaPage({ searchParams }: { searchParams: { erro?: string } }) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login?erro=" + encodeURIComponent("Abra o link de convite recebido por e-mail para criar sua senha."));

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center"><span className="font-display font-extrabold text-3xl text-orange">zippy<span className="text-pink">.</span></span><span className="ml-1 font-body font-semibold text-white text-lg align-middle">check·list</span></div>
        <div className="bg-surface rounded-lg shadow-pop p-7">
          <h1 className="font-display font-bold text-xl text-navy mb-1">Crie sua senha</h1>
          <p className="font-body text-sm text-ink-muted mb-6">Defina uma senha para ativar seu acesso ao Zippy Check-list.</p>
          {searchParams.erro && <div className="mb-4 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">{searchParams.erro}</div>}
          <form action={definirSenha} className="flex flex-col gap-4">
            <Input label="Nova senha" name="password" type="password" minLength={6} required autoComplete="new-password" />
            <Input label="Confirmar senha" name="confirmacao" type="password" minLength={6} required autoComplete="new-password" />
            <Button type="submit" className="w-full mt-2">Ativar meu acesso</Button>
          </form>
        </div>
      </div>
    </div>
  );
}