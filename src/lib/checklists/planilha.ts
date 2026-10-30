export type LinhaPlanilha = string[];

export type AbaPlanilha = {
  nome: string;
  linhas: LinhaPlanilha[];
};

const MAX_LINHAS = 10_000;
const MAX_COLUNAS = 100;
const MAX_CELULAS = 200_000;

function valorTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");
  return String(valor).trim();
}

function validarDimensoes(abas: AbaPlanilha[]) {
  let celulas = 0;
  for (const aba of abas) {
    if (aba.linhas.length > MAX_LINHAS) {
      throw new Error(`A aba "${aba.nome}" excede o limite de ${MAX_LINHAS} linhas.`);
    }
    for (const linha of aba.linhas) {
      if (linha.length > MAX_COLUNAS) {
        throw new Error(`A aba "${aba.nome}" excede o limite de ${MAX_COLUNAS} colunas.`);
      }
      celulas += linha.length;
      if (celulas > MAX_CELULAS) {
        throw new Error(`A planilha excede o limite de ${MAX_CELULAS} células.`);
      }
    }
  }
}

function apararLinhas(linhas: LinhaPlanilha[]): LinhaPlanilha[] {
  const resultado = linhas.map((linha) => {
    const aparada = [...linha];
    while (aparada.length && !aparada.at(-1)) aparada.pop();
    return aparada;
  });
  while (resultado.length && !resultado.at(-1)?.some(Boolean)) resultado.pop();
  return resultado;
}

function detectarDelimitador(texto: string): string {
  const primeiraLinha = texto.split(/\r\n|\n|\r/, 1)[0] ?? "";
  const candidatos = [",", ";", "\t", "|"];
  let melhor = ",";
  let maiorContagem = -1;
  for (const candidato of candidatos) {
    let entreAspas = false;
    let contagem = 0;
    for (let indice = 0; indice < primeiraLinha.length; indice += 1) {
      const caractere = primeiraLinha[indice];
      if (caractere === '"') {
        if (entreAspas && primeiraLinha[indice + 1] === '"') {
          indice += 1;
        } else {
          entreAspas = !entreAspas;
        }
      } else if (caractere === candidato && !entreAspas) {
        contagem += 1;
      }
    }
    if (contagem > maiorContagem) {
      melhor = candidato;
      maiorContagem = contagem;
    }
  }
  return melhor;
}

