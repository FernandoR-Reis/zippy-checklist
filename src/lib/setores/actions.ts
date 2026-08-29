"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { unidadeDoUsuario } from "@/lib/unidades/guard";
import type { Setor } from "@/types/database";
const caminho = (id: string) => `/unidades/${id}/setores`;

export async function listarSetores(unidadeId: string): Promise<Setor[]> {
  const { data } = await createClient().from("setores").select("*").eq("unidade_id", unidadeId).order("nome");
  return (data ?? []) as Setor[];
}
export async function criarSetor(unidadeId: string, formData: FormData) {
  const contexto = await unidadeDoUsuario(unidadeId);
  const nome = String(formData.get("nome") ?? "").trim();
  if (!contexto || contexto.usuario.perfil !== "gestor") redirect(`${caminho(unidadeId)}?erro=Sem%20permiss%C3%A3o`);
  if (!nome) redirect(`${caminho(unidadeId)}?erro=Informe%20o%20nome%20do%20setor.`);
  const { error } = await createClient().from("setores").insert({ unidade_id: unidadeId, nome });
  if (error) redirect(`${caminho(unidadeId)}?erro=${encodeURIComponent(error.code === "23505" ? "Já existe um setor com esse nome nesta unidade." : "Não foi possível criar o setor.")}`);
  revalidatePath(caminho(unidadeId)); redirect(caminho(unidadeId));
}
export async function atualizarSetor(unidadeId: string, setorId: string, formData: FormData) {
  const contexto = await unidadeDoUsuario(unidadeId);
  const nome = String(formData.get("nome") ?? "").trim();
  if (!contexto || contexto.usuario.perfil !== "gestor") redirect(caminho(unidadeId));
  if (!nome) redirect(`${caminho(unidadeId)}?editar=${setorId}&erro=Informe%20o%20nome%20do%20setor.`);
  const { error } = await createClient().from("setores").update({ nome }).eq("id", setorId).eq("unidade_id", unidadeId);
  if (error) redirect(`${caminho(unidadeId)}?editar=${setorId}&erro=${encodeURIComponent(error.code === "23505" ? "Já existe um setor com esse nome nesta unidade." : "Não foi possível salvar.")}`);
  revalidatePath(caminho(unidadeId)); redirect(caminho(unidadeId));
}
export async function alternarStatusSetor(unidadeId: string, setorId: string, ativo: boolean, _formData: FormData) {
  const contexto = await unidadeDoUsuario(unidadeId);
  if (!contexto || contexto.usuario.perfil !== "gestor") return;
  await createClient().from("setores").update({ ativo }).eq("id", setorId).eq("unidade_id", unidadeId);
  revalidatePath(caminho(unidadeId));
}