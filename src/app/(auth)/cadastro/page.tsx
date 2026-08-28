import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function CadastroPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4 py-10">
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
          <h1 className="font-display font-bold text-xl text-navy mb-1">Criar empresa</h1>
          <p className="font-body text-sm text-ink-muted mb-6">
            Você entra como gestor e depois convida o resto da equipe.
          </p>

          {searchParams.erro && (
            <div className="mb-4 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">
              {searchParams.erro}
            </div>
          )}

          <form action={signUp} className="flex flex-col gap-4">
            <Input label="Seu nome" name="nome" required autoComplete="name" />
            <Input label="Nome da empresa" name="empresa_nome" required placeholder="Ex.: Zippy" />
            <Input label="E-mail" name="email" type="email" required autoComplete="email" />
            <Input
              label="Senha"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" className="w-full mt-2">
              Criar empresa
            </Button>
          </form>

          <p className="mt-5 text-center font-body text-sm text-ink-muted">
            Já tem conta?{" "}
            <Link href="/login" className="text-navy font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
