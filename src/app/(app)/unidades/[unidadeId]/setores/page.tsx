import { redirect } from "next/navigation";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import { listarSetores, criarSetor } from "@/lib/setores/actions";
import { SectorRow } from "@/components/setores/SectorRow";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
export default async function SetoresPage({ params, searchParams }: { params: { unidadeId: string }; searchParams: { editar?: string; erro?: string } }) {
  const contexto = await unidadeDoUsuario(params.unidadeId); if (!contexto) redirect("/unidades");
  const setores = await listarSetores(params.unidadeId); const gestor = contexto.usuario.perfil === "gestor";
  return <div><div className="mb-1 font-mono text-xs text-ink-muted uppercase tracking-wide">{contexto.unidade.nome}</div><h1 className="font-display font-bold text-2xl text-navy mb-6">Setores</h1>{searchParams.erro && !searchParams.editar && <div className="mb-4 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2 max-w-lg">{searchParams.erro}</div>}<div className="flex flex-col gap-3 mb-8 max-w-lg">{setores.length === 0 ? <Card><EmptyState title="Nenhum setor cadastrado" description="Crie o primeiro setor para começar a organizar a operação." /></Card> : setores.map((setor) => <SectorRow key={setor.id} unidadeId={params.unidadeId} setor={setor} editando={searchParams.editar === setor.id} podeGerenciar={gestor} erro={searchParams.editar === setor.id ? searchParams.erro : undefined} />)}</div>{gestor && !searchParams.editar && <Card className="max-w-sm"><h2 className="font-display font-semibold text-sm text-navy mb-3">Novo setor</h2><form action={criarSetor.bind(null, params.unidadeId)} className="flex flex-col gap-4"><Input label="Nome do setor" name="nome" placeholder="Ex.: Cozinha" required /><Button type="submit" className="self-start">Adicionar</Button></form></Card>}</div>;
}