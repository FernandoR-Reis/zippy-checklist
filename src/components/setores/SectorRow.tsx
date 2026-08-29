import { atualizarSetor, alternarStatusSetor } from "@/lib/setores/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Setor } from "@/types/database";
export function SectorRow({ unidadeId, setor, editando, podeGerenciar, erro }: { unidadeId: string; setor: Setor; editando: boolean; podeGerenciar: boolean; erro?: string }) {
  if (editando) return <Card>{erro && <div className="mb-3 rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">{erro}</div>}<form action={atualizarSetor.bind(null, unidadeId, setor.id)} className="flex items-end gap-3"><div className="flex-1"><Input label="Nome do setor" name="nome" defaultValue={setor.nome} required autoFocus /></div><Button type="submit">Salvar</Button><a href={`/unidades/${unidadeId}/setores`} className="font-body font-semibold text-sm text-ink-muted px-2 py-2.5">Cancelar</a></form></Card>;
  return <Card className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="font-display font-semibold text-navy">{setor.nome}</span><Badge tone={setor.ativo ? "done" : "idle"}>{setor.ativo ? "Ativo" : "Inativo"}</Badge></div>{podeGerenciar && <div className="flex items-center gap-4"><a href={`/unidades/${unidadeId}/setores?editar=${setor.id}`} className="font-body font-semibold text-sm text-navy">Editar</a><form action={alternarStatusSetor.bind(null, unidadeId, setor.id, !setor.ativo)}><button type="submit" className="font-body font-semibold text-sm text-ink-muted">{setor.ativo ? "Desativar" : "Ativar"}</button></form></div>}</Card>;
}