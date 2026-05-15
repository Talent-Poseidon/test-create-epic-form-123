import { test, expect } from "@playwright/test";

test.describe("Update Kamus with New Template", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/kamus");
    await expect(page.getByTestId("kamus-page-nav")).toBeVisible();
  });

  test("preview shows added, changed, and removed", async ({ page }) => {
    // First seed by direct upload of new items
    const setupTs = Date.now();
    const initialCode = `UPD-A-${setupTs}`;
    const initialCsv = [
      "code,name,type,description,behavioralIndicators",
      `${initialCode},Initial Name,kompetensi,"Initial desc","Initial indicators"`,
    ].join("\n");

    await page.getByTestId("kamus-upload-input").setInputFiles({
      name: "initial.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(initialCsv),
    });
    await expect(page.getByTestId("kamus-created-alert")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator(`[data-testid="kamus-item-${initialCode}"]`)
    ).toBeVisible({ timeout: 10000 });

    // Now preview an update: change the existing item, plus add a new one
    const newCode = `UPD-B-${setupTs}`;
    const updateCsv = [
      "code,name,type,description,behavioralIndicators",
      `${initialCode},Renamed Item,kompetensi,"Updated desc","Updated indicators"`,
      `${newCode},Brand New,potensi,"Desc","Indicators"`,
      // include seed-protected items so they are not flagged for removal
      `SEED-K-001,Komunikasi Efektif,kompetensi,"Kemampuan menyampaikan ide secara jelas","Berbicara terstruktur; Mendengarkan aktif"`,
      `SEED-P-001,Logika,potensi,"Kemampuan berpikir logis","Memecahkan masalah; Menarik kesimpulan"`,
      `SEED-USED-001,Kepemimpinan,kompetensi,"Kemampuan memimpin tim","Memberi arahan; Memotivasi tim"`,
    ].join("\n");

    await page.getByTestId("kamus-update-input").setInputFiles({
      name: "update.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(updateCsv),
    });

    await expect(page.getByTestId("kamus-update-preview")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("kamus-preview-added")).toContainText(
      "Added: 1"
    );
    await expect(page.getByTestId("kamus-preview-changed")).toContainText(
      "Changed: 1"
    );

    await page.getByTestId("kamus-confirm-update-btn").click();
    await expect(page.getByTestId("kamus-created-alert")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("kamus-created-alert")).toContainText(
      "Kamus Updated"
    );

    // After update: the renamed item should appear with new name
    await expect(
      page.locator(`[data-testid="kamus-item-${initialCode}"]`)
    ).toContainText("Renamed Item");
  });
});
