import type { EstadoAlerta } from "@/lib/execucoes/alertas";

export interface FiltrosAlertas {
  busca: string;
  unidadeId: string;
  setorId: string;
  estado: EstadoAlerta | "todos" | "atencao";
}

interface ItemFiltravel {
  nome: string;
  unidadeId: string;
  unidadeNome: string;
  setorId: string;
  setorNome: string;
  estado: EstadoAlerta;
  executorNome?: string | null;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

export function filtrarAlertas<T extends ItemFiltravel>(itens: T[], filtros: FiltrosAlertas): T[] {
  const busca = normalizar(filtros.busca);
  return itens.filter((item) =>
    (!filtros.unidadeId || item.unidadeId === filtros.unidadeId) &&
    (!filtros.setorId || item.setorId === filtros.setorId) &&
    (filtros.estado === "todos" ||
      (filtros.estado === "atencao"
        ? ["nao_iniciado", "nao_executado", "atrasado"].includes(item.estado)
        : item.estado === filtros.estado)) &&
    (!busca || normalizar([item.nome, item.unidadeNome, item.setorNome, item.executorNome ?? ""].join(" ")).includes(busca))
  );
}
