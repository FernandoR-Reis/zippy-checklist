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
import { EmptyState } from "@/components/ui/EmptyState";
import type { Recorrencia } from "@/types/database";
const nomes: Record<Recorrencia, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
};
export default async function ChecklistsPage({
  params,
  searchParams,
}: {
  params: { unidadeId: string };
  searchParams: { setor?: string };
}) {
  const contexto = await unidadeDoUsuario(params.unidadeId);
  if (!contexto) redirect("/unidades");
  const [checklists, setores] = await Promise.all([
    listarChecklists(params.unidadeId),
    listarSetores(params.unidadeId),
  ]);
  const setoresPorId = new Map(setores.map((s) => [s.id, s.nome]));
  const checklistsPorSetor = new Map<string, typeof checklists>();
  for (const checklist of checklists) {
    const grupo = checklistsPorSetor.get(checklist.setor_id) ?? [];
    grupo.push(checklist);
    checklistsPorSetor.set(checklist.setor_id, grupo);
  }
  const grupos = [...checklistsPorSetor.entries()]
    .map(([setorId, itens]) => ({
      id: setorId,
      nome: setoresPorId.get(setorId) ?? "Setor",
      checklists: itens,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const setoresComChecklists = grupos.map((grupo) => ({
    id: grupo.id,
    nome: grupo.nome,
  }));
  const setorSelecionado = setoresComChecklists.some(
    (setor) => setor.id === searchParams.setor,
  )
    ? searchParams.setor
    : undefined;
  const gruposVisiveis = setorSelecionado
    ? grupos.filter((grupo) => grupo.id === setorSelecionado)
    : grupos;
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
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/unidades/${params.unidadeId}/checklists/importar`}
              className="inline-flex items-center justify-center rounded-md border border-navy px-4 py-2.5 font-body text-sm font-semibold text-navy transition active:scale-[0.98]"
            >
              Importar planilha
            </Link>
            <Link
              href={`/unidades/${params.unidadeId}/checklists/novo`}
              className="inline-flex items-center justify-center rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(245,130,31,0.6)] transition active:scale-[0.98]"
            >
              + Novo checklist
            </Link>
          </div>
        )}
      </div>
      {grupos.length > 0 && (
        <nav
          aria-label="Filtrar checklists por setor"
          className="flex gap-2 overflow-x-auto pb-2 mb-4 max-w-lg"
        >
          <Link
            href={`/unidades/${params.unidadeId}/checklists`}
            aria-current={setorSelecionado ? undefined : "page"}
            className={
              !setorSelecionado
                ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
            }
          >
            Todos
          </Link>
          {setoresComChecklists.map((setor) => (
            <Link
              key={setor.id}
              href={`/unidades/${params.unidadeId}/checklists?setor=${encodeURIComponent(setor.id)}`}
              aria-current={setorSelecionado === setor.id ? "page" : undefined}
              className={
                setorSelecionado === setor.id
                  ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                  : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
              }
            >
              {setor.nome}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-6 max-w-lg">
        {checklists.length === 0 ? (
          <Card>
            <EmptyState
              title="Nenhum checklist criado"
              description="Crie o primeiro modelo e adicione as tarefas do dia a dia."
            />
          </Card>
        ) : (
          gruposVisiveis.map((grupo) => (
            <section key={grupo.id}>
              <h2 className="font-display font-semibold text-sm text-navy mb-3">
                {grupo.nome}
              </h2>
              <div className="flex flex-col gap-3">
                {grupo.checklists.map((checklist) => (
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
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