export function analisarCsv(texto: string): AbaPlanilha[] {
  const conteudo = texto.replace(/^\uFEFF/, "");
  const delimitador = detectarDelimitador(conteudo);
  const linhas: LinhaPlanilha[] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;

  for (let indice = 0; indice < conteudo.length; indice += 1) {
    const caractere = conteudo[indice];
    if (caractere === '"') {
      if (entreAspas && conteudo[indice + 1] === '"') {
        celula += '"';
        indice += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (caractere === delimitador && !entreAspas) {
      linha.push(celula.trim());
      celula = "";
    } else if ((caractere === "\n" || caractere === "\r") && !entreAspas) {
      if (caractere === "\r" && conteudo[indice + 1] === "\n") indice += 1;
      linha.push(celula.trim());
      linhas.push(linha);
      linha = [];
      celula = "";
      if (linhas.length > MAX_LINHAS) {
        throw new Error(`O arquivo excede o limite de ${MAX_LINHAS} linhas.`);
      }
    } else {
      celula += caractere;
    }
  }

  if (entreAspas) {
    throw new Error("O CSV contém uma célula com aspas sem fechamento.");
  }
  if (celula || linha.length) {
    linha.push(celula.trim());
    linhas.push(linha);
  }

  const abas = [{ nome: "CSV", linhas: apararLinhas(linhas) }];
  validarDimensoes(abas);
  return abas;
}

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

const termosCabecalho = {
  tarefa: ["tarefa", "atividade", "item", "acao", "verificacao", "procedimento", "passo"],
  setor: ["setor", "categoria", "area", "departamento"],
  unidade: ["unidade", "loja", "filial", "local"],
};

export function sugerirLinhaCabecalho(linhas: LinhaPlanilha[]): number {
  let melhorIndice = -1;
  let melhorPontuacao = 0;
  for (let indice = 0; indice < Math.min(linhas.length, 20); indice += 1) {
    const valores = linhas[indice].map(normalizarTexto);
    const pontuacao = valores.reduce((total, valor) => {
      return (
        total +
        (Object.values(termosCabecalho).some((termos) =>
          termos.some((termo) => valor.includes(termo)),
        )
          ? 1
          : 0)
      );
    }, 0);
    if (pontuacao > melhorPontuacao) {
      melhorIndice = indice;
      melhorPontuacao = pontuacao;
    }
  }
  return melhorIndice;
}

function pontuacaoCabecalho(valor: string, termos: string[]): number {
  const normalizado = normalizarTexto(valor);
  return termos.reduce(
    (pontuacao, termo) =>
      pontuacao + (normalizado === termo ? 3 : normalizado.includes(termo) ? 1 : 0),
    0,
  );
}

export function sugerirColunas(
  linhas: LinhaPlanilha[],
  linhaCabecalho: number,
): { tarefa: number; setor: number; unidade: number } {
  const quantidadeColunas = Math.max(1, ...linhas.slice(0, 20).map((linha) => linha.length));
  const cabecalho = linhaCabecalho >= 0 ? linhas[linhaCabecalho] ?? [] : [];
  let colunaTarefa = 0;
  let maiorPontuacao = 0;
  let colunaSetor = -1;
  let pontuacaoSetor = 0;
  let colunaUnidade = -1;
  let pontuacaoUnidade = 0;

  for (let coluna = 0; coluna < quantidadeColunas; coluna += 1) {
    const titulo = cabecalho[coluna] ?? "";
    const pontuacaoTarefa = pontuacaoCabecalho(titulo, termosCabecalho.tarefa);
    if (pontuacaoTarefa > maiorPontuacao) {
      colunaTarefa = coluna;
      maiorPontuacao = pontuacaoTarefa;
    }
    const pontuacaoCategoria = pontuacaoCabecalho(titulo, termosCabecalho.setor);
    if (pontuacaoCategoria > pontuacaoSetor) {
      colunaSetor = coluna;
      pontuacaoSetor = pontuacaoCategoria;
    }
    const pontuacaoLocal = pontuacaoCabecalho(titulo, termosCabecalho.unidade);
    if (pontuacaoLocal > pontuacaoUnidade) {
      colunaUnidade = coluna;
      pontuacaoUnidade = pontuacaoLocal;
    }
  }

  if (maiorPontuacao === 0) {
    let maiorQuantidade = -1;
    for (let coluna = 0; coluna < quantidadeColunas; coluna += 1) {
      const quantidade = linhas
        .slice(Math.max(linhaCabecalho, -1) + 1)
        .filter((linha) => Boolean(linha[coluna]?.trim())).length;
      if (quantidade > maiorQuantidade) {
        colunaTarefa = coluna;
        maiorQuantidade = quantidade;
      }
    }
  }

  return { tarefa: colunaTarefa, setor: colunaSetor, unidade: colunaUnidade };
}

export function sugerirSetorId(
  linhas: LinhaPlanilha[],
  colunaSetor: number,
  primeiraLinha: number,
  setores: { id: string; nome: string }[],
  ultimaLinha?: number,
  linhaCabecalho = -1,
): string {
  if (colunaSetor < 0) return "";
  const nomesSetores = new Map(
    setores.map((setor) => [normalizarTexto(setor.nome), setor.id]),
  );
  const categorias = new Set(
    linhas
      .slice(primeiraLinha, ultimaLinha ?? linhas.length)
      .filter((_, indice) => indice + primeiraLinha !== linhaCabecalho)
      .map((linha) => normalizarTexto(linha[colunaSetor] ?? ""))
      .filter(Boolean),
  );
  if (categorias.size !== 1) return "";
  return nomesSetores.get([...categorias][0]) ?? "";
}

export function nomeColuna(indice: number): string {
  let numero = indice + 1;
  let nome = "";
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    nome = String.fromCharCode(65 + resto) + nome;
    numero = Math.floor((numero - 1) / 26);
  }
  return nome;
}

export function prepararAbasExcel(
  dados: { sheet: string; data: unknown[][] }[],
): AbaPlanilha[] {
  const abas = dados.map((aba) => ({
    nome: aba.sheet,
    linhas: apararLinhas(aba.data.map((linha) => linha.map(valorTexto))),
  }));
  validarDimensoes(abas);
  return abas;
}
