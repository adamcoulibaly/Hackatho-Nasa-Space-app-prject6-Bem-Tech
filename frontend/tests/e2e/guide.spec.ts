import { test, expect, type Page } from "@playwright/test";

const CAPTURES = process.env.CAPTURES_GUIDE;
const capture = async (page: Page, nom: string, projet: string) => {
  if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${projet}-${nom}.png` });
};
const bulle = (page: Page, titre: string) => page.getByRole("dialog", { name: titre });

test("guide pas à pas : du champ au suivi de saison, en touchant ce que la bulle montre", async ({ page, isMobile }, info) => {
  test.setTimeout(90_000);
  await page.goto("/parcelle");
  // Les tests automatisés ne déclenchent pas le guide seul : on simule un premier passage.
  await page.evaluate(() => localStorage.setItem("forosat.guide", JSON.stringify({ etape: 0, statut: "en-cours" })));
  await page.reload();

  await expect(bulle(page, "Bienvenue sur ForoSat")).toBeVisible();
  await capture(page, "0-accueil", info.project.name);
  await page.getByRole("button", { name: "C'est parti" }).click();

  await expect(bulle(page, "Situez votre champ")).toBeVisible();
  await expect(page.getByTestId("guide-zone")).toBeVisible();
  await page.waitForTimeout(400);
  await capture(page, "1-lieu", info.project.name);
  await page.getByRole("button", { name: "Ma position" }).click();

  await expect(bulle(page, "Dessinez votre champ")).toBeVisible();
  await page.getByRole("button", { name: "Dessiner ma parcelle" }).click();

  await expect(bulle(page, "Touchez chaque coin")).toBeVisible();
  await page.waitForTimeout(500);
  await capture(page, "3-contour", info.project.name);
  const carte = page.getByTestId("carte");
  const box = (await carte.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const [dx, dy] of [[-40, -40], [40, -40], [40, 40], [-40, 40]]) {
    if (isMobile) await page.touchscreen.tap(cx + dx, cy + dy);
    else await page.mouse.click(cx + dx, cy + dy);
    await page.waitForTimeout(350);
  }
  await page.getByRole("button", { name: /Terminer le contour \(4 points\)/ }).click();

  await expect(bulle(page, "Ce que vous cultivez")).toBeVisible();
  await page.waitForTimeout(400);
  await capture(page, "4-cultures", info.project.name);
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(bulle(page, "Ce qui compte pour vous")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  await expect(bulle(page, "Lancez l'analyse")).toBeVisible();
  await page.getByRole("button", { name: "Analyser ma parcelle" }).click();
  await expect(page).toHaveURL(/\/rotations$/);

  await expect(bulle(page, "Vos trois rotations")).toBeVisible();
  await page.waitForTimeout(400);
  await capture(page, "7-rotations", info.project.name);
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(bulle(page, "Ouvrez la rotation conseillée")).toBeVisible();
  await page.locator('[data-guide="detail-conseille"]').click();
  await expect(page).toHaveURL(/\/rotations\/[ABC]$/);

  await expect(bulle(page, "Passez d'une rotation à l'autre")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(bulle(page, "Demandez à l'assistant")).toBeVisible();
  await page.waitForTimeout(400);
  await capture(page, "10-assistant", info.project.name);
  await page.getByRole("button", { name: "Passer" }).click();

  // L'étape suivante est sur une autre page : une barre propose d'y aller.
  const reprise = page.getByTestId("guide-reprise");
  await expect(reprise).toContainText("Testez avant de semer");
  await capture(page, "11-reprise", info.project.name);
  await reprise.getByRole("link", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/simulateur$/);
  await expect(bulle(page, "Testez avant de semer")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();

  await reprise.getByRole("link", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/tableau$/);
  await expect(bulle(page, "Suivez votre saison")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(bulle(page, "Tout est à un toucher")).toBeVisible();
  await page.waitForTimeout(400);
  await capture(page, "13-fin", info.project.name);
  await page.getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("guide-reprise")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("forosat.guide")!).statut)).toBe("termine");
});

test("guide pas à pas : se relance depuis la page Guide, et « × » le ferme", async ({ page }) => {
  await page.goto("/guide");
  await page.getByRole("button", { name: "Lancer le guide pas à pas" }).click();
  await expect(page).toHaveURL(/\/parcelle$/);
  await expect(page.getByRole("dialog", { name: "Situez votre champ" })).toBeVisible();
  await page.getByRole("button", { name: "Quitter le guide" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Analyser ma parcelle" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
