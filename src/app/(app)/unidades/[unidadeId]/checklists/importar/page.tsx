import { redirect } from "next/navigation";
import { ImportarChecklistPlanilha } from "@/components/checklists/ImportarChecklistPlanilha";
import { importarChecklistPlanilha } from "@/lib/checklists/import-actions";
import { listarSetores } from "@/lib/setores/actions";
import { listarUsuariosDaEmpresa } from "@/lib/usuarios/actions";
import { unidadeDoUsuario } from "@/lib/unidades/guard";

export default async function ImportarChecklistPage({
  params,
  searchParams,
}: {
  params: { unidadeId: string };
  searchParams: { erro?: string };
}) {
  const contexto = await unidadeDoUsuario(params.unidadeId);
  if (!contexto || contexto.usuario.perfil !== "gestor") {
    redirect(`/unidades/${params.unidadeId}/checklists`);
  }

  const [setores, usuarios] = await Promise.all([
    listarSetores(params.unidadeId),
    listarUsuariosDaEmpresa(contexto.usuario.empresa_id!),
  ]);

  return (
    <div>
      <div className="mb-1 font-mono text-xs text-ink-muted uppercase tracking-wide">
        {contexto.unidade.nome} · Checklists
      </div>
      <h1 className="font-display font-bold text-2xl text-navy mb-6">
        Importar planilha
      </h1>
      {setores.every((setor) => !setor.ativo) && (
        <p className="mb-5 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">
          Cadastre um setor ativo antes de importar.{" "}
          <a href={`/unidades/${params.unidadeId}/setores`} className="font-semibold underline">
            Gerenciar setores
          </a>
        </p>
      )}
      {usuarios.length === 0 && (
        <p className="mb-5 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">
          Cadastre um usuário para atribuir como responsável antes de importar.{" "}
          <a href="/usuarios" className="font-semibold underline">
            Gerenciar usuários
          </a>
        </p>
      )}
      <ImportarChecklistPlanilha
        unidadeNome={contexto.unidade.nome}
        setores={setores.filter((setor) => setor.ativo)}
        usuarios={usuarios}
        action={importarChecklistPlanilha.bind(null, params.unidadeId)}
        erroInicial={searchParams.erro}
      />
    </div>
  );
}
