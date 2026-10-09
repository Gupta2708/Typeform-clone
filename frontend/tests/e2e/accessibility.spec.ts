import { chromium, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

test("accessibility scans cover workspace, builder, picker, preview, player, and results", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const forms = await (
    await request.get("/api/v1/forms?search=Customer%20experience")
  ).json();
  const form = forms.items.find(
    (item: { slug: string }) => item.slug === "demo-experience",
  );
  const scans: Record<string, unknown> = {};
  async function scan(name: string) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    scans[name] = result.violations;
    expect(
      result.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
      `${name} accessibility findings`,
    ).toEqual([]);
  }
  await page.goto("/workspace");
  await page.getByLabel("Search forms").fill("Customer experience");
  await expect(
    page.getByRole("link", { name: "Open Customer experience", exact: true }),
  ).toBeVisible();
  await scan("workspace");
  await page.goto(`/forms/${form.id}/builder`);
  await expect(
    page.getByLabel("Question title", { exact: true }),
  ).toBeVisible();
  await scan("builder");
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await scan("picker");
  await page.keyboard.press("Escape");
  await page.goto(`/forms/${form.id}/preview`);
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await scan("preview");
  await page.goto(`/to/${form.slug}`);
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await scan("public player");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.locator(".player-error")).toBeVisible();
  await scan("player validation");
  await page.goto(`/forms/${form.id}/results`);
  await expect(page.getByRole("row")).toHaveCount(11);
  await scan("responses");
  await page
    .getByRole("button", { name: /^View response/ })
    .first()
    .click();
  await scan("response detail");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Summary", exact: true }).click();
  await expect(page.locator(".summary-question")).toHaveCount(6);
  await scan("summary");
  const report = path.resolve(__dirname, "../../../.cache/accessibility.json");
  await fs.writeFile(report, JSON.stringify(scans, null, 2));
});

test("200 percent browser zoom, long question content and thirty-question rails remain usable", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const form = await (
    await request.post("/api/v1/forms", {
      data: { title: "Long content verification" },
    })
  ).json();
  const questions = Array.from({ length: 30 }, (_, i) => ({
    id: crypto.randomUUID(),
    type: i === 0 ? "multiple_choice" : "short_text",
    title:
      i === 0
        ? "A long question with enough context to wrap across several lines and still give every person a clear, comfortable way to answer without losing the navigation controls."
        : `Question ${i + 1}: ${"A meaningful prompt with context. ".repeat(4)}`,
    description: i === 0 ? "A helpful description. ".repeat(60) : "",
    required: false,
    settings: {},
    options:
      i === 0
        ? Array.from({ length: 18 }, (_, j) => ({
            id: crypto.randomUUID(),
            label: `Option ${j + 1}: ${"A longer answer choice. ".repeat(3)}`,
          }))
        : [],
  }));
  const saved = await (
    await request.put(`/api/v1/forms/${form.id}/draft`, {
      data: { expected_revision: 0, title: form.title, questions },
    })
  ).json();
  await request.post(`/api/v1/forms/${form.id}/publish`, {
    data: { expected_revision: saved.draft_revision },
  });
  const captures = path.resolve(__dirname, "../../../docs/screenshots/phase-6");
  await fs.mkdir(captures, { recursive: true });
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/forms/${form.id}/builder`);
    await expect(
      page.getByLabel("Question title", { exact: true }),
    ).toBeVisible();
    if (width <= 900)
      await page
        .getByRole("button", { name: "Questions", exact: true })
        .click();
    await page.locator(".sortable-question").last().scrollIntoViewIfNeeded();
    await expect(page.locator(".sortable-question").last()).toBeVisible();
    await page
      .locator(".sortable-question")
      .last()
      .getByRole("button", { name: /Question 30/ })
      .click();
    await expect(
      page.getByLabel("Question title", { exact: true }),
    ).toHaveValue(/^Question 30/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto(`/to/${form.slug}`);
    await expect(
      page.getByRole("heading", { name: /A long question/ }),
    ).toBeVisible();
    await page
      .getByRole("radio", { name: /^Option 18:/ })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Next question" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: path.join(captures, "long-player-mobile.png"),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workspace");
  await page.getByLabel("Search forms").fill("Customer experience");
  await expect(
    page.getByRole("link", { name: "Open Customer experience", exact: true }),
  ).toBeVisible();
  // A local test-only extension sets actual tab zoom, including layout media-query changes.
  const extension = path.resolve(__dirname, "../../../.cache/zoom-extension");
  await fs.mkdir(extension, { recursive: true });
  await fs.writeFile(
    path.join(extension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Local zoom verification",
      version: "1.0",
      permissions: ["tabs"],
      background: { service_worker: "worker.js" },
    }),
  );
  await fs.writeFile(
    path.join(extension, "worker.js"),
    "chrome.runtime.onInstalled.addListener(() => {});",
  );
  const profile = await fs.mkdtemp(
    path.resolve(__dirname, "../../../.cache/zoom-profile-"),
  );
  const zoomContext = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    reducedMotion: "reduce",
  });
  try {
    const zoomPage = await zoomContext.newPage();
    await zoomPage.goto("http://127.0.0.1:3001/workspace");
    const worker =
      zoomContext.serviceWorkers()[0] ??
      (await zoomContext.waitForEvent("serviceworker"));
    const zoom = await worker.evaluate(async () => {
      const api = (
        globalThis as unknown as {
          chrome: {
            tabs: {
              query: (query: object) => Promise<{ id: number; url?: string }[]>;
              setZoom: (id: number, zoom: number) => Promise<void>;
              getZoom: (id: number) => Promise<number>;
            };
          };
        }
      ).chrome;
      const tabs = await api.tabs.query({});
      const tab = tabs.find((item) =>
        item.url?.includes("127.0.0.1:3001/workspace"),
      );
      if (!tab) throw new Error("Missing zoom test tab");
      await api.tabs.setZoom(tab.id, 2);
      return api.tabs.getZoom(tab.id);
    });
    expect(zoom).toBe(2);
    await expect
      .poll(() => zoomPage.evaluate(() => window.innerWidth))
      .toBe(720);
    await zoomPage.getByLabel("Search forms").fill("Customer experience");
    await expect(
      zoomPage.getByRole("link", {
        name: "Open Customer experience",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await zoomPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await zoomPage.screenshot({
      path: path.join(captures, "workspace-200-percent.png"),
    });
    await zoomPage.goto(`http://127.0.0.1:3001/forms/${form.id}/builder`);
    await expect(
      zoomPage.getByRole("button", { name: /^(Share|Publish|Publish edits)$/ }),
    ).toBeVisible();
    await expect(
      zoomPage.getByRole("button", { name: /^(Share|Publish|Publish edits)$/ }),
    ).toBeInViewport();
    await expect(
      zoomPage.getByRole("link", { name: "Preview", exact: true }),
    ).toBeInViewport();
    expect(
      await zoomPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await zoomPage.screenshot({
      path: path.join(captures, "builder-200-percent.png"),
    });
    await zoomPage.getByRole("link", { name: "Preview", exact: true }).click();
    await expect(
      zoomPage.getByRole("button", { name: "Next question" }),
    ).toBeInViewport();
    await zoomPage.screenshot({
      path: path.join(captures, "player-200-percent.png"),
    });
  } finally {
    await zoomContext.close();
  }
});
