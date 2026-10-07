// Service worker al aplicației (PWA): păstrează în cache „scheletul” aplicației pentru modul offline și afișează notificările push.
// Pe localhost nu face cache (se dezinstalează singur), ca să nu încurce dezvoltarea.
// Versiunea cache-ului; la schimbare se șterg cache-urile vechi (la activare).
const CACHE_NAME = "kelunia-shell-v17";
// Fișierele păstrate la instalare, pentru deschiderea aplicației fără internet.
const APP_SHELL = ["/", "/dashboard", "/login", "/manifest.json", "/icon-192.png", "/icon-512.png", "/kelunia-logo.png", "/semnatura.png"];
// Rulează pe adresa locală (dezvoltare)?
const IS_LOCAL =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "0.0.0.0";

// Instalare: pe adresa locală se activează imediat; altfel se pun în cache fișierele scheletului.
self.addEventListener("install", (event) => {
  if (IS_LOCAL) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activare: pe adresa locală se șterg cache-urile și service worker-ul se dezinstalează; altfel se șterg cache-urile vechi și se preia controlul paginilor.
self.addEventListener("activate", (event) => {
  if (IS_LOCAL) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith("kelunia-shell-")).map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cereri: doar GET către aceeași origine. Fișierele din /_next/static/ (cu hash în nume) sunt cache-first; celelalte din /_next/ nu se ating.
// Navigările merg la rețea, cu pagina din cache ca rezervă offline; restul cererilor sunt rețea-întâi, cu cache doar ca rezervă.
self.addEventListener("fetch", (event) => {
  if (IS_LOCAL) {
    return;
  }

  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  if (request.mode === "navigate") {
    const fallbackPath = url.pathname.startsWith("/dashboard") ? "/dashboard" : "/";
    event.respondWith(fetch(request).catch(async () => (await caches.match(fallbackPath)) || (await caches.match("/")) || Response.error()));
    return;
  }

  // Network-first: the exported RSC payloads (dashboard.txt, __next.*.txt)
  // reference build-hashed chunks, so serving them cache-first pins the app to
  // an old build after every deploy. The cache is only an offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error())
  );
});

// Notificare push primită: citește titlul, textul și adresa din mesaj și o afișează, păstrând adresa pentru atingere.
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { data: { body: event.data.text() } };
  }

  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || "Kelunia";
  const body = data.body || notification.body || "";
  const url = data.url || payload.fcmOptions?.link || "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || notification.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.tag || data.bookingId || "kelunia-notification",
      requireInteraction: true,
      data: {
        bookingId: data.bookingId || "",
        url,
      },
    })
  );
});

// Atingerea unei notificări: închide notificarea, apoi folosește o fereastră deschisă (o duce la adresa rezervării) sau deschide una nouă.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
