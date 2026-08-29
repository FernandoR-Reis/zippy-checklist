import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ChecklistHoje = {
  id: string;
  unidade_id: string;
  setor_id: string;
  nome: string;
  horario: string | null;
  tarefa_templates: { id: string }[];
};

export default async function HojePage() {
  const usuario = await getOrCreateUsuarioAtual();
  const supabase = createClient();
  const { data } = usuario?.empresa_id
    ? await supabase
        .from("checklist_templates")
        .select("id, unidade_id, setor_id, nome, horario, tarefa_templates(id)")
        .eq("ativo", true)
        .order("horario")
    : { data: [] };
  const checklists = (data ?? []) as ChecklistHoje[];
  const [unidadesResult, setoresResult] = await Promise.all([
    supabase.from("unidades").select("id, nome"),
    supabase.from("setores").select("id, nome"),
  ]);
  const unidadePorId = new Map((unidadesResult.data ?? []).map((unidade) => [unidade.id, unidade.nome]));
  const setorPorId = new Map((setoresResult.data ?? []).map((setor) => [setor.id, setor.nome]));

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-navy mb-1">Hoje</h1>
      <p className="font-body text-sm text-ink-muted mb-6">
        Olá, {usuario?.nome?.split(" ")[0]}. Seus checklists do dia aparecem aqui.
      </p>

      {checklists.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <h2 className="font-display font-semibold text-navy mb-2">Ainda não há checklists ativos</h2>
            <p className="font-body text-sm text-ink-muted max-w-sm mx-auto">
              Crie um checklist em uma unidade para ele aparecer automaticamente aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {checklists.map((checklist) => {
            const total = checklist.tarefa_templates?.length ?? 0;
            const horario = checklist.horario?.slice(0, 5);
            return (
              <Card key={checklist.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-ink-muted uppercase tracking-wide mb-2">
                      {unidadePorId.get(checklist.unidade_id) ?? "Unidade"} · {setorPorId.get(checklist.setor_id) ?? "Setor"}
                    </div>
                    <h2 className="font-display font-bold text-lg text-navy truncate">{checklist.nome}</h2>
                  </div>
                  <Badge tone="idle">Não iniciado</Badge>
                </div>
                <div className="flex items-center justify-between font-mono text-xs text-ink-muted">
                  <span>{total} {total === 1 ? "tarefa" : "tarefas"}</span>
                  {horario && <span>{horario}</span>}
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-0 rounded-full bg-orange" />
                </div>
                <a
                  href={`/hoje/${checklist.id}`}
                  className="w-full rounded-md bg-orange text-white font-body font-semibold text-sm text-center px-4 py-2.5"
                >
                  Iniciar checklist
                </a>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
