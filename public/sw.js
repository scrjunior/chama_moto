self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}

  const title = data.title || "Nova chamada!";
  const body = data.body || "Você recebeu uma solicitação.";
  const url = data.url || "/taxista/home";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/taxista/home";
  event.waitUntil(clients.openWindow(url));
});