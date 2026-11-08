import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import {
  listarAlertasGestor,
  listarHistoricoAlertasGestor,
  type EstadoAlerta,
} from "@/lib/execucoes/alertas";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import { dataOperacional, formatarHoraOperacional } from "@/lib/execucoes/schedule";
import { PushNotificationsButton } from "@/components/alertas/PushNotificationsButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const estados: Record<EstadoAlerta, { titulo: string; tone: "idle" | "progress" | "done" | "late" }> = {
  agendado: { titulo: "Agendado", tone: "idle" },
  nao_iniciado: { titulo: "Ainda não iniciado", tone: "idle" },
  em_andamento: { titulo: "Em andamento", tone: "progress" },
  nao_executado: { titulo: "Não executado", tone: "late" },
  atrasado: { titulo: "Prazo vencido", tone: "late" },
  concluido: { titulo: "Concluído", tone: "done" },
};

function dataPorExtenso(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function AlertasPage() {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id || usuario.perfil === "operacional") redirect("/hoje");

  const [itens, historico, agenda] = await Promise.all([
    listarAlertasGestor(),
    listarHistoricoAlertasGestor(),
    buscarAgendaEmpresa(usuario.empresa_id),
  ]);
  const naoExecutados = itens.filter((item) => item.estado === "nao_executado").length;
  const atrasados = itens.filter((item) => item.estado === "atrasado").length;
  const emAndamento = itens.filter((item) => item.estado === "em_andamento").length;
  const hoje = dataPorExtenso(dataOperacional(new Date(), agenda));

  return (
    <div>
      <div className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-muted">Gestão</div>
      <h1 className="mb-1 font-display text-2xl font-bold text-navy">Acompanhamento de checklists</h1>
      <p className="mb-6 font-body text-sm text-ink-muted">Status, prazos e tarefas pendentes de hoje ({hoje}).</p>

      <Card className="mb-6">
        <h2 className="mb-2 font-display font-semibold text-navy">Alertas no celular</h2>
        <p className="mb-4 font-body text-sm text-ink-muted">
          Receba um aviso quando um checklist não for iniciado ou ultrapassar o prazo.
        </p>
        <PushNotificationsButton />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><div className="font-mono text-xs text-ink-muted">Não executados</div><div className="mt-1 font-display text-2xl font-bold text-danger-text">{naoExecutados}</div></Card>
        <Card><div className="font-mono text-xs text-ink-muted">Com prazo vencido</div><div className="mt-1 font-display text-2xl font-bold text-danger-text">{atrasados}</div></Card>
        <Card><div className="font-mono text-xs text-ink-muted">Em andamento</div><div className="mt-1 font-display text-2xl font-bold text-orange-dark">{emAndamento}</div></Card>
      </div>

      {itens.length === 0 ? (
        <Card><p className="font-body text-sm text-ink-muted">Não há checklists ativos para acompanhar nesta unidade.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {itens.map((item) => {
            const estado = estados[item.estado];
            return (
              <Card key={item.checklistId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display font-semibold text-navy">{item.nome}</h2>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      {item.unidadeNome} · {item.setorNome} · Início {item.horario}{item.horarioNoDiaSeguinte ? " (dia seguinte)" : ""} · Prazo {formatarHoraOperacional(new Date(item.prazoFinal), item.fusoHorario)}
                    </p>
                  </div>
                  <Badge tone={estado.tone}>{estado.titulo}</Badge>
                </div>

                {item.executorNome && (
                  <p className="mt-3 font-body text-sm text-ink-muted">
                    Responsável: {item.executorNome}
                  </p>
                )}
                {item.total > 0 && (
                  <p className="mt-2 font-mono text-xs text-ink-muted">
                    {item.concluidas}/{item.total} tarefas concluídas
                  </p>
                )}
                {item.tarefasPendentes.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 font-body text-xs font-semibold text-ink-muted">Tarefas pendentes</p>
                    <ul className="list-inside list-disc font-body text-sm text-ink">
                      {item.tarefasPendentes.slice(0, 5).map((titulo, index) => <li key={`${item.checklistId}-${index}`}>{titulo}</li>)}
                      {item.tarefasPendentes.length > 5 && <li>e mais {item.tarefasPendentes.length - 5}</li>}
                    </ul>
                  </div>
                )}
                {item.estado === "em_andamento" || item.estado === "atrasado" ? (
                  <Link href={`/hoje/${item.checklistId}`} className="mt-4 inline-block font-body text-sm font-semibold text-navy underline">
                    Abrir execução
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {historico.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-navy">Alertas anteriores · 30 dias</h2>
          <div className="flex flex-col gap-2">
            {historico.map((alerta) => (
              <Card key={alerta.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-navy">{alerta.checklistNome}</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">
                    {dataPorExtenso(alerta.data)} · {alerta.unidadeNome} · {alerta.setorNome}
                  </p>
                </div>
                <Badge tone="late">
                  {alerta.tipo === "nao_executado" ? "Não executado" : "Prazo vencido"}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
