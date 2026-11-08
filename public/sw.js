self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Alerta de checklist";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Há um checklist que precisa de atenção.",
      icon: "/icon.png",
      data: { url: payload.url || "/alertas" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/alertas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existente = clients.find((client) => "focus" in client);
      if (existente) {
        return existente.navigate(url).then(() => existente.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
