import { redirect } from "next/navigation";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { listarAlertasGestor, listarHistoricoAlertasGestor } from "@/lib/execucoes/alertas";
import { buscarAgendaEmpresa } from "@/lib/empresas/agenda";
import { dataOperacional } from "@/lib/execucoes/schedule";
import { AlertsDashboard } from "@/components/alertas/AlertsDashboard";

export default async function AlertasPage() {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario?.empresa_id || usuario.perfil === "operacional") redirect("/hoje");

  const [itens, historico, agenda] = await Promise.all([
    listarAlertasGestor(),
    listarHistoricoAlertasGestor(),
    buscarAgendaEmpresa(usuario.empresa_id),
  ]);
  const hoje = dataOperacional(new Date(), agenda).split("-").reverse().join("/");

  return <AlertsDashboard itens={itens} historico={historico} hoje={hoje} />;
}
