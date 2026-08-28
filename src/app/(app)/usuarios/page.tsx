import { getOrCreateUsuarioAtual, listarUsuariosDaEmpresa, convidarUsuario } from "@/lib/usuarios/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { erro?: string };
}) {
  const usuarioAtual = await getOrCreateUsuarioAtual();
  const usuarios = usuarioAtual?.empresa_id
    ? await listarUsuariosDaEmpresa(usuarioAtual.empresa_id)
    : [];
  const podeGerenciar = usuarioAtual?.perfil === "gestor";

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-navy mb-6">Usuários</h1>

      {searchParams.erro && (
        <div className="mb-6 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2 max-w-sm">
          {searchParams.erro}
        </div>
      )}

      <div className="flex flex-col gap-3 mb-8">
        {usuarios.length === 0 ? (
          <Card>
            <EmptyState title="Nenhum usuário" description="Convide a equipe abaixo." />
          </Card>
        ) : (
          usuarios.map((u) => (
            <Card key={u.id} className="flex items-center justify-between">
              <div>
                <div className="font-display font-semibold text-navy">{u.nome}</div>
                <div className="font-mono text-xs text-ink-muted">{u.email}</div>
              </div>
              <Badge tone={u.perfil === "gestor" ? "progress" : "idle"}>{u.perfil}</Badge>
            </Card>
          ))
        )}
      </div>

      {podeGerenciar && usuarioAtual?.empresa_id && (
        <Card className="max-w-sm">
          <h2 className="font-display font-semibold text-sm text-navy mb-3">Convidar usuário</h2>
          <form
            action={convidarUsuario.bind(null, usuarioAtual.empresa_id)}
            className="flex flex-col gap-4"
          >
            <Input label="Nome" name="nome" required />
            <Input label="E-mail" name="email" type="email" required />
            <label className="flex flex-col gap-1.5">
              <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">
                Perfil
              </span>
              <select
                name="perfil"
                className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy"
              >
                <option value="operacional">Operacional</option>
                <option value="gestor">Gestor</option>
              </select>
            </label>
            <Button type="submit" className="self-start">
              Enviar convite
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
