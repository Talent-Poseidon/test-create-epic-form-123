import { test, expect } from "@playwright/test";

test.describe("Prevent Deletion of Used Kamus", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/kamus");
    await expect(page.getByTestId("kamus-page-nav")).toBeVisible();
  });

  test("blocks delete when kamus is used in Standar Jabatan", async ({
    page,
  }) => {
    const usedItem = page.locator(
      '[data-testid="kamus-item-SEED-USED-001"]'
    );
    await expect(usedItem).toBeVisible({ timeout: 10000 });

    await page.getByTestId("kamus-delete-btn-SEED-USED-001").click();

    await expect(page.getByTestId("kamus-error-alert")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("kamus-error-alert")).toContainText(
      /used in Standar Jabatan or Scenario/i
    );

    // Item still present
    await expect(usedItem).toBeVisible();
  });
});
