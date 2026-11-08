import {
  excluirUsuario,
  getOrCreateUsuarioAtual,
  listarUsuariosDaEmpresa,
  listarSetoresDosUsuarios,
  atualizarSetoresDoUsuario,
  atualizarUsuario,
  convidarUsuario,
} from "@/lib/usuarios/actions";
import Link from "next/link";
import { listarSetoresDaEmpresa } from "@/lib/setores/actions";
import { listarUnidades } from "@/lib/unidades/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectorAccessDialog } from "@/components/usuarios/SectorAccessDialog";
import { UserEditDialog } from "@/components/usuarios/UserEditDialog";
import { NewUserDialog } from "@/components/usuarios/NewUserDialog";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: {
    erro?: string;
    sucesso?: string;
    usuarioId?: string;
    unidade?: string;
    setor?: string;
  };
}) {
  const usuarioAtual = await getOrCreateUsuarioAtual();
  const ehAdministrador = usuarioAtual?.perfil === "administrador";
  const podeGerenciar =
    ehAdministrador || usuarioAtual?.perfil === "gestor";
  const usuarios = usuarioAtual?.empresa_id
    ? await listarUsuariosDaEmpresa(usuarioAtual.empresa_id)
    : [];
  const [unidades, todosSetores] =
    podeGerenciar && usuarioAtual?.empresa_id
      ? await Promise.all([
          listarUnidades(usuarioAtual.empresa_id),
          listarSetoresDaEmpresa(usuarioAtual.empresa_id),
        ])
      : [[], []];
  const vinculos: Record<string, string[]> = podeGerenciar
    ? await listarSetoresDosUsuarios(usuarios.map((usuario) => usuario.id))
    : {};
  const unidadePorId = new Map(unidades.map((unidade) => [unidade.id, unidade.nome]));
  const unidadeSelecionada =
    searchParams.unidade === "sem-unidade" ||
    unidades.some((unidade) => unidade.id === searchParams.unidade)
      ? searchParams.unidade
      : undefined;
  const setoresDaUnidade =
    unidadeSelecionada && unidadeSelecionada !== "sem-unidade"
      ? todosSetores.filter((setor) => setor.unidade_id === unidadeSelecionada)
      : [];
  const setorSelecionado = setoresDaUnidade.some(
    (setor) => setor.id === searchParams.setor,
  )
    ? searchParams.setor
    : undefined;
  const usuariosDaUnidade = unidadeSelecionada
    ? unidadeSelecionada === "sem-unidade"
      ? usuarios.filter((usuario) => !usuario.unidade_id)
      : usuarios.filter((usuario) => usuario.unidade_id === unidadeSelecionada)
    : usuarios;
  const usuariosVisiveis = setorSelecionado
    ? usuariosDaUnidade.filter((usuario) =>
        vinculos[usuario.id]?.includes(setorSelecionado),
      )
    : usuariosDaUnidade;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display font-bold text-2xl text-navy">Usuários</h1>
        {podeGerenciar && usuarioAtual?.empresa_id && (
          <NewUserDialog
            unidades={unidades}
            ehAdministrador={ehAdministrador}
            unidadeNome={unidadePorId.get(usuarioAtual.unidade_id ?? "") ?? "não atribuída"}
            action={convidarUsuario.bind(null, usuarioAtual.empresa_id)}
          />
        )}
      </div>

      {searchParams.erro && (
        <div className="mb-6 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2 max-w-sm">
          {searchParams.erro}
        </div>
      )}
      {searchParams.sucesso === "setores" && (
        <div className="mb-6 rounded-sm bg-success px-3 py-2 max-w-sm font-body text-sm text-white">
          Setores atualizados.
        </div>
      )}
      {searchParams.sucesso === "usuario" && (
        <div className="mb-6 rounded-sm bg-success px-3 py-2 max-w-sm font-body text-sm text-white">
          Usuário atualizado.
        </div>
      )}
      {searchParams.sucesso === "convite" && (
        <div role="status" className="mb-6 rounded-sm bg-success px-3 py-2 max-w-sm font-body text-sm text-white">
          Convite enviado com sucesso.
        </div>
      )}

      {podeGerenciar && unidades.length > 0 && (
        <nav
          aria-label="Filtrar usuários por unidade"
          className="mb-3 flex min-w-0 max-w-lg gap-2 overflow-x-auto pb-2"
        >
          <Link
            href="/usuarios"
            aria-current={unidadeSelecionada ? undefined : "page"}
            className={
              !unidadeSelecionada
                ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
            }
          >
            Todas
          </Link>
          {unidades.map((unidade) => (
            <Link
              key={unidade.id}
              href={`/usuarios?unidade=${encodeURIComponent(unidade.id)}`}
              aria-current={unidadeSelecionada === unidade.id ? "page" : undefined}
              className={
                unidadeSelecionada === unidade.id
                  ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                  : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
              }
            >
              {unidade.nome}
            </Link>
          ))}
          {usuarios.some((usuario) => !usuario.unidade_id) && (
            <Link
              href="/usuarios?unidade=sem-unidade"
              aria-current={
                unidadeSelecionada === "sem-unidade" ? "page" : undefined
              }
              className={
                unidadeSelecionada === "sem-unidade"
                  ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                  : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
              }
            >
              Sem unidade
            </Link>
          )}
        </nav>
      )}

      {podeGerenciar &&
        unidadeSelecionada &&
        unidadeSelecionada !== "sem-unidade" &&
        setoresDaUnidade.length > 0 && (
          <nav
            aria-label="Filtrar usuários por setor"
            className="mb-4 flex max-w-lg gap-2 overflow-x-auto pb-2"
          >
            <Link
              href={`/usuarios?unidade=${encodeURIComponent(unidadeSelecionada)}`}
              aria-current={setorSelecionado ? undefined : "page"}
              className={
                !setorSelecionado
                  ? "shrink-0 rounded-md bg-orange px-4 py-2.5 font-body text-sm font-semibold text-white"
                  : "shrink-0 rounded-md border border-border px-4 py-2.5 font-body text-sm font-semibold text-navy"
              }
            >
              Todos os setores
            </Link>
            {setoresDaUnidade.map((setor) => (
              <Link
                key={setor.id}
                href={`/usuarios?unidade=${encodeURIComponent(unidadeSelecionada)}&setor=${encodeURIComponent(setor.id)}`}
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

      <div className="flex flex-col gap-3 mb-8">
        {usuariosVisiveis.length === 0 ? (
          <Card>
            <EmptyState
              title={usuarios.length === 0 ? "Nenhum usuário" : "Nenhum usuário neste filtro"}
              description={podeGerenciar ? "Use Novo usuário para convidar a equipe." : "Nenhum usuário para exibir."}
            />
          </Card>
        ) : (
          usuariosVisiveis.map((u) => (
            <Card key={u.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-display text-base font-semibold text-navy">{u.nome}</span>
                    <Badge tone={u.perfil !== "operacional" ? "progress" : "idle"} size="small">
                      {u.perfil === "administrador"
                        ? "Administrador"
                        : u.perfil === "gestor"
                          ? "Gestor"
                          : "Operacional"}
                    </Badge>
                  </div>
                  <div className="break-all font-mono text-xs text-ink-muted">{u.email}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {(ehAdministrador ||
                    (usuarioAtual?.perfil === "gestor" &&
                      u.perfil === "operacional" &&
                      u.unidade_id === usuarioAtual.unidade_id)) && (
                    <UserEditDialog
                      usuario={u}
                      unidades={unidades}
                      podeEditarPerfil={ehAdministrador}
                      action={atualizarUsuario.bind(null, u.id)}
                    />
                  )}
                  {podeGerenciar && u.id !== usuarioAtual?.id && (
                    <form action={excluirUsuario.bind(null, u.id)}>
                      <Button type="submit" variant="danger" className="min-h-11 px-3 py-2 text-xs">
                        Excluir
                      </Button>
                    </form>
                  )}
                </div>
              </div>
              {u.perfil !== "administrador" && (
                <div className="mt-2 break-words font-body text-xs text-ink-muted">
                  Unidade: {unidadePorId.get(u.unidade_id ?? "") ?? "Não atribuída"}
                </div>
              )}
              {podeGerenciar && u.perfil === "operacional" && (
                <SectorAccessDialog
                  usuarioId={u.id}
                  usuarioNome={u.nome}
                  setores={todosSetores.filter((setor) => setor.unidade_id === u.unidade_id)}
                  setoresSelecionados={vinculos[u.id] ?? []}
                  action={atualizarSetoresDoUsuario.bind(null, u.id)}
                />
              )}
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
