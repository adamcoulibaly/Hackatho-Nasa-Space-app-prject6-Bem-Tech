import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/bienvenue", "/tableau", "/parcelle", "/climat", "/rotations", "/rotations/B", "/fiche/B", "/methode", "/lexique", "/conseiller"];

test("parcours complet : parcelle → climat → rotations → détail → fiche", async ({ page }) => {
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/climat$/);
  await page.getByRole("link", { name: "Voir les 3 rotations" }).click();
  await expect(page).toHaveURL(/\/rotations$/);
  await page.getByRole("link", { name: "Voir le détail de la rotation B" }).click();
  await expect(page).toHaveURL(/\/rotations\/B$/);
  await page.getByRole("link", { name: "Partager la fiche" }).click();
  await expect(page).toHaveURL(/\/fiche\/B$/);
  await expect(page.getByText("Maïs → Arachide → Coton")).toBeVisible();
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
  await expect(page.getByText(/Sol nu jusqu'en/)).toBeVisible();
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
  await page.getByLabel(/Année/).fill("2010");
  await expect(page.getByText(/données à partir de 2015/)).toBeVisible();
});
