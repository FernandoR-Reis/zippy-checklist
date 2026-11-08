import webpush from "web-push";

export interface PushSubscriptionSalva {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function configurarWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("As chaves Web Push não estão configuradas.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function enviarPush(
  subscription: PushSubscriptionSalva,
  payload: { title: string; body: string; url: string },
) {
  configurarWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}
