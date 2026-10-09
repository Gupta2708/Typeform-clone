import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const screenshots = path.resolve(
  __dirname,
  "../../../docs/screenshots/phase-1",
);

test("workspace loads persisted drafts, filters, switches layout, and creates a real draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/workspace");
  await expect(
    page.getByRole("link", { name: "Open Customer feedback", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search forms" }).fill("Event");
  await expect(
    page.getByRole("link", { name: "Open Event registration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Customer feedback", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search forms" }).fill("");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.locator(".forms-list")).toBeVisible();
  await page.getByRole("button", { name: "Grid view" }).click();
  await page.getByRole("button", { name: "Create form", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Form name" })).toBeFocused();
  const title = `Browser persistence ${Date.now()}`;
  await page.getByRole("textbox", { name: "Form name" }).fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create form" })
    .click();
  await expect(page).toHaveURL(/\/forms\/[^/]+\/builder$/);
  await expect(page.locator(".builder-title")).toHaveText(title);
  await page.reload();
  await expect(page.locator(".builder-title")).toHaveText(title);
  expect(errors).toEqual([]);
});

test("create dialog supports Escape and restores focus", async ({ page }) => {
  await page.goto("/workspace");
  const trigger = page.getByRole("button", {
    name: "Create form",
    exact: true,
  });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("desktop visual foundations and preview isolation", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fs.mkdir(screenshots, { recursive: true });
  const response = await request.get("/api/v1/forms");
  const before = await response.json();
  const feedback = before.items.find(
    (form: { title: string }) => form.title === "Customer feedback",
  );
  await page.goto("/workspace");
  await expect(
    page.getByRole("link", { name: "Open Customer feedback", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search forms" })
    .fill("Customer feedback");
  await page.screenshot({
    path: path.join(screenshots, "workspace-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "Search forms" }).fill("");
  await page
    .getByRole("link", { name: "Open Customer feedback", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /What did you enjoy most/ }).click();
  await expect(
    page.getByRole("heading", { name: /^What did you enjoy most/ }),
  ).toBeVisible();
  await expect(page.locator(".question-settings")).toBeVisible();
  await page.screenshot({
    path: path.join(screenshots, "builder-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /The thoughtful design/ }).click();
  await expect(
    page.getByRole("button", { name: /The thoughtful design/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page).toHaveURL(/\/preview$/);
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(screenshots, "player-desktop-text.png"),
    fullPage: true,
  });
  await page.getByRole("textbox").fill("Ada");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /^What did you enjoy most/ }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(screenshots, "player-desktop-choice.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("Ada");
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(".player-progress")).toContainText(
      `Question ${i + 2} of 6`,
    );
    await page.locator(".player-question h1").waitFor({ state: "visible" });
  }
  await page.getByRole("button", { name: "Finish preview" }).click();
  await expect(
    page.getByText("Preview complete. No response was recorded."),
  ).toBeVisible();
  const after = await (
    await request.get(`/api/v1/forms/${feedback.id}`)
  ).json();
  expect(after.response_count).toBe(feedback.response_count);
});

test("mobile and intermediate layouts preserve access without horizontal overflow", async ({
  page,
}) => {
  await fs.mkdir(screenshots, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/workspace");
    await expect(
      page.getByRole("link", { name: "Open Customer feedback", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page
      .getByRole("link", { name: "Open Customer feedback", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /First things first/ }),
    ).toBeVisible();
    if (width <= 900) {
      await page
        .getByRole("button", { name: "Questions", exact: true })
        .click();
      await expect(page.locator(".question-rail")).toBeVisible();
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await expect(page.locator(".question-settings")).toBeVisible();
      await page.getByRole("button", { name: "Question", exact: true }).click();
    }
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (width === 390)
      await page.screenshot({
        path: path.join(screenshots, "builder-mobile.png"),
        fullPage: true,
      });
    await page.getByRole("link", { name: "Preview", exact: true }).click();
    await expect(page).toHaveURL(/\/preview$/);
    await expect(
      page.getByRole("heading", { name: /First things first/ }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (width === 390)
      await page.screenshot({
        path: path.join(screenshots, "player-mobile.png"),
        fullPage: true,
      });
  }
});
