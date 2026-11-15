import { test, expect, type Page } from "@playwright/test";

const CONTOUR = [[7.69, -5.03], [7.69, -5.0288], [7.6888, -5.0288], [7.6888, -5.03]];

async function parcelleSaisie(page: Page, region = "gbeke") {
  await page.goto("/parcelle");
  await page.evaluate(([contour, region]) => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({
      parcelle: { region, surface: 1.7, cultures: ["Maïs", "Coton"], eau: "pluie", priorites: ["Rendre mon sol plus fertile"], materiel: "daba", contour, centre: [7.6894, -5.0294] },
      saisie: true,
    }));
  }, [CONTOUR, region] as const);
}

test("SRTM : la pente du contour dessiné s'affiche avec son conseil, puis les rotations rappellent l'anti-érosion", async ({ page }) => {
  let corps: unknown = null;
  await page.route("**/api/pente", async (route) => {
    corps = route.request().postDataJSON();
    await route.fulfill({ json: { moyenne: 5.8, forte: 13.2, altitudeMin: 346, altitudeMax: 358, classe: "fort", points: 49, source: "Altitude SRTM (NASA)" } });
  });
  await parcelleSaisie(page);
  await page.reload();
  const pente = page.getByTestId("pente-parcelle");
  await expect(pente).toContainText("Pente marquée · 5,8 % en moyenne");
  await expect(pente).toContainText("courbes de niveau");
  expect((corps as { contour: number[][] }).contour).toEqual(CONTOUR);
  // La pente reste avec la parcelle : pas de nouveau calcul au rechargement.
  corps = null;
  await page.reload();
  await expect(page.getByTestId("pente-parcelle")).toBeVisible();
  expect(corps).toBeNull();
  await page.goto("/rotations");
  await expect(page.getByTestId("note-pente")).toContainText(/Pente marquée \(5,8 %, altitude SRTM\).*la rotation [ABC] est la mieux notée/);
});

test("GPM IMERG : la pluie vérifiée par satellite sur la page Climat, et la couche Pluie sur la carte", async ({ page }) => {
  await page.route("**/api/pente", (route) => route.fulfill({ status: 503, json: { erreur: "x" } }));
  await parcelleSaisie(page, "poro");
  await page.goto("/climat");
  await expect(page.getByRole("heading", { name: "La pluie vérifiée par les satellites GPM" })).toBeVisible();
  await expect(page.getByTestId("verdict-recoupement")).toContainText(/satellites mesurent \d+ % de pluie en (plus|moins) que NASA POWER/);
  await expect(page.getByText(/Données réelles :.*pluie satellite/)).toBeVisible();
  await page.goto("/parcelle");
  await page.getByRole("button", { name: "Pluie", exact: true }).click();
  await expect(page.getByText(/GPM IMERG · intensité de pluie/).first()).toBeVisible();
});
