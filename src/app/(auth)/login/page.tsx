import Link from "next/link";
import { signInWithPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display font-extrabold text-3xl text-orange">
            zippy<span className="text-pink">.</span>
          </span>
          <span className="ml-1 font-body font-semibold text-white text-lg align-middle">
            check·list
          </span>
        </div>

        <div className="bg-surface rounded-lg shadow-pop p-7">
          <h1 className="font-display font-bold text-xl text-navy mb-1">Entrar</h1>
          <p className="font-body text-sm text-ink-muted mb-6">
            Acesse os checklists da sua unidade.
          </p>

          {searchParams.erro && (
            <div className="mb-4 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">
              {searchParams.erro}
            </div>
          )}

          <form action={signInWithPassword} className="flex flex-col gap-4">
            <Input label="E-mail" name="email" type="email" required autoComplete="email" />
            <Input
              label="Senha"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="primary" className="w-full mt-2">
              Entrar
            </Button>
          </form>

          <p className="mt-5 text-center font-body text-sm text-ink-muted">
            Primeira vez por aqui?{" "}
            <Link href="/cadastro" className="text-navy font-semibold">
              Criar empresa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
