import { redirect } from "next/navigation";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import { criarChecklist } from "@/lib/checklists/actions";
import { listarSetores } from "@/lib/setores/actions";
import { listarUsuariosDaEmpresa } from "@/lib/usuarios/actions";
import { ChecklistForm } from "@/components/checklists/ChecklistForm";
export default async function NovoChecklistPage({ params, searchParams }: { params: { unidadeId: string }; searchParams: { erro?: string } }) { const contexto = await unidadeDoUsuario(params.unidadeId); if (!contexto?.usuario.empresa_id) redirect(`/unidades/${params.unidadeId}/checklists`); const [setores, usuarios, agenda] = await Promise.all([listarSetores(params.unidadeId), listarUsuariosDaEmpresa(contexto.usuario.empresa_id), buscarAgendaEmpresa(contexto.usuario.empresa_id)]); const responsaveis = usuarios.filter(
  (usuario) => usuario.perfil === "administrador" || usuario.unidade_id === params.unidadeId,
);
return <div><div className="mb-1 font-mono text-xs text-ink-muted uppercase tracking-wide">{contexto.unidade.nome}</div><h1 className="font-display font-bold text-2xl text-navy mb-6">Novo checklist</h1><ChecklistForm action={criarChecklist.bind(null, params.unidadeId)} setores={setores.filter((s) => s.ativo)} usuarios={responsaveis} agenda={agenda} erro={searchParams.erro} submitLabel="Criar e adicionar tarefas" /></div>; }