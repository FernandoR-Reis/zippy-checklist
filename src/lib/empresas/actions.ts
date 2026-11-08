"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";
import type { Empresa } from "@/types/database";

export async function buscarEmpresa(empresaId: string): Promise<Empresa | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle();
  if (error) {
    console.error("Falha ao carregar empresa:", error.message);
    throw new Error("Não foi possível carregar os dados da empresa.");
  }
  return data as Empresa | null;
}

export async function atualizarConfiguracaoEmpresa(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const fuso_horario = String(formData.get("fuso_horario") ?? "").trim();
  const inicio_operacao = String(formData.get("inicio_operacao") ?? "").trim();
  const fim_operacao = String(formData.get("fim_operacao") ?? "").trim();
  const usuario = await getOrCreateUsuarioAtual();
  const erroPath = (mensagem: string) => `/empresa?erro=${encodeURIComponent(mensagem)}`;
  if (!usuario || usuario.perfil !== "administrador" || usuario.empresa_id !== empresaId) {
    redirect(erroPath("Somente o administrador pode alterar as configurações da empresa."));
  }
  if (!nome || nome.length > 120) {
    redirect(erroPath("Informe um nome com até 120 caracteres."));
  }
  const horarioValido = (valor: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor);
  if (!horarioValido(inicio_operacao) || !horarioValido(fim_operacao) || inicio_operacao === fim_operacao) {
    redirect(erroPath("Informe horários de início e fim diferentes e válidos."));
  }
  if (!fuso_horario || fuso_horario.length > 64) {
    redirect(erroPath("Selecione um fuso horário válido."));
  }
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso_horario });
  } catch {
    redirect(erroPath("Selecione um fuso horário válido."));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("empresas")
    .update({ nome, fuso_horario, inicio_operacao, fim_operacao })
    .eq("id", empresaId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Falha ao atualizar configurações da empresa:", error?.message ?? "Nenhuma empresa atualizada.");
    redirect(erroPath("Não foi possível salvar as configurações. Tente novamente."));
  }
  revalidatePath("/empresa");
  revalidatePath("/hoje");
  revalidatePath("/alertas");
  redirect("/empresa?salvo=1");
}
