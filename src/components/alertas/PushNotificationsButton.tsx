"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

function chaveAplicacaoServer(chave: string) {
  const base64 = chave.replace(/-/g, "+").replace(/_/g, "/");
  const binario = window.atob(base64);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}

export function PushNotificationsButton() {
  const [inscrito, setInscrito] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const chavePublica = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

  useEffect(() => {
    let ativo = true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js")
      .then((registro) => registro.pushManager.getSubscription())
      .then((inscricao) => {
        if (ativo) setInscrito(Boolean(inscricao));
      })
      .catch((error: unknown) => {
        console.error("Falha ao verificar inscrição de notificações:", error);
        if (ativo) setMensagem("Não foi possível preparar as notificações neste aparelho.");
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function alternarInscricao() {
    if (ocupado) return;
    if (!chavePublica) {
      setMensagem("As notificações ainda não foram configuradas no servidor.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMensagem("Este navegador não oferece suporte a notificações push.");
      return;
    }

    setOcupado(true);
    setMensagem("");
    try {
      const registro = await navigator.serviceWorker.register("/sw.js");
      const atual = await registro.pushManager.getSubscription();
      if (atual) {
        const resposta = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: atual.endpoint }),
        });
        if (!resposta.ok) throw new Error("Não foi possível desativar as notificações.");
        await atual.unsubscribe();
        setInscrito(false);
        setMensagem("Notificações desativadas neste aparelho.");
        return;
      }

      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setMensagem("Permita as notificações nas configurações do navegador.");
        return;
      }

      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveAplicacaoServer(chavePublica),
      });
      const resposta = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inscricao),
      });
      if (!resposta.ok) {
        await inscricao.unsubscribe();
        throw new Error("Não foi possível salvar este aparelho para receber notificações.");
      }

      setInscrito(true);
      setMensagem("Este aparelho receberá alertas de prazo dos checklists.");
    } catch (error) {
      console.error("Falha ao atualizar notificações push:", error);
      setMensagem(error instanceof Error ? error.message : "Não foi possível atualizar as notificações.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      <Button type="button" variant={inscrito ? "secondary" : "outline"} onClick={alternarInscricao} disabled={ocupado}>
        {ocupado ? "Aguarde..." : inscrito ? "Desativar notificações neste aparelho" : "Ativar notificações no celular"}
      </Button>
      {mensagem && <p role="status" className="mt-2 font-body text-xs text-ink-muted">{mensagem}</p>}
      <p className="mt-2 font-body text-xs text-ink-muted">
        No iPhone, adicione o app à tela inicial e abra-o por lá para permitir notificações.
      </p>
    </div>
  );
}
