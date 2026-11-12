import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/bienvenue", "/tableau", "/parcelle", "/climat", "/rotations", "/rotations/B", "/simulateur", "/risques", "/fiche/B", "/methode", "/lexique", "/conseiller"];

test("parcours complet : parcelle → climat → rotations → détail → fiche", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/climat$/);
  await page.getByRole("link", { name: "Voir les 3 rotations" }).click();
  await expect(page).toHaveURL(/\/rotations$/);
  await page.getByRole("link", { name: "Voir le détail de la rotation B" }).click();
  await expect(page).toHaveURL(/\/rotations\/B$/);
  await page.getByRole("link", { name: "Partager la fiche" }).click();
  await expect(page).toHaveURL(/\/fiche\/B\?r=poro&/);
  await expect(page.getByText(/^Rotation B · /)).toBeVisible();
  await expect(page.getByRole("link", { name: "Envoyer sur WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=.*fiche%2FB/);
});

test("la parcelle saisie survit à un rechargement", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/climat$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le climat de votre champ");
});

test("/climat sans parcelle saisie propose l'étape 1", async ({ page }) => {
  await page.goto("/climat");
  await expect(page.getByText("Commencez par situer votre champ")).toBeVisible();
});

test("/rotations sans parcelle saisie propose l'étape 1", async ({ page }) => {
  await page.goto("/rotations");
  await expect(page.getByText("Commencez par situer votre champ")).toBeVisible();
});

test("une rotation inconnue affiche « Page introuvable »", async ({ page }) => {
  await page.goto("/rotations/Z");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toBeVisible();
});

test("formulaire : sans culture, l'analyse est bloquée avec un message", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Maïs", exact: true }).click();
  await page.getByRole("button", { name: "Coton", exact: true }).click();
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page.locator("form [role=\"alert\"]")).toContainText("Choisissez au moins une culture.");
  await expect(page).toHaveURL(/\/parcelle$/);
});

for (const route of ROUTES) {
  test(`pas de défilement horizontal de la page : ${route}`, async ({ page }) => {
    await page.goto("/parcelle");
    await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
    await page.waitForURL(/\/climat$/);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(sw).toBeLessThanOrEqual(iw);
  });
}

test("l'écran d'entrée mène au formulaire de parcelle", async ({ page }) => {
  await page.goto("/bienvenue");
  await page.getByRole("link", { name: "Commencer" }).click();
  await expect(page).toHaveURL(/\/parcelle$/);
});

test("le tableau de bord résume le champ et mène aux rotations", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.waitForURL(/\/climat$/);
  await page.goto("/tableau");
  await expect(page.getByText(/Mesures NASA POWER du/)).toBeVisible();
  await page.getByRole("link", { name: /Rotation conseillée/ }).click();
  await expect(page).toHaveURL(/\/rotations$/);
});

test("l'en-tête n'affiche aucun numéro", async ({ page, isMobile }) => {
  test.skip(isMobile, "sur téléphone, la barre du bas remplace la navigation du haut");
  await page.goto("/parcelle");
  const nav = page.getByRole("navigation", { name: "Étapes" });
  await expect(nav).not.toContainText(/\d/);
});

test("mouvement réduit : le contenu apparaît sans déplacement", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3100/parcelle");
  const bloc = page.locator("main > *").first();
  await expect(bloc).toHaveCSS("opacity", "1");
  const translate = await bloc.evaluate((el) => getComputedStyle(el).translate);
  expect(["none", "0px", "0px 0px"]).toContain(translate);
  await ctx.close();
});

test("les blocs sous la ligne de flottaison apparaissent au défilement", async ({ page }) => {
  await page.goto("/");
  const pied = page.locator("footer");
  await pied.scrollIntoViewIfNeeded();
  await expect(pied).toHaveCSS("opacity", "1");
});

test("carte : dessiner la parcelle met à jour la surface", async ({ page, isMobile }) => {
  await page.goto("/parcelle");
  const carte = page.getByTestId("carte");
  await expect(carte.locator(".leaflet-container, .leaflet-pane").first()).toBeAttached();
  await page.getByRole("button", { name: "Dessiner ma parcelle" }).click();
  await carte.scrollIntoViewIfNeeded();
  const box = (await carte.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const [dx, dy] of [[-40, -40], [40, -40], [40, 40], [-40, 40]]) {
    if (isMobile) await page.touchscreen.tap(cx + dx, cy + dy);
    else await page.mouse.click(cx + dx, cy + dy);
    await page.waitForTimeout(350); // évite qu'un deuxième toucher rapide soit lu comme un double-tap (zoom)
  }
  await page.getByRole("button", { name: /Terminer le contour \(4 points\)/ }).click();
  await expect(page.getByText(/Parcelle enregistrée : .* ha\./)).toBeVisible();
  const surface = Number(await page.getByLabel("Surface (ha)").inputValue());
  expect(surface).toBeGreaterThan(0);
  expect(surface).not.toBe(2);
});

