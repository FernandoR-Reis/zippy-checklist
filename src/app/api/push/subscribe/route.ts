import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getOrCreateUsuarioAtual } from "@/lib/usuarios/actions";

interface SubscriptionBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

function erroPermissao() {
  return NextResponse.json({ error: "Apenas gestores e administradores podem configurar alertas." }, { status: 403 });
}

export async function POST(request: Request) {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario || !["administrador", "gestor"].includes(usuario.perfil)) return erroPermissao();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Notificações não estão configuradas no servidor." }, { status: 503 });
  }

  let body: SubscriptionBody;
  try {
    body = await request.json() as SubscriptionBody;
  } catch {
    return NextResponse.json({ error: "Inscrição de notificações inválida." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ error: "Inscrição de notificações incompleta." }, { status: 400 });
  }

  const { error } = await admin.from("push_subscriptions").upsert(
    { usuario_id: usuario.id, endpoint, p256dh, auth, updated_at: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Falha ao salvar inscrição push:", error.message);
    return NextResponse.json({ error: "Não foi possível salvar este aparelho para receber notificações." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const usuario = await getOrCreateUsuarioAtual();
  if (!usuario || !["administrador", "gestor"].includes(usuario.perfil)) return erroPermissao();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Notificações não estão configuradas no servidor." }, { status: 503 });
  }

  let body: { endpoint?: unknown };
  try {
    body = await request.json() as { endpoint?: unknown };
  } catch {
    return NextResponse.json({ error: "Inscrição de notificações inválida." }, { status: 400 });
  }

  if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Inscrição de notificações inválida." }, { status: 400 });
  }

  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("usuario_id", usuario.id)
    .eq("endpoint", body.endpoint);
  if (error) {
    console.error("Falha ao remover inscrição push:", error.message);
    return NextResponse.json({ error: "Não foi possível desativar as notificações." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
