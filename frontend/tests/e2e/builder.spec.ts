import { expect, test, type APIRequestContext } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

async function create(request: APIRequestContext) {
  const form = await (
    await request.post("/api/v1/forms", {
      data: { title: `Builder checks ${Date.now()}` },
    })
  ).json();
  return form;
}
async function withQuestion(request: APIRequestContext) {
  const form = await create(request);
  const saved = await (
    await request.put(`/api/v1/forms/${form.id}/draft`, {
      data: {
        expected_revision: 0,
        title: form.title,
        questions: [
          {
            id: crypto.randomUUID(),
            type: "short_text",
            title: "Original prompt",
            description: "",
            required: false,
            settings: {},
            options: [],
          },
        ],
      },
    })
  ).json();
  return saved;
}
test("all eight types, settings, type warning, duplicate, keyboard and pointer reorder, delete", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const form = await create(request);
  await page.goto(`/forms/${form.id}/builder`);
  const types = [
    "Short text",
    "Long text",
    "Multiple choice",
    "Dropdown",
    "Email",
    "Number",
    "Yes / No",
    "Rating",
  ];
  for (const label of types) {
    await page
      .getByRole("button", { name: "Add question", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: new RegExp(`^${label.replace("/", "\\/")}`),
      })
      .click();
    await page
      .getByRole("textbox", { name: "Question title", exact: true })
      .fill(`${label} question`);
  }
  await page.getByLabel("Rating scale").selectOption("7");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Seven points to share how you feel.");
  await page.getByRole("button", { name: /Number question/ }).click();
  await page.getByLabel("Minimum value").fill("0");
  await page.getByLabel("Maximum value").fill("25");
  await page.getByRole("button", { name: /Multiple choice question/ }).click();
  await page.getByLabel("Choice 1", { exact: true }).fill("The people");
  await page.getByLabel("Choice 2", { exact: true }).fill("The product");
  await page.getByRole("button", { name: "Add choice", exact: true }).click();
  await page.getByLabel("Choice 3", { exact: true }).fill("The experience");
  await page.getByRole("button", { name: "Remove choice 2" }).click();
  await page
    .getByRole("button", { name: "Multiple choice", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Short text/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("discarded");
  await page.getByRole("button", { name: "Keep current type" }).click();
  await expect(page.getByLabel("Choice 1", { exact: true })).toHaveValue(
    "The people",
  );
  await page.getByRole("button", { name: "Duplicate question" }).click();
  await expect(page.locator(".sortable-question")).toHaveCount(9);
  await page
    .getByRole("button", { name: "Delete question", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete question", exact: true })
    .click();
  await expect(page.locator(".sortable-question")).toHaveCount(8);
  const handle = page.getByRole("button", {
    name: "Reorder question 1",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(page.locator(".sortable-question").first()).toContainText(
    "Long text question",
  );
  const start = await page
    .getByRole("button", { name: "Reorder question 1", exact: true })
    .boundingBox();
  const end = await page
    .getByRole("button", { name: "Reorder question 3", exact: true })
    .boundingBox();
  if (!start || !end) throw new Error("Missing drag handles");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator(".sortable-question").first()).toContainText(
    "Short text question",
  );
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/v1/forms/${form.id}`)).json()).questions
          .length,
    )
    .toBe(8);
  await expect(page.locator(".save-status")).toHaveText("All changes saved");
  const saved = await (await request.get(`/api/v1/forms/${form.id}`)).json();
  expect(
    new Set(saved.questions.map((q: { type: string }) => q.type)).size,
  ).toBe(8);
  expect(
    saved.questions.find((q: { type: string }) => q.type === "number").settings,
  ).toEqual({ min: 0, max: 25 });
  expect(
    saved.questions.find((q: { type: string }) => q.type === "rating").settings
      .scale,
  ).toBe(7);
  await page.reload();
  await expect(page.locator(".sortable-question").first()).toContainText(
    "Short text question",
  );
});

test("autosave retains newer edits while a save is in flight and serializes revisions", async ({
  page,
  request,
}) => {
  const form = await withQuestion(request);
  await page.goto(`/forms/${form.id}/builder`);
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const revisions: number[] = [];
  await page.route(`**/api/v1/forms/${form.id}/draft`, async (route) => {
    const data = route.request().postDataJSON();
    revisions.push(data.expected_revision);
    if (revisions.length === 1) await gate;
    await route.continue();
  });
  await page
    .getByLabel("Question title", { exact: true })
    .fill("First pending edit");
  await expect.poll(() => revisions.length).toBe(1);
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Newest local edit");
  release();
  await expect(page.locator(".save-status")).toHaveText("All changes saved");
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "Newest local edit",
  );
  expect(revisions).toEqual([1, 2]);
  expect(
    (await (await request.get(`/api/v1/forms/${form.id}`)).json()).questions[0]
      .title,
  ).toBe("Newest local edit");
});

test("conflict keeps edits, offers a download, blocks publishing, and only explicitly discards", async ({
  page,
  context,
  request,
}) => {
  const form = await withQuestion(request);
  await page.goto(`/forms/${form.id}/builder`);
  const other = await context.newPage();
  await other.goto(`/forms/${form.id}/builder`);
  await other
    .getByLabel("Question title", { exact: true })
    .fill("Saved in another tab");
  await expect(other.locator(".save-status")).toHaveText("All changes saved");
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Local edits to preserve");
  await expect(page.getByRole("dialog")).toContainText("permanently lose");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download local draft" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(
    JSON.parse(await fs.readFile(downloadPath!, "utf8")).questions[0].title,
  ).toBe("Local edits to preserve");
  await page.getByRole("button", { name: "Keep my edits" }).click();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "Local edits to preserve",
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resolve conflict" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "Local edits to preserve",
  );
  await page.getByRole("button", { name: "Resolve conflict" }).click();
  await page
    .getByRole("button", { name: "Discard local edits and reload" })
    .click();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "Saved in another tab",
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeEnabled();
  await other.close();
});

test("failed saves retain edits and retry successfully", async ({
  page,
  request,
}) => {
  const form = await withQuestion(request);
  await page.goto(`/forms/${form.id}/builder`);
  await page.route(
    `**/api/v1/forms/${form.id}/draft`,
    (route) => route.abort(),
    { times: 1 },
  );
  await page
    .getByLabel("Question title", { exact: true })
    .fill("Keep this after failure");
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
  await expect(page.getByLabel("Question title", { exact: true })).toHaveValue(
    "Keep this after failure",
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.locator(".save-status")).toHaveText("All changes saved");
});

test("Phase 3 visual checkpoint: workspace, builder, picker, settings and preview", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const directory = path.resolve(
    __dirname,
    "../../../docs/screenshots/phase-3",
  );
  await fs.mkdir(directory, { recursive: true });
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/workspace");
    await page.getByLabel("Search forms").fill("Customer feedback");
    await expect(
      page.getByRole("link", { name: "Open Customer feedback", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(directory, `workspace-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Open Customer feedback", exact: true })
      .click();
    if (width <= 900)
      await page
        .getByRole("button", { name: "Questions", exact: true })
        .click();
    await page.getByRole("button", { name: /What did you enjoy most/ }).click();
    await expect(
      page.getByLabel("Question title", { exact: true }),
    ).toHaveValue(/^What did you enjoy/);
    await page.screenshot({
      path: path.join(directory, `builder-${width}.png`),
      fullPage: true,
    });
    if (width <= 900)
      await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.screenshot({
      path: path.join(directory, `settings-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Multiple choice", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      path: path.join(directory, `picker-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Preview", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /First things first/ }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(directory, `preview-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