test("carte : la couche SMAP signale qu'elle commence en 2015", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Humidité du sol" }).click();
  await expect(page.getByLabel(/Année/)).toBeVisible();
  await page.getByLabel(/Année/).fill("2010");
  await expect(page.getByText(/données à partir de 2015/)).toBeVisible();
});

test("assistant IA sans clé : l'écran le dit clairement", async ({ page }) => {
  test.skip(!!process.env.LLM_API_KEY, "une clé est configurée");
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.waitForURL(/\/climat$/);
  await page.goto("/rotations/B");
  await page.getByRole("button", { name: "Expliquer simplement" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "pas encore configuré" })).toBeVisible();
});

async function toucher(page: import("@playwright/test").Page, isMobile: boolean, x: number, y: number) {
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await page.waitForTimeout(350);
}

test("carte : on ferme le contour en touchant le premier point, et on peut retirer un point", async ({ page, isMobile }) => {
  await page.goto("/parcelle");
  const carte = page.getByTestId("carte");
  await expect(carte.locator(".leaflet-pane").first()).toBeAttached();
  await page.getByRole("button", { name: "Dessiner ma parcelle" }).click();
  await carte.scrollIntoViewIfNeeded();
  const b = (await carte.boundingBox())!;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2 - 40;
  for (const [dx, dy] of [[-50, -40], [50, -40], [50, 40], [0, 60]]) await toucher(page, isMobile, cx + dx, cy + dy);
  await page.getByRole("button", { name: "Retirer le dernier point" }).click();
  await expect(page.getByText(/^3 points · ≈ /)).toBeVisible();
  await toucher(page, isMobile, cx - 50, cy - 40); // premier point
  await expect(page.getByText(/Parcelle enregistrée : .* ha\. Région détectée : Poro/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Redessiner ma parcelle" })).toBeVisible();
});

test("carte : fond satellite par défaut, plan au choix", async ({ page }) => {
  await page.goto("/parcelle");
  await expect(page.getByRole("button", { name: "Satellite" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Plan" }).click();
  await expect(page.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "true");
});

test("toutes les régions : le climat suit la région choisie", async ({ page }) => {
  await page.goto("/parcelle");
  await expect(page.locator("#region option")).toHaveCount(33);
  await page.getByLabel("Région").selectOption("gbeke");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/climat$/);
  await expect(page.getByText(/Étape 2 sur 3 · Gbêkê/i)).toBeVisible();
  await expect(page.getByText(/NASA POWER, Bouaké/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "L'eau stockée dans la zone, sur 20 ans" })).toBeVisible();
  await page.goto("/rotations");
  await expect(page.getByText(/Étape 3 sur 3 · Gbêkê/i)).toBeVisible();
});

test("carte : le mode dessin garde les styles de Leaflet (tuiles visibles)", async ({ page }) => {
  await page.goto("/parcelle");
  const carte = page.getByTestId("carte");
  await expect(carte).toHaveClass(/leaflet-container/);
  await page.getByRole("button", { name: "Dessiner ma parcelle" }).click();
  await expect(carte).toHaveClass(/leaflet-container/);
  await expect(carte).toHaveClass(/leaflet-crosshair/);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(carte).toHaveClass(/leaflet-container/);
  await expect(carte).not.toHaveClass(/leaflet-crosshair/);
});

test("les priorités changent la rotation proposée", async ({ page }) => {
  const sequenceB = async () => (await page.locator("article", { has: page.getByRole("link", { name: "Voir le détail de la rotation B" }) }).getByTestId("sequence").innerText()).replace(/\s+/g, " ");
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/rotations");
  const avant = await sequenceB();
  await page.goto("/parcelle");
  for (const p of ["Rendre mon sol plus fertile", "Garder un bon revenu", "Nourrir mon bétail (fourrage)"]) await page.getByLabel(p).uncheck();
  for (const p of ["Utiliser moins d'eau", "Résister aux sécheresses"]) await page.getByLabel(p).check();
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/rotations");
  expect(await sequenceB()).not.toBe(avant);
});

test("un lien de fiche incomplet est signalé", async ({ page }) => {
  await page.goto("/fiche/B?r=poro");
  await expect(page.getByRole("heading", { name: "Lien incomplet" })).toBeVisible();
});

test("mode app : l'en-tête et la barre du bas du site disparaissent pour toute la session", async ({ page }) => {
  await page.goto("/parcelle?app=1");
  await expect(page.locator("html")).toHaveClass(/mode-app/);
  await expect(page.locator("header")).toBeHidden();
  await page.goto("/lexique");
  await expect(page.locator("header")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Navigation" })).toBeHidden();
});

test("mode app sur petit téléphone (360 px) : aucune page plus large que l'écran", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/parcelle?app=1");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/climat/);
  for (const route of [...ROUTES, "/fiche/B?r=poro&s=2&c=Ma%C3%AFs,Coton&p=0,1&e=pluie&m=traction"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const largeur = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, ecran: window.innerWidth }));
    expect(largeur, route).toEqual({ page: 360, ecran: 360 });
  }
  await ctx.close();
});

test("rejeu : la rotation est rejouée sur les saisons réelles, chaque saison s'ouvre au toucher", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/rotations");
  await expect(page.getByText(/saisons réelles rejouées : \d+ bonnes/).first()).toBeVisible();
  await page.goto("/rotations/B");
  await expect(page.getByRole("heading", { name: /^Rejouée sur \d+ saisons réelles$/ })).toBeVisible();
  const pastille = page.getByRole("button", { name: /^2015 : saison / });
  await pastille.click();
  await expect(pastille).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^2015 · /)).toBeVisible();
});

