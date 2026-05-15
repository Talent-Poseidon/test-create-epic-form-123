import { test, expect } from "@playwright/test";

test.describe("View Kamus Potensi & Kompetensi", () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus...`);
    const response = await page.goto("/admin/kamus");
    console.log(
      `[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`
    );
    await expect(page).toHaveURL(/\/admin\/kamus/);
    await expect(page.getByTestId("kamus-page-nav")).toBeVisible();
  });

  test("user sees the list of kamus items from seed", async ({ page }) => {
    await expect(page.getByTestId("kamus-list-container")).toBeVisible();
    const seedItem = page.locator('[data-testid="kamus-item-SEED-K-001"]');
    await expect(seedItem).toBeVisible({ timeout: 10000 });
  });

  test("user filters by type kompetensi", async ({ page }) => {
    await expect(page.getByTestId("kamus-list-container")).toBeVisible();

    await page
      .locator('[data-testid="kamus-item-SEED-K-001"]')
      .waitFor({ state: "visible", timeout: 10000 });

    await page.getByTestId("kamus-type-filter").selectOption("potensi");

    // Wait for filter result
    await expect(
      page.locator('[data-testid="kamus-item-SEED-P-001"]')
    ).toBeVisible({ timeout: 10000 });

    // Kompetensi seed item should not be visible anymore
    await expect(
      page.locator('[data-testid="kamus-item-SEED-K-001"]')
    ).toHaveCount(0);
  });

  test("user searches by code", async ({ page }) => {
    await expect(page.getByTestId("kamus-list-container")).toBeVisible();
    await page.getByTestId("kamus-search-input").fill("SEED-P-001");

    await expect(
      page.locator('[data-testid="kamus-item-SEED-P-001"]')
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[data-testid="kamus-item-SEED-K-001"]')
    ).toHaveCount(0);
  });
});
