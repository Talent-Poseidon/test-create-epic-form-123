import { test, expect } from "@playwright/test";

test.describe("Kamus upload flows", () => {
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

  test("Upload Kamus Template Successfully", async ({ page }) => {
    const ts = Date.now();
    const csv = [
      "code,name,type,description,behavioralIndicators",
      `K-NEW-${ts},Komunikasi New ${ts},kompetensi,"Deskripsi komunikasi","Indikator 1; Indikator 2"`,
      `P-NEW-${ts},Logika New ${ts},potensi,"Deskripsi logika","Indikator 3; Indikator 4"`,
    ].join("\n");

    await page.getByTestId("kamus-upload-input").setInputFiles({
      name: "kamus.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    await expect(page.getByTestId("kamus-created-alert")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("kamus-created-alert")).toContainText(
      "Kamus Submitted"
    );

    const code1Item = page.locator(`[data-testid="kamus-item-K-NEW-${ts}"]`);
    await expect(code1Item).toBeVisible({ timeout: 10000 });
  });

  test("Upload Kamus Template with Errors", async ({ page }) => {
    const csv = [
      "code,name,type,description,behavioralIndicators",
      `,Missing Code,kompetensi,"Some desc","Some indicators"`,
      `DUP-001,No type provided,,"Desc","Indicators"`,
      `DUP-001,Dup,kompetensi,"Desc","Indicators"`,
    ].join("\n");

    await page.getByTestId("kamus-upload-input").setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    await expect(page.getByTestId("kamus-error-alert")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("kamus-row-errors")).toBeVisible();
    const errorItems = page.locator('[data-testid^="kamus-row-error-"]');
    const count = await errorItems.count();
    console.log(`[Kamus error] ${count} row errors visible`);
    expect(count).toBeGreaterThan(0);
  });
});
