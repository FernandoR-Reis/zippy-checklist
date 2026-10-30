"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  analisarCsv,
  nomeColuna,
  prepararAbasExcel,
  sugerirColunas,
  sugerirLinhaCabecalho,
  sugerirSetorId,
  type AbaPlanilha,
} from "@/lib/checklists/planilha";
import type { Recorrencia, Setor, TipoTarefa, Usuario } from "@/types/database";

type Mapeamento = {
  aba: number;
  cabecalho: number;
  tarefa: number;
  setor: number;
  unidade: number;
  primeiraLinha: string;
  ultimaLinha: string;
};

type TarefaPrevia = {
  id: number;
  titulo: string;
  tipo: TipoTarefa;
  obrigatoria: boolean;
  categoria: string;
};

const tipos: { valor: TipoTarefa; nome: string }[] = [
  { valor: "checkbox", nome: "Checkbox" },
  { valor: "sim_nao", nome: "Sim / Não" },
  { valor: "numero", nome: "Número" },
  { valor: "texto", nome: "Texto" },
];

const recorrencias: { valor: Recorrencia; nome: string }[] = [
  { valor: "diaria", nome: "Diária" },
  { valor: "semanal", nome: "Semanal" },
  { valor: "mensal", nome: "Mensal" },
];

const estiloSelect =
  "font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy";

function nomeArquivo(nome: string): string {
  return nome.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120);
}

function criarTarefasPrevia(
  aba: AbaPlanilha,
  mapeamento: Mapeamento,
): TarefaPrevia[] {
  const inicio = Math.max(1, Number(mapeamento.primeiraLinha) || 1) - 1;
  const fimInformado = Number(mapeamento.ultimaLinha);
  const fim = fimInformado > 0
    ? Math.min(fimInformado, aba.linhas.length)
    : aba.linhas.length;

  return aba.linhas
    .slice(inicio, fim)
    .flatMap((linha, indice): TarefaPrevia[] => {
      const linhaReal = inicio + indice;
      if (linhaReal === mapeamento.cabecalho) return [];
      const titulo = linha[mapeamento.tarefa]?.trim() ?? "";
      if (!titulo) return [];
      return [{
        id: linhaReal,
        titulo,
        tipo: "checkbox",
        obrigatoria: true,
        categoria: mapeamento.setor >= 0 ? linha[mapeamento.setor]?.trim() ?? "" : "",
      }];
    })
    .slice(0, 300);
}

function obterMapeamento(
  abas: AbaPlanilha[],
  indiceAba: number,
): Mapeamento {
  const aba = abas[indiceAba];
  const cabecalho = sugerirLinhaCabecalho(aba.linhas);
  const colunas = sugerirColunas(aba.linhas, cabecalho);
  return {
    aba: indiceAba,
    cabecalho,
    tarefa: colunas.tarefa,
    setor: colunas.setor,
    unidade: colunas.unidade,
    primeiraLinha: String(cabecalho >= 0 ? cabecalho + 2 : 1),
    ultimaLinha: "",
  };
}

