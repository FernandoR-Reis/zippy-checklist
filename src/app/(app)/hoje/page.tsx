import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

export default async function HojePage() {
  const usuario = await getOrCreateUsuarioAtual();

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-navy mb-1">Hoje</h1>
      <p className="font-body text-sm text-ink-muted mb-6">
        Olá, {usuario?.nome?.split(" ")[0]}. Seus checklists do dia aparecem aqui.
      </p>

      <Card>
        <EmptyState
          title="Ainda não há checklists"
          description="A criação e a execução de checklists chegam no próximo sprint. Por enquanto, organize a empresa em Unidades e convide sua equipe em Usuários."
        />
      </Card>
    </div>
  );
}
