import { redirect } from "next/navigation";
import Link from "next/link";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import {
  listarChecklists,
  alternarStatusChecklist,
} from "@/lib/checklists/actions";
import { listarSetores } from "@/lib/setores/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Recorrencia } from "@/types/database";
const nomes: Record<Recorrencia, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};
export default async function ChecklistsPage({
  params,
}: {
  params: { unidadeId: string };
}) {
  const contexto = await unidadeDoUsuario(params.unidadeId);
  if (!contexto) redirect("/unidades");
  const [checklists, setores] = await Promise.all([
    listarChecklists(params.unidadeId),
    listarSetores(params.unidadeId),
  ]);
  const setoresPorId = new Map(setores.map((s) => [s.id, s.nome]));
  const gestor = contexto.usuario.perfil === "gestor";
  return (
    <div>
      <div className="mb-1 font-mono text-xs text-ink-muted uppercase tracking-wide">
        {contexto.unidade.nome}
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">
          Checklists
        </h1>
        {gestor && (
          <a href={`/unidades/${params.unidadeId}/checklists/novo`}>
            <Button>+ Novo checklist</Button>
          </a>
        )}
      </div>
      <div className="flex flex-col gap-3 max-w-lg">
        {checklists.length === 0 ? (
          <Card>
            <EmptyState
              title="Nenhum checklist criado"
              description="Crie o primeiro modelo e adicione as tarefas do dia a dia."
            />
          </Card>
        ) : (
          checklists.map((checklist) => (
            <Card key={checklist.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`/unidades/${params.unidadeId}/checklists/${checklist.id}`}
                    className="font-display font-semibold text-navy hover:underline"
                  >
                    {checklist.nome}
                  </a>
                  <div className="font-mono text-[11px] text-ink-muted mt-1">
                    {setoresPorId.get(checklist.setor_id) ?? "Setor"} ·{" "}
                    {nomes[checklist.recorrencia]}
                    {checklist.horario
                      ? ` · ${checklist.horario.slice(0, 5)}`
                      : ""}
                  </div>
                </div>
                <Badge tone={checklist.ativo ? "done" : "idle"}>
                  {checklist.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {gestor && (
                <div className="flex items-center gap-4 mt-3">
                  <a
                    href={`/unidades/${params.unidadeId}/checklists/${checklist.id}`}
                    className="font-body font-semibold text-xs text-navy"
                  >
                    Editar
                  </a>
                  <form
                    action={alternarStatusChecklist.bind(
                      null,
                      params.unidadeId,
                      checklist.id,
                      !checklist.ativo,
                    )}
                  >
                    <button
                      type="submit"
                      className={
                        checklist.ativo
                          ? "rounded-sm bg-danger px-3 py-1.5 font-body font-semibold text-xs text-white"
                          : "rounded-sm bg-success px-3 py-1.5 font-body font-semibold text-xs text-white"
                      }
                    >
                      {checklist.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
