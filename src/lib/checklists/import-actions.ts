"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import type { Recorrencia, TipoTarefa } from "@/types/database";

const recorrencias: Recorrencia[] = ["diaria", "semanal", "mensal"];
const tipos: TipoTarefa[] = ["checkbox", "sim_nao", "numero", "texto"];
const listaPath = (unidadeId: string) => `/unidades/${unidadeId}/checklists`;
const importarPath = (unidadeId: string) => `${listaPath(unidadeId)}/importar`;

export async function importarChecklistPlanilha(
  unidadeId: string,
  formData: FormData,
) {
  const contexto = await unidadeDoUsuario(unidadeId);
  if (!contexto || contexto.usuario.perfil !== "gestor") {
    redirect(listaPath(unidadeId));
  }
  if (formData.get("confirmacao") !== "confirmar") {
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Revise a prévia e confirme antes de importar.")}`);
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const setorId = String(formData.get("setor_id") ?? "").trim();
  const responsavelId = String(formData.get("responsavel_id") ?? "").trim();
  const recorrencia = String(formData.get("recorrencia") ?? "") as Recorrencia;
  const horario = String(formData.get("horario") ?? "").trim();
  const titulos = formData.getAll("titulo").map((valor) => String(valor).trim());
  const tiposEnviados = formData.getAll("tipo").map((valor) => String(valor) as TipoTarefa);

  if (
    !nome ||
    nome.length > 120 ||
    !setorId ||
    !responsavelId ||
    !recorrencias.includes(recorrencia) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario) ||
    titulos.length === 0 ||
    titulos.length > 300 ||
    titulos.some((titulo, indice) => !titulo || titulo.length > 250 || !tipos.includes(tiposEnviados[indice]))
  ) {
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Confira os dados do checklist e as tarefas da prévia.")}`);
  }

  const supabase = createClient();
  const [resultadoSetor, resultadoResponsavel] = await Promise.all([
    supabase
      .from("setores")
      .select("id")
      .eq("id", setorId)
      .eq("unidade_id", unidadeId)
      .eq("ativo", true)
      .maybeSingle(),
    supabase
      .from("usuarios")
      .select("id")
      .eq("id", responsavelId)
      .eq("empresa_id", contexto.usuario.empresa_id!)
      .maybeSingle(),
  ]);
  if (resultadoSetor.error || resultadoResponsavel.error) {
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Não foi possível validar setor e responsável. Tente novamente.")}`);
  }
  if (!resultadoSetor.data || !resultadoResponsavel.data) {
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Selecione um setor ativo e um responsável válido.")}`);
  }

  const { data: checklist, error: erroChecklist } = await supabase
    .from("checklist_templates")
    .insert({
      unidade_id: unidadeId,
      setor_id: setorId,
      responsavel_id: responsavelId,
      nome,
      descricao: null,
      recorrencia,
      horario,
      ativo: true,
    })
    .select("id")
    .single();

  if (erroChecklist || !checklist) {
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Não foi possível criar o checklist. Tente novamente.")}`);
  }

  const { error: erroTarefas } = await supabase.from("tarefa_templates").insert(
    titulos.map((titulo, indice) => ({
      checklist_template_id: checklist.id,
      titulo,
      tipo: tiposEnviados[indice],
      obrigatoria: formData.get(`obrigatoria-${indice}`) === "on",
      ordem: indice,
    })),
  );

  if (erroTarefas) {
    const { error: erroRemocao } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", checklist.id)
      .eq("unidade_id", unidadeId);
    if (erroRemocao) {
      redirect(`${listaPath(unidadeId)}/${checklist.id}?erroImportacao=${encodeURIComponent("O checklist foi criado, mas as tarefas não puderam ser adicionadas. Revise ou remova o checklist.")}`);
    }
    redirect(`${importarPath(unidadeId)}?erro=${encodeURIComponent("Não foi possível adicionar as tarefas; o checklist não foi mantido. Tente novamente.")}`);
  }

  const checklistPath = `${listaPath(unidadeId)}/${checklist.id}`;
  revalidatePath(listaPath(unidadeId));
  revalidatePath(checklistPath);
  revalidatePath("/hoje");
  redirect(`${checklistPath}?importadas=${titulos.length}`);
}
