import { createClient } from "@/lib/supabase/server";
import type { AgendaOperacional } from "@/lib/execucoes/schedule";

export async function buscarAgendaEmpresa(
  empresaId: string,
): Promise<AgendaOperacional> {
  const { data, error } = await createClient()
    .from("empresas")
    .select("fuso_horario, inicio_operacao, fim_operacao")
    .eq("id", empresaId)
    .maybeSingle();

  if (error || !data) {
    console.error("Falha ao carregar agenda da empresa:", error?.message ?? "Empresa não encontrada.");
    throw new Error("Não foi possível carregar a agenda da empresa.");
  }

  return {
    fuso_horario: data.fuso_horario,
    inicio_operacao: data.inicio_operacao,
    fim_operacao: data.fim_operacao,
  };
}
