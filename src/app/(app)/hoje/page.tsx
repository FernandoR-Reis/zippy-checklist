import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import { listarChecklistsDoDia, iniciarOuContinuarExecucao } from "@/lib/execucoes/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HojePage() {
  const usuario = await getOrCreateUsuarioAtual();
  const itens = await listarChecklistsDoDia();
  return <div className="max-w-md mx-auto"><h1 className="font-display font-bold text-2xl text-navy mb-1">Olá, {usuario?.nome?.split(" ")[0]}</h1><p className="font-body text-sm text-ink-muted mb-6">Hoje</p>{itens.length === 0 ? <Card><EmptyState title="Nada por aqui" description="Você não possui checklists para executar hoje." /></Card> : <div className="flex flex-col gap-3">{itens.map(({ checklist, setorNome, totalTarefas, execucao, concluidas }) => { const concluido = execucao?.status === "concluido"; const emAndamento = Boolean(execucao) && !concluido; return <Card key={checklist.id}><div className="flex items-start justify-between gap-3 mb-1"><div className="font-display font-semibold text-navy">{checklist.nome}</div>{concluido && <Badge tone="done">Concluído</Badge>}</div><div className="font-mono text-xs text-ink-muted mb-3">{setorNome} · {totalTarefas} tarefas{execucao ? ` · ${concluidas}/${totalTarefas} concluídas` : ""}{checklist.horario ? ` · ${checklist.horario.slice(0, 5)}` : ""}</div>{concluido ? <a href={`/hoje/${checklist.id}`} className="block w-full rounded-md border-[1.5px] border-navy text-navy font-body font-semibold text-sm text-center px-4 py-2.5">Ver checklist</a> : emAndamento ? <a href={`/hoje/${checklist.id}`} className="block w-full rounded-md bg-orange text-white font-body font-semibold text-sm text-center px-4 py-2.5">Continuar</a> : <form action={iniciarOuContinuarExecucao.bind(null, checklist.id)}><Button type="submit" className="w-full">Começar</Button></form>}</Card>; })}</div>}</div>;
}
