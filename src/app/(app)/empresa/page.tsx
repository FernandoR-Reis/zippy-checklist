import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { buscarEmpresa, atualizarNomeEmpresa } from "@/lib/empresas/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function EmpresaPage() {
  const usuario = await getOrCreateUsuarioAtual();
  const empresa = usuario?.empresa_id ? await buscarEmpresa(usuario.empresa_id) : null;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-navy mb-6">Empresa</h1>

      <Card className="max-w-md">
        {!empresa ? (
          <EmptyState
            title="Nenhuma empresa vinculada"
            description="Fale com quem criou a conta para vincular seu usuário a uma empresa."
          />
        ) : usuario?.perfil === "gestor" ? (
          <form action={atualizarNomeEmpresa.bind(null, empresa.id)} className="flex flex-col gap-4">
            <Input label="Nome da empresa" name="nome" defaultValue={empresa.nome} required />
            <Button type="submit" className="self-start">
              Salvar
            </Button>
          </form>
        ) : (
          <div>
            <div className="font-body text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
              Nome da empresa
            </div>
            <div className="font-display font-semibold text-lg text-navy">{empresa.nome}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
