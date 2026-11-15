import { test, expect } from "@playwright/test";

// Une parcelle au Sénégal : la carte trouve Thiès, le pays est détecté, les cultures du Sahel sont proposées,
// et climat et rotations sont calculés à la demande par le serveur (NASA POWER).
test("partout dans le monde : une parcelle à Thiès (Sénégal), des cultures du Sahel et un climat calculé", async ({ page }) => {
  test.setTimeout(120_000);
  await page.route("**/nominatim.openstreetmap.org/search**", (r) =>
    r.fulfill({ json: [{ lat: "14.79", lon: "-16.93", display_name: "Thiès, Sénégal", boundingbox: ["14.7", "14.9", "-17.0", "-16.8"] }] }));
  await page.route("**/nominatim.openstreetmap.org/reverse**", (r) =>
    r.fulfill({ json: { address: { country_code: "sn", country: "Sénégal", city: "Thiès" } } }));

  await page.goto("/parcelle");
  await page.getByLabel("Rechercher une localité").fill("Thiès");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await expect(page.getByText(/Lieu : Thiès, Sénégal/)).toBeVisible();

  const lieu = page.getByTestId("lieu-monde");
  await expect(lieu).toContainText("Thiès");
  await expect(lieu).toContainText("Sénégal");
  await expect(page.getByText("Cultures courantes : Sahel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mil", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Igname", exact: true })).toHaveCount(0);

  // Rotation actuelle : mil puis arachide.
  await page.getByRole("button", { name: "Maïs", exact: true }).click();
  await page.getByRole("button", { name: "Coton", exact: true }).click();
  await page.getByRole("button", { name: "Mil", exact: true }).click();
  await page.getByRole("button", { name: "Arachide", exact: true }).click();
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/rotations$/);
  await expect(page.getByText("Étape 2 sur 2 · Thiès")).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir le détail de la rotation B" })).toBeVisible({ timeout: 60_000 });
  // Aucune culture des zones humides proposée au Sahel.
  await expect(page.locator("article").filter({ hasText: "Igname" })).toHaveCount(0);

  await page.goto("/climat");
  await expect(page.getByText(/Calculé à la demande pour ce point du monde/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Climat de votre zone · Thiès")).toBeVisible();
});