export function ImportarChecklistPlanilha({
  unidadeNome,
  setores,
  usuarios,
  action,
  erroInicial,
}: {
  unidadeNome: string;
  setores: Setor[];
  usuarios: Usuario[];
  action: (formData: FormData) => void | Promise<void>;
  erroInicial?: string;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abas, setAbas] = useState<AbaPlanilha[]>([]);
  const [mapeamento, setMapeamento] = useState<Mapeamento | null>(null);
  const [tarefas, setTarefas] = useState<TarefaPrevia[]>([]);
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [erro, setErro] = useState(erroInicial ?? "");
  const [analisando, setAnalisando] = useState(false);

  const abaAtual = mapeamento ? abas[mapeamento.aba] : undefined;
  const quantidadeColunas = useMemo(
    () => Math.max(1, ...(abaAtual?.linhas.map((linha) => linha.length) ?? [])),
    [abaAtual],
  );
  const valoresUnidade = useMemo(() => {
    if (!abaAtual || !mapeamento || mapeamento.unidade < 0) return [];
    return [...new Set(
      abaAtual.linhas
        .slice(Math.max(0, Number(mapeamento.primeiraLinha) - 1))
        .map((linha) => linha[mapeamento.unidade]?.trim() ?? "")
        .filter(Boolean),
    )].slice(0, 5);
  }, [abaAtual, mapeamento]);

  async function analisarArquivo() {
    if (!arquivo) {
      setErro("Selecione uma planilha para começar.");
      return;
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      setErro("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    setErro("");
    setAnalisando(true);
    try {
      let resultado: AbaPlanilha[];
      if (arquivo.name.toLocaleLowerCase("pt-BR").endsWith(".csv")) {
        resultado = analisarCsv(await arquivo.text());
      } else if (arquivo.name.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) {
        const { default: lerExcel } = await import("read-excel-file/browser");
        resultado = prepararAbasExcel(await lerExcel(arquivo));
      } else {
        throw new Error("Formato não reconhecido. Envie um arquivo .xlsx ou .csv.");
      }
      if (resultado.length === 0 || resultado.every((aba) => aba.linhas.length === 0)) {
        throw new Error("Não encontrei dados no arquivo. Escolha outra planilha ou aba.");
      }
      const primeiroMapeamento = obterMapeamento(resultado, 0);
      setAbas(resultado);
      setMapeamento(primeiroMapeamento);
      setTarefas(criarTarefasPrevia(resultado[0], primeiroMapeamento));
      setNome(nomeArquivo(arquivo.name) || "Checklist importado");
      setSetorId(
        sugerirSetorId(
          resultado[0].linhas,
          primeiroMapeamento.setor,
          Number(primeiroMapeamento.primeiraLinha) - 1,
          setores.map((setor) => ({ id: setor.id, nome: setor.nome })),
          Number(primeiroMapeamento.ultimaLinha) || undefined,
          primeiroMapeamento.cabecalho,
        ),
      );
    } catch (causa) {
      setAbas([]);
      setMapeamento(null);
      setTarefas([]);
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível ler o arquivo. Verifique se ele está íntegro.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  function atualizarMapeamento(proximo: Mapeamento, sugerirSetor = false) {
    const aba = abas[proximo.aba];
    setMapeamento(proximo);
    setTarefas(criarTarefasPrevia(aba, proximo));
    if (sugerirSetor) {
      setSetorId(
        sugerirSetorId(
          aba.linhas,
          proximo.setor,
          Number(proximo.primeiraLinha) - 1,
          setores.map((setor) => ({ id: setor.id, nome: setor.nome })),
          Number(proximo.ultimaLinha) || undefined,
          proximo.cabecalho,
        ),
      );
    }
  }

  function mudarAba(indice: number) {
    if (!abas[indice]) return;
    const proximo = obterMapeamento(abas, indice);
    atualizarMapeamento(proximo, true);
  }

  function mudarCabecalho(valor: number) {
    if (!mapeamento || !abaAtual) return;
    const colunas = sugerirColunas(abaAtual.linhas, valor);
    atualizarMapeamento({
      ...mapeamento,
      cabecalho: valor,
      tarefa: colunas.tarefa,
      setor: colunas.setor,
      unidade: colunas.unidade,
      primeiraLinha: String(valor >= 0 ? valor + 2 : 1),
    }, true);
  }

  function atualizarColuna(chave: "tarefa" | "setor" | "unidade", valor: string) {
    if (!mapeamento) return;
    const proximo = { ...mapeamento, [chave]: Number(valor) };
    atualizarMapeamento(proximo, chave === "setor");
  }

  function atualizarTarefa(indice: number, patch: Partial<TarefaPrevia>) {
    setTarefas((atuais) =>
      atuais.map((tarefa, itemIndice) =>
        itemIndice === indice ? { ...tarefa, ...patch } : tarefa,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="font-body text-sm text-ink-muted mb-1">
          A planilha será analisada neste navegador e não será enviada para serviços externos.
        </p>
        <p className="font-body text-sm text-ink">
          Unidade: <strong>{unidadeNome}</strong>
        </p>
      </div>

      {erro && (
        <div role="alert" className="rounded-sm bg-danger-soft text-danger-text text-sm font-body px-3 py-2">
          {erro}
        </div>
      )}

      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-display font-semibold text-navy mb-3">1. Escolha a planilha</h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Input
            label="Arquivo Excel (.xlsx) ou CSV"
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(evento) => {
              setArquivo(evento.currentTarget.files?.[0] ?? null);
              setAbas([]);
              setMapeamento(null);
              setTarefas([]);
              setErro("");
            }}
          />
          <Button type="button" onClick={analisarArquivo} disabled={analisando || !arquivo}>
            {analisando ? "Analisando..." : "Analisar planilha"}
          </Button>
        </div>
        <p className="font-mono text-[11px] text-ink-muted mt-2">
          Máximo de 10 MB. Arquivos Excel antigos (.xls) devem ser salvos como .xlsx.
        </p>
      </section>

      {abaAtual && mapeamento && (
        <>
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display font-semibold text-navy mb-1">2. Confira o mapeamento</h2>
            <p className="font-body text-sm text-ink-muted mb-4">
              As sugestões são automáticas. Se não corresponderem à planilha, selecione a aba, as colunas e o intervalo manualmente.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {abas.length > 1 && (
                <label className="flex flex-col gap-1.5">
                  <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Aba</span>
                  <select value={mapeamento.aba} onChange={(evento) => mudarAba(Number(evento.target.value))} className={estiloSelect}>
                    {abas.map((aba, indice) => <option key={`${aba.nome}-${indice}`} value={indice}>{aba.nome}</option>)}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Linha de cabeçalho</span>
                <input
                  type="number"
                  aria-label="Linha do cabeçalho; use zero se não houver cabeçalho"
                  min={0}
                  max={abaAtual.linhas.length}
                  value={mapeamento.cabecalho + 1}
                  onChange={(evento) => {
                    const linha = Number(evento.target.value);
                    mudarCabecalho(linha > 0 ? linha - 1 : -1);
                  }}
                  className={estiloSelect}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Coluna das tarefas</span>
                <select value={mapeamento.tarefa} onChange={(evento) => atualizarColuna("tarefa", evento.target.value)} className={estiloSelect}>
                  {Array.from({ length: quantidadeColunas }, (_, indice) => <option key={indice} value={indice}>{nomeColuna(indice)}{abaAtual.linhas[mapeamento.cabecalho]?.[indice] ? ` · ${abaAtual.linhas[mapeamento.cabecalho][indice]}` : ""}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Coluna do setor (opcional)</span>
                <select value={mapeamento.setor} onChange={(evento) => atualizarColuna("setor", evento.target.value)} className={estiloSelect}>
                  <option value={-1}>Não usar</option>
                  {Array.from({ length: quantidadeColunas }, (_, indice) => <option key={indice} value={indice}>{nomeColuna(indice)}{abaAtual.linhas[mapeamento.cabecalho]?.[indice] ? ` · ${abaAtual.linhas[mapeamento.cabecalho][indice]}` : ""}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Coluna da unidade (opcional)</span>
                <select value={mapeamento.unidade} onChange={(evento) => atualizarColuna("unidade", evento.target.value)} className={estiloSelect}>
                  <option value={-1}>Não usar</option>
                  {Array.from({ length: quantidadeColunas }, (_, indice) => <option key={indice} value={indice}>{nomeColuna(indice)}{abaAtual.linhas[mapeamento.cabecalho]?.[indice] ? ` · ${abaAtual.linhas[mapeamento.cabecalho][indice]}` : ""}</option>)}
                </select>
              </label>
              <Input
                label="Primeira linha de dados"
                type="number"
                min={1}
                max={abaAtual.linhas.length}
                value={mapeamento.primeiraLinha}
                onChange={(evento) => {
                  const proximo = { ...mapeamento, primeiraLinha: evento.target.value };
                  atualizarMapeamento(proximo, true);
                }}
              />
              <Input
                label="Última linha (opcional)"
                type="number"
                min={1}
                max={abaAtual.linhas.length}
                value={mapeamento.ultimaLinha}
                onChange={(evento) => {
                  atualizarMapeamento({ ...mapeamento, ultimaLinha: evento.target.value });
                }}
              />
            </div>
            {valoresUnidade.length > 0 && (
              <p className="font-body text-xs text-ink-muted mt-4">
                Unidade(s) encontrada(s) na planilha: {valoresUnidade.join(", ")}. O checklist será associado à unidade atual: {unidadeNome}.
              </p>
            )}
          </section>

          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display font-semibold text-navy mb-1">3. Revise e edite a prévia</h2>
            <p className="font-body text-sm text-ink-muted mb-4">
              {tarefas.length} {tarefas.length === 1 ? "tarefa sugerida" : "tarefas sugeridas"}. Nenhum item será criado até você confirmar.
              {tarefas.length >= 300 ? " A prévia está limitada a 300 tarefas; ajuste o intervalo para importar mais em partes." : ""}
            </p>
            <form id="form-importar-checklist" action={action} className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 mb-5">
              <Input label="Nome do checklist" name="nome" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={120} required />
              <label className="flex flex-col gap-1.5">
                <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Setor</span>
                <select name="setor_id" value={setorId} onChange={(evento) => setSetorId(evento.target.value)} required className={estiloSelect}>
                  <option value="" disabled>Selecione um setor</option>
                  {setores.map((setor) => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}
                </select>
              </label>
              {mapeamento.setor >= 0 && new Set(tarefas.map((tarefa) => tarefa.categoria).filter(Boolean)).size > 1 && (
                <p className="font-body text-xs text-ink-muted">
                  A planilha contém mais de uma categoria. Selecione o setor correspondente para este checklist; as categorias sugeridas aparecem junto de cada tarefa.
                </p>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Responsável</span>
                  <select name="responsavel_id" defaultValue="" required className={estiloSelect}>
                    <option value="" disabled>Selecione</option>
                    {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Frequência</span>
                  <select name="recorrencia" defaultValue="" required className={estiloSelect}>
                    <option value="" disabled>Selecione</option>
                    {recorrencias.map((frequencia) => <option key={frequencia.valor} value={frequencia.valor}>{frequencia.nome}</option>)}
                  </select>
                </label>
                <Input label="Horário" name="horario" type="time" required />
              </div>
            </div>

              {tarefas.map((tarefa, indice) => (
                <div key={`${tarefa.id}-${indice}`} className="rounded-sm border border-border p-3">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <Input
                        id={`tarefa-${indice}`}
                        label={`Tarefa ${indice + 1}`}
                        name="titulo"
                        value={tarefa.titulo}
                        maxLength={250}
                        required
                        onChange={(evento) => atualizarTarefa(indice, { titulo: evento.target.value })}
                      />
                    </div>
                    <label className="flex flex-col gap-1.5 sm:w-40">
                      <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">Tipo</span>
                      <select name="tipo" value={tarefa.tipo} onChange={(evento) => atualizarTarefa(indice, { tipo: evento.target.value as TipoTarefa })} className={estiloSelect}>
                        {tipos.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.nome}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 font-body text-sm text-ink sm:h-[42px]">
                      <input name={`obrigatoria-${indice}`} type="checkbox" checked={tarefa.obrigatoria} onChange={(evento) => atualizarTarefa(indice, { obrigatoria: evento.target.checked })} />
                      Obrigatória
                    </label>
                    <button
                      type="button"
                      onClick={() => setTarefas((atuais) => atuais.filter((_, itemIndice) => itemIndice !== indice))}
                      aria-label={`Remover tarefa ${indice + 1}`}
                      title="Remover tarefa"
                      className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 self-start rounded-sm border border-border bg-surface px-3 font-body text-xs font-semibold text-danger-text transition hover:border-danger hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger sm:self-auto"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M4.5 6h11m-9.5 0 .6 10h6.8L14 6M8 6V4.5h4V6m-3 3v4m2-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Remover
                    </button>
                  </div>
                  {tarefa.categoria && (
                    <p className="font-mono text-[11px] text-ink-muted mt-2">Categoria da planilha: {tarefa.categoria}</p>
                  )}
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setTarefas((atuais) => atuais.length >= 300 ? atuais : [...atuais, { id: Date.now(), titulo: "", tipo: "checkbox", obrigatoria: true, categoria: "" }])}
                  disabled={tarefas.length >= 300}
                  className="self-start font-body font-semibold text-sm text-navy disabled:opacity-50"
                >
                  + Adicionar tarefa manualmente
                </button>
              </div>
              <label className="flex items-start gap-2 font-body text-sm text-ink mt-2">
                <input type="checkbox" name="confirmacao" value="confirmar" required className="mt-1" />
                Revisei os dados e confirmo a criação deste checklist com {tarefas.length} tarefas.
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={!tarefas.length || !nome.trim() || !setorId}>
                  Criar checklist e importar {tarefas.length} tarefas
                </Button>
                <a href="." className="font-body font-semibold text-sm text-ink-muted px-2 py-2.5">
                  Cancelar
                </a>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
