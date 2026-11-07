import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/parcelle", "/climat", "/rotations", "/rotations/B", "/fiche/B", "/methode", "/lexique", "/conseiller"];

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
