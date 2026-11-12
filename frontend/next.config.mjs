/** @type {import("next").NextConfig} */
const config = {
  async headers() {
    // Le service worker du mode hors connexion doit toujours être relu (mise à jour de l'app).
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};
export default config;
