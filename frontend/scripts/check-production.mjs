import fs from "node:fs/promises";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve("../.cache/browsers");
const { chromium, expect } = await import("@playwright/test");
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: "http://127.0.0.1:3000",
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const assets = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().includes("/_next/static/"))
    assets.push({ url: response.url(), status: response.status() });
});
const captures = path.resolve("../docs/screenshots/phase-6");
await fs.mkdir(captures, { recursive: true });
let created;
try {
  const listing = await context.request.get("/api/v1/forms");
  expect(listing.status()).toBe(200);
  const form = (await listing.json()).items.find(
    (item) => item.slug === "demo-experience",
  );
  expect(form.response_count).toBe(10);
  await page.goto("/workspace");
  await expect(
    page.getByRole("link", { name: "Open Customer experience", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(captures, "workspace-production.png"),
    fullPage: true,
  });
  await page.goto(`/forms/${form.id}/builder`);
  await page
    .getByRole("button", { name: /What made the biggest difference/ })
    .click();
  await page.screenshot({
    path: path.join(captures, "builder-production.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await page.screenshot({
    path: path.join(captures, "picker-production.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(captures, "preview-production.png"),
    fullPage: true,
  });
  await page.goto(`/forms/${form.id}/results`);
  await expect(page.getByRole("row")).toHaveCount(11);
  await page.getByRole("tab", { name: /^Responses/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Summary", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".summary-question")).toHaveCount(6);
  await page.screenshot({
    path: path.join(captures, "summary-production.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/to/${form.slug}`);
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(captures, "public-production-mobile.png"),
    fullPage: true,
  });

  created = await (
    await context.request.post("/api/v1/forms", {
      data: { title: "Production smoke verification" },
    })
  ).json();
  const questionId = crypto.randomUUID();
  const saved = await (
    await context.request.put(`/api/v1/forms/${created.id}/draft`, {
      data: {
        title: created.title,
        expected_revision: 0,
        questions: [
          {
            id: questionId,
            type: "short_text",
            title: "Does production persistence work?",
            description: "",
            required: true,
            settings: {},
            options: [],
          },
        ],
        thank_you: {
          title: "Production verified",
          description: "The server confirmed this response.",
        },
      },
    })
  ).json();
  const published = await context.request.post(
    `/api/v1/forms/${created.id}/publish`,
    { data: { expected_revision: saved.draft_revision } },
  );
  expect(published.status()).toBe(200);
  await page.goto(`/to/${created.slug}`);
  await page
    .getByRole("textbox")
    .fill("Confirmed through the production proxy");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Production verified", exact: true }),
  ).toBeVisible();
  const results = await (
    await context.request.get(`/api/v1/forms/${created.id}/responses`)
  ).json();
  expect(results.total).toBe(1);
  expect(results.items[0].answers[0].value).toBe(
    "Confirmed through the production proxy",
  );
  expect(errors).toEqual([]);
  expect(assets.length).toBeGreaterThan(0);
  expect(assets.every((asset) => asset.status === 200)).toBe(true);
  expect(assets.some((asset) => /\.woff2?/.test(asset.url))).toBe(true);
  console.log(
    JSON.stringify({
      productionProxy: "passed",
      anonymousSubmission: "passed",
      pageErrors: errors.length,
      staticAssetResponses: assets.length,
      bundledFont: "200",
      demoCountsPreserved: true,
    }),
  );
} finally {
  if (created) {
    const removed = await context.request.delete(`/api/v1/forms/${created.id}`);
    if (removed.status() !== 204)
      console.error("Smoke fixture cleanup failed", removed.status());
  }
  await context.close();
  await browser.close();
}
