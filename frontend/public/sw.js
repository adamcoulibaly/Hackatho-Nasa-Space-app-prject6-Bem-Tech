/* ForoSat — mode hors connexion.
 * Pages : réseau d'abord, puis la dernière version gardée, sinon la page « hors connexion ».
 * Données ForoSat (/api/climat, /api/saisons, /api/projections, /api/semis) : réseau d'abord, puis la copie gardée.
 * Fichiers de l'application (/_next/static) : copie gardée d'abord (ils ne changent jamais pour une même adresse).
 * Rien n'est gardé pour l'assistant IA ni pour la photo (envoi de données), ni pour les sites extérieurs. */
const VERSION = "forosat-v1";
const PAGE_HORS_LIGNE = "/hors-ligne";
const A_GARDER = /^\/api\/(climat|saisons|projections|semis)\//;

/** Garde la page « hors connexion » et tous ses fichiers (scripts, styles) : elle doit s'afficher sans réseau. */
async function garderPageHorsLigne() {
  const cache = await caches.open(VERSION);
  const r = await fetch(PAGE_HORS_LIGNE, { cache: "reload" });
  if (!r.ok) return;
  const html = await r.clone().text();
  await cache.put(PAGE_HORS_LIGNE, r);
  const fichiers = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  await Promise.all(fichiers.map((f) => cache.add(f).catch(() => undefined)));
}

self.addEventListener("install", (e) => {
  e.waitUntil(garderPageHorsLigne().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

/** Délai maximal d'attente du réseau : au-delà (2G faible), on sert la copie gardée. */
const DELAI_RESEAU = 5000;

function delai(ms) {
  return new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("délai réseau dépassé")), ms));
}

async function reseauDabord(requete, secours) {
  const cache = await caches.open(VERSION);
  // La réponse du réseau met à jour la copie gardée, même si elle arrive après le délai.
  const reseau = fetch(requete).then((r) => {
    if (r.ok) cache.put(requete, r.clone());
    return r;
  });
  try {
    const r = await Promise.race([reseau, delai(DELAI_RESEAU)]);
    if (r.ok) return r;
    // Erreur du serveur (ex. NASA POWER en panne) : la dernière copie correcte vaut mieux qu'une page d'erreur.
    const garde = await cache.match(requete, { ignoreVary: true });
    return garde ?? r;
  } catch {
    const garde = await cache.match(requete, { ignoreVary: true });
    if (garde) return garde;
    // Page jamais consultée : on redirige vers la page « hors connexion » (servir son contenu sous une autre adresse
    // tromperait le routeur de l'application).
    if (secours) return Response.redirect(secours, 302);
    return Response.error();
  }
}

async function cacheDabord(requete) {
  const cache = await caches.open(VERSION);
  const garde = await cache.match(requete);
  if (garde) return garde;
  const r = await fetch(requete);
  if (r.ok) cache.put(requete, r.clone());
  return r;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) return e.respondWith(cacheDabord(req));
  if (A_GARDER.test(url.pathname)) return e.respondWith(reseauDabord(req));
  // Navigations et données de page de Next (?_rsc=…) : le chemin sans paramètres identifie la page gardée.
  if (req.mode === "navigate") {
    if (url.pathname === PAGE_HORS_LIGNE) return e.respondWith(reseauDabord(req));
    return e.respondWith(reseauDabord(new Request(url.origin + url.pathname, { credentials: "same-origin" }), PAGE_HORS_LIGNE));
  }
  if (req.headers.get("RSC") === "1") return e.respondWith(reseauDabord(req));
});
