import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

test("demo results show ten real responses, immutable detail, and meaningful summaries", async ({
  page,
  request,
}) => {
  const forms = await (await request.get("/api/v1/forms")).json();
  const form = forms.items.find(
    (item: { slug: string }) => item.slug === "demo-experience",
  );
  expect(form.status).toBe("published");
  expect(form.response_count).toBe(10);
  await page.goto(`/forms/${form.id}/results`);
  await expect(page.getByRole("row")).toHaveCount(11);
  const directory = path.resolve(
    __dirname,
    process.env.CAPTURE_PHASE5 === "1"
      ? "../../../docs/screenshots/phase-5"
      : "../../../.cache/screenshots/current/results",
  );
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, "responses-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /^View response/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Published version 1");
  await expect(page.getByRole("dialog")).toContainText("Skipped");
  await page.screenshot({
    path: path.join(directory, "detail-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("tab", { name: "Summary", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The story so far" }),
  ).toBeVisible();
  await expect(page.getByText("10 responses to this version")).toBeVisible();
  await expect(page.locator(".summary-question")).toHaveCount(6);
  const email = page
    .locator(".summary-question")
    .filter({ has: page.getByRole("heading", { name: /Where can we reach/ }) });
  await expect(email.locator(".summary-denominator")).toHaveText(
    "6 answered · 4 skipped · 10 total",
  );
  const rating = page.locator(".summary-question").filter({
    has: page.getByRole("heading", { name: /How was your experience/ }),
  });
  await expect(rating.locator(".numeric-stats")).toContainText(
    "Average rating3",
  );
  await page.screenshot({
    path: path.join(directory, "summary-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(directory, "summary-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("summary version selection preserves original question labels after draft replacement", async ({
  page,
  request,
}) => {
  const form = await (
    await request.post("/api/v1/forms", {
      data: { title: `History ${Date.now()}` },
    })
  ).json();
  const qid = crypto.randomUUID(),
    aid = crypto.randomUUID(),
    bid = crypto.randomUUID();
  const original = {
    id: qid,
    type: "multiple_choice",
    title: "Original question wording",
    description: "",
    required: true,
    settings: {},
    options: [
      { id: aid, label: "Original A" },
      { id: bid, label: "Original B" },
    ],
  };
  const saved = await (
    await request.put(`/api/v1/forms/${form.id}/draft`, {
      data: { title: form.title, expected_revision: 0, questions: [original] },
    })
  ).json();
  const v1 = await (
    await request.post(`/api/v1/forms/${form.id}/publish`, {
      data: { expected_revision: saved.draft_revision },
    })
  ).json();
  await request.post(`/api/v1/public/forms/${form.slug}/responses`, {
    data: {
      form_version_id: v1.published_version_id,
      idempotency_key: crypto.randomUUID(),
      answers: [{ question_id: qid, value: aid }],
    },
  });
  const edited = await (
    await request.put(`/api/v1/forms/${form.id}/draft`, {
      data: {
        title: form.title,
        expected_revision: saved.draft_revision,
        questions: [
          {
            id: crypto.randomUUID(),
            type: "short_text",
            title: "New question wording",
            description: "",
            required: false,
            settings: {},
            options: [],
          },
        ],
      },
    })
  ).json();
  await request.post(`/api/v1/forms/${form.id}/publish`, {
    data: { expected_revision: edited.draft_revision },
  });
  await page.goto(`/forms/${form.id}/results`);
  await page.getByRole("button", { name: /^View response/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Original question wording",
  );
  await expect(page.getByRole("dialog")).toContainText("Original A");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Summary", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /New question wording/ }),
  ).toBeVisible();
  await expect(page.getByText("0 responses to this version")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Published version", exact: true })
    .selectOption(v1.published_version_id);
  await expect(
    page.getByRole("heading", { name: /Original question wording/ }),
  ).toBeVisible();
  await expect(page.getByText("1 responses to this version")).toBeVisible();
  await expect(page.locator(".summary-distribution")).toContainText("100%");
});