test("2050 : la projection s'affiche et le scénario se change", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/rotations");
  await expect(page.getByText("Tient en 2050")).toHaveCount(1);
  await page.goto("/rotations/B");
  await expect(page.getByRole("heading", { name: "Votre champ vers 2050" })).toBeVisible();
  await expect(page.getByText("Projection, pas prévision")).toBeVisible();
  await page.getByRole("button", { name: "Pessimiste" }).click();
  await expect(page.getByTestId("barre-ssp585")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("barre-ssp245")).toHaveAttribute("data-active", "false");
});

test("semis : l'accueil affiche l'état de semis du jour", async ({ page }) => {
  await page.route("**/api/semis/**", (route) =>
    route.fulfill({ json: { etat: "fenetre_ouverte", depuis: "2026-06-02", message: "Pluies installées depuis le 2 juin : c'est le moment de semer.", dateDonnees: "2026-06-10" } }),
  );
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/tableau");
  await expect(page.getByText("Fenêtre de semis ouverte")).toBeVisible();
  await expect(page.getByText(/Pluies installées depuis le 2 juin/)).toBeVisible();
});

test("photo : la photo du champ est réduite, envoyée, et confrontée à la vue NASA", async ({ page }) => {
  let recu: { image: string; lat: number; lon: number; region: string } | null = null;
  await page.route("**/api/photo", async (route) => {
    recu = route.request().postDataJSON();
    await route.fulfill({
      json: {
        analyse: { culture: "Maïs", couvertureSol: 70, etat: "vigoureux", remarque: "Maïs haut et vert." },
        satellite: { ndvi: 0.64, mois: "2026-09", normale: 0.58 },
        comparaison: { verdict: "concordent", raisons: [] },
      },
    });
  });
  await page.goto("/parcelle");
  await page.getByLabel("Photographier mon champ").setInputFiles("tests/fixtures/gibs_ndvi_tuile.png");
  await expect(page.getByText("Ce que voit votre téléphone")).toBeVisible();
  await expect(page.getByText("Ce que voit la NASA")).toBeVisible();
  await expect(page.getByText("Les deux regards concordent.")).toBeVisible();
  expect(recu!.image.startsWith("data:image/jpeg;base64,")).toBe(true);
  expect(recu!.region).toBe("poro");
});

test("simulateur : comparer sur 10 ans, en année sèche, et faire défiler la parcelle", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await page.goto("/rotations");
  await page.getByRole("link", { name: /Simuler sur 3, 5 ou 10 ans/ }).click();
  await expect(page).toHaveURL(/\/simulateur$/);
  await expect(page.getByTestId("ligne-simulation")).toHaveCount(3);
  await page.getByRole("button", { name: "10 ans" }).click();
  await page.getByRole("button", { name: /Année sèche/ }).click();
  await expect(page.getByText(/saison la plus sèche mesurée/)).toBeVisible();
  await page.getByRole("slider", { name: "Date de la simulation" }).fill("190");
  await expect(page.getByTestId("etat-du-jour")).toContainText("Année 1 · juillet");
});

test("carte des risques : les 33 régions classées, la carte s'affiche", async ({ page }) => {
  await page.goto("/risques");
  await expect(page.getByRole("heading", { name: /Où le climat menace le plus les récoltes/ })).toBeVisible();
  await expect(page.locator("ol > li")).toHaveCount(33);
  await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
});
