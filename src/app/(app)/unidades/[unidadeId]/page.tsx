import { redirect } from "next/navigation";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import { Card } from "@/components/ui/Card";
export default async function UnidadePage({ params }: { params: { unidadeId: string } }) {
  const contexto = await unidadeDoUsuario(params.unidadeId); if (!contexto) redirect("/unidades");
  return <div><h1 className="font-display font-bold text-2xl text-navy mb-1">{contexto.unidade.nome}</h1><p className="font-body text-sm text-ink-muted mb-6">Organize a operação desta unidade.</p><div className="grid sm:grid-cols-2 gap-4 max-w-lg"><a href={`/unidades/${params.unidadeId}/setores`}><Card className="hover:shadow-pop transition h-full"><div className="font-display font-semibold text-navy mb-1">Setores</div><div className="font-body text-sm text-ink-muted">Cozinha, bar, salão, estoque...</div></Card></a><a href={`/unidades/${params.unidadeId}/checklists`}><Card className="hover:shadow-pop transition h-full"><div className="font-display font-semibold text-navy mb-1">Checklists</div><div className="font-body text-sm text-ink-muted">Modelos de checklist da unidade.</div></Card></a></div></div>;
}