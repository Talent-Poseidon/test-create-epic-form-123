import { test, expect } from "@playwright/test";

test.describe("Master Data Readiness API", () => {
  test("returns readiness for kamus, standar jabatan, and scenario", async ({
    request,
  }) => {
    const res = await request.get("/api/master-data/readiness");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("kamus");
    expect(body).toHaveProperty("standarJabatan");
    expect(body).toHaveProperty("scenario");
    expect(typeof body.kamus.count).toBe("number");
    expect(body.kamus.count).toBeGreaterThan(0);
    console.log("[Readiness]", JSON.stringify(body));
  });

  test("downloads kamus template", async ({ request }) => {
    const res = await request.get("/api/kamus/template");
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()["content-type"] || "";
    expect(ct).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain(
      "code,name,type,description,behavioralIndicators"
    );
  });
});
