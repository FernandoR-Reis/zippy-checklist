import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import {
  atualizarConfiguracaoEmpresa,
  buscarEmpresa,
} from "@/lib/empresas/actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TimePicker } from "@/components/ui/TimePicker";

const fusosHorarios = [
  ["America/Noronha", "Fernando de Noronha"],
  ["America/Belem", "Belém"],
  ["America/Fortaleza", "Fortaleza"],
  ["America/Recife", "Recife"],
  ["America/Maceio", "Maceió"],
  ["America/Araguaina", "Araguaína"],
  ["America/Bahia", "Bahia"],
  ["America/Sao_Paulo", "Brasília, São Paulo e Sul/Sudeste"],
  ["America/Boa_Vista", "Boa Vista"],
  ["America/Campo_Grande", "Campo Grande"],
  ["America/Cuiaba", "Cuiabá"],
  ["America/Manaus", "Manaus"],
  ["America/Porto_Velho", "Porto Velho"],
  ["America/Santarem", "Santarém"],
  ["America/Rio_Branco", "Rio Branco"],
  ["America/Eirunepe", "Eirunepé"],
] as const;

const classeSelect =
  "w-full min-w-0 bg-surface font-body text-sm text-ink border border-border rounded-sm px-3 py-3 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition";

export default async function EmpresaPage({
  searchParams,
}: {
  searchParams: { erro?: string; salvo?: string };
}) {
  const usuario = await getOrCreateUsuarioAtual();
  const empresa = usuario?.empresa_id ? await buscarEmpresa(usuario.empresa_id) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-widest text-orange-dark">
          Configurações
        </p>
        <h1 className="font-display text-3xl font-bold text-navy">Sua empresa</h1>
        <p className="mt-1 font-body text-sm text-ink-muted">
          Organize os horários que guiam a rotina da sua equipe.
        </p>
      </div>

      {searchParams.erro && (
        <div role="alert" className="mb-4 max-w-2xl rounded-sm bg-danger-soft px-3 py-2 font-body text-sm text-danger-text">
          {searchParams.erro}
        </div>
      )}
      {searchParams.salvo === "1" && (
        <div role="status" className="mb-4 max-w-2xl rounded-sm bg-success-soft px-3 py-2 font-body text-sm text-success-text">
          Configurações salvas.
        </div>
      )}

      <Card className="sm:p-8">
        {!empresa ? (
          <EmptyState
            title="Nenhuma empresa vinculada"
            description="Fale com quem criou a conta para vincular seu usuário a uma empresa."
          />
        ) : usuario?.perfil === "administrador" ? (
          <form action={atualizarConfiguracaoEmpresa.bind(null, empresa.id)} className="flex flex-col gap-7">
            <section aria-labelledby="identidade-titulo" className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-navy">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-2h2v2" />
                  </svg>
                </span>
                <div>
                  <h2 id="identidade-titulo" className="font-display text-lg font-semibold text-navy">Identidade da empresa</h2>
                  <p className="font-body text-xs text-ink-muted">Como sua empresa aparece para a equipe.</p>
                </div>
              </div>
              <Input label="Nome da empresa" name="nome" defaultValue={empresa.nome} required />
            </section>

            <section aria-labelledby="operacao-titulo" className="flex flex-col gap-5 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-orange/10 text-orange-dark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div>
                  <h2 id="operacao-titulo" className="font-display text-lg font-semibold text-navy">Horário da operação</h2>
                  <p className="font-body text-xs text-ink-muted">O período padrão de funcionamento.</p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-soft p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <TimePicker
                    label="Início da operação"
                    name="inicio_operacao"
                    defaultValue={empresa.inicio_operacao.slice(0, 5)}
                  />
                  <TimePicker
                    label="Fim da operação"
                    name="fim_operacao"
                    defaultValue={empresa.fim_operacao.slice(0, 5)}
                  />
                </div>
                <p className="mt-3 font-body text-xs leading-relaxed text-ink-muted">
                  Pode terminar no dia seguinte. Exemplo: 16:00 até 00:30.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs uppercase tracking-wide text-ink-muted">
                  Fuso horário
                </span>
                <select
                  name="fuso_horario"
                  defaultValue={empresa.fuso_horario}
                  className={classeSelect}
                  required
                >
                  {!fusosHorarios.some(([fuso]) => fuso === empresa.fuso_horario) && (
                    <option value={empresa.fuso_horario}>{empresa.fuso_horario}</option>
                  )}
                  {fusosHorarios.map(([fuso, nome]) => (
                    <option key={fuso} value={fuso}>{nome}</option>
                  ))}
                </select>
              </label>
              <aside className="rounded-sm border border-orange/20 bg-orange/5 p-4">
                <h3 className="font-body text-xs font-semibold text-navy">Uma operação, mesmo depois da meia-noite</h3>
                <p className="mt-1.5 font-body text-xs leading-relaxed text-ink-muted">
                  Os checklists após a virada pertencem ao dia em que a operação começou.
                  Cada checklist mantém seu horário e prazo, mesmo quando termina após o fechamento.
                </p>
              </aside>
            </section>
            <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs font-body text-xs leading-relaxed text-ink-muted">
                As alterações se aplicam à operação de toda a empresa.
              </p>
              <Button type="submit" className="w-full shrink-0 sm:w-auto">
                Salvar configurações
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <div className="font-body text-xs font-medium text-ink-muted uppercase tracking-wide mb-1">
              Nome da empresa
            </div>
            <div className="font-display font-semibold text-lg text-navy">{empresa.nome}</div>
            <div className="mt-4 font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
              Horário da operação
            </div>
            <div className="font-display font-semibold text-navy">
              {empresa.inicio_operacao.slice(0, 5)}–{empresa.fim_operacao.slice(0, 5)}
            </div>
            <div className="mt-3 font-body text-xs font-medium uppercase tracking-wide text-ink-muted">
              Fuso horário
            </div>
            <div className="font-body text-sm text-ink">{empresa.fuso_horario}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
