import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { listarUnidades, criarUnidade } from "@/lib/unidades/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function UnidadesPage() {
  const usuario = await getOrCreateUsuarioAtual();
  const unidades = usuario?.empresa_id ? await listarUnidades(usuario.empresa_id) : [];
  const podeGerenciar = usuario?.perfil === "gestor";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Unidades</h1>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {unidades.length === 0 ? (
          <Card>
            <EmptyState
              title="Nenhuma unidade cadastrada"
              description="Cadastre a primeira unidade — por exemplo, uma casa ou restaurante do grupo."
            />
          </Card>
        ) : (
          unidades.map((unidade) => (
            <a key={unidade.id} href={`/unidades/${unidade.id}`}>
              <Card className="flex items-center justify-between hover:shadow-pop transition">
                <span className="font-display font-semibold text-navy">{unidade.nome}</span>
                <span className="font-body text-sm text-ink-muted">Setores e checklists →</span>
              </Card>
            </a>
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
