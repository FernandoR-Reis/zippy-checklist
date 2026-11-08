import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import Link from "next/link";
import { listarUnidades, criarUnidade, atualizarUnidade } from "@/lib/unidades/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: { editar?: string; erro?: string; sucesso?: string };
}) {
  const usuario = await getOrCreateUsuarioAtual();
  const unidades = usuario?.empresa_id ? await listarUnidades(usuario.empresa_id) : [];
  const podeGerenciar = usuario?.perfil === "administrador";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Unidades</h1>
      </div>

      {searchParams.erro && (
        <div role="alert" className="mb-4 rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
          {searchParams.erro}
        </div>
      )}
      {searchParams.sucesso === "1" && (
        <div role="status" className="mb-4 rounded-sm bg-success-soft px-3 py-2 font-body text-sm text-success-text">
          Unidade atualizada.
        </div>
      )}

      <div className="flex flex-col gap-3 mb-8">
        {unidades.length === 0 ? (
          <Card>
            <EmptyState
              title="Nenhuma unidade cadastrada"
              description="Um administrador pode cadastrar a primeira unidade."
            />
          </Card>
        ) : (
          unidades.map((unidade) => (
            <Card key={unidade.id}>
              {podeGerenciar && searchParams.editar === unidade.id ? (
                <form
                  action={atualizarUnidade.bind(null, unidade.id)}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <Input label="Nome da unidade" name="nome" defaultValue={unidade.nome} required maxLength={120} autoFocus />
                  </div>
                  <Button type="submit">Salvar</Button>
                  <Link href="/unidades" className="px-2 py-2.5 font-body text-sm font-semibold text-ink-muted">
                    Cancelar
                  </Link>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/unidades/${unidade.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-display font-semibold text-navy">{unidade.nome}</span>
                    <span className="font-body text-sm text-ink-muted">Setores e checklists →</span>
                  </Link>
                  {podeGerenciar && (
                    <Link
                      href={`/unidades?editar=${encodeURIComponent(unidade.id)}`}
                      className="rounded-md border border-navy px-3 py-2 font-body text-xs font-semibold text-navy"
                      aria-label={`Editar unidade ${unidade.nome}`}
                    >
                      Editar
                    </Link>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {podeGerenciar && usuario?.empresa_id && (
        <Card className="max-w-sm">
          <h2 className="font-display font-semibold text-sm text-navy mb-3">Nova unidade</h2>
          <form
            action={criarUnidade.bind(null, usuario.empresa_id)}
            className="flex flex-col gap-4"
          >
            <Input label="Nome da unidade" name="nome" placeholder="Ex.: Tratto" required />
            <Button type="submit" className="self-start">
              Adicionar
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
