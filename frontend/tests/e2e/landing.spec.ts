import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

const captures = path.resolve(__dirname, "../../../docs/screenshots/landing");

test("landing actions, local demonstrations and keyboard menu work without creating responses", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await (await request.get("/api/v1/forms")).json();
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/v1/"))
      writes.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Better questions/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try a sample form", exact: true }),
  ).toHaveAttribute("href", "/to/demo-experience");
  await expect(
    page.getByRole("link", { name: /Open builder/ }).first(),
  ).toHaveAttribute("href", "/workspace");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  const product = page.getByRole("button", { name: "Product", exact: true });
  await product.focus();
  await product.press("ArrowDown");
  await expect(product).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#landing-product-links a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(product).toBeFocused();
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await product.click();
  await page.locator("#hero-heading").click();
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await page
    .getByLabel("Edit demonstration question")
    .fill("A question made your way?");
  await page
    .getByLabel("Demonstration choice 1")
    .fill("A thoughtful little detail");
  await page
    .getByRole("button", { name: "Move demonstration question up" })
    .click();
  await expect(page.locator(".demo-canvas-number")).toHaveText("1 →");
  await page.getByRole("button", { name: "Add question", exact: true }).click();
  await expect(page.getByLabel("Edit demonstration question")).toHaveValue(
    "Anything else on your mind?",
  );
  const player = page.locator(".landing-demo-player");
  await player.getByRole("textbox").fill("Avery");
  await player.getByRole("textbox").press("Enter");
  await expect(
    player.getByRole("heading", { name: /What made the biggest difference/ }),
  ).toBeFocused();
  await player
    .getByRole("radio", { name: "Thoughtful design", exact: true })
    .click();
  await player.getByRole("button", { name: "OK", exact: true }).click();
  await player.getByRole("radio", { name: "5 out of 5" }).click();
  await player.getByRole("button", { name: "Finish preview" }).click();
  await expect(
    player.getByText("Preview complete. No response was recorded."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View example response from Maya" })
    .click();
  await expect(page.locator(".demo-answer-detail")).toContainText("MAYA");
  await expect(page.locator(".demo-answer-detail")).toContainText(
    "Helpful people",
  );
  await page.getByRole("button", { name: "Next example" }).click();
  await expect(page.locator(".example-position")).toHaveText("2 / 3");
  await page.getByRole("button", { name: "Next example" }).click();
  await expect(page.locator(".example-position")).toHaveText("3 / 3");
  await expect(
    page.getByRole("link", { name: "Preview draft", exact: true }),
  ).toHaveAttribute("href", /\/forms\/.+\/preview$/);
  await page.getByRole("button", { name: "Previous example" }).click();
  await expect(page.locator(".example-position")).toHaveText("2 / 3");
  const after = await (await request.get("/api/v1/forms")).json();
  expect(
    after.items.map(
      (form: {
        id: string;
        draft_revision: number;
        response_count: number;
      }) => [form.id, form.draft_revision, form.response_count],
    ),
  ).toEqual(
    before.items.map(
      (form: {
        id: string;
        draft_revision: number;
        response_count: number;
      }) => [form.id, form.draft_revision, form.response_count],
    ),
  );
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  await page
    .getByRole("link", { name: "Try a sample form", exact: true })
    .click();
  await expect(page).toHaveURL(/\/to\/demo-experience$/);
  await expect(
    page.getByRole("heading", { name: /First things first/ }),
  ).toBeVisible();
});

test("landing visual checkpoint, reduced motion and mobile navigation", async ({
  page,
}) => {
  test.setTimeout(100_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fs.mkdir(captures, { recursive: true });
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Try a sample form", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Pause product animation" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Pause question showcase" }),
    ).toBeDisabled();
    await page.screenshot({
      path: path.join(captures, `homepage-${width}.png`),
      fullPage: true,
    });
    await page.screenshot({ path: path.join(captures, `hero-${width}.png`) });
    if (width === 1440 || width === 390) {
      for (const section of ["build", "share", "learn", "examples"]) {
        await page.locator(`#${section}`).screenshot({
          path: path.join(captures, `${section}-${width}.png`),
        });
      }
    }
    if (width === 1440) {
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    }
    if (width <= 768) {
      const trigger = page.getByRole("button", { name: "Open navigation" });
      await trigger.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Examples", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(/#examples$/);
    }
  }
  const violations = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    violations.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        message: node.failureSummary,
      })),
    })),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("autoplay pauses, remains paused and respects offscreen visibility", async ({
  page,
}) => {
  await page.goto("/");
  const demo = page.locator(".hero-demo");
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute("data-running", "true");
  await page.getByRole("button", { name: "Pause product animation" }).click();
  await expect(demo).toHaveAttribute("data-running", "false");
  const frame = await page.locator(".hero-demo-frame").innerText();
  await page.waitForTimeout(2500);
  expect(await page.locator(".hero-demo-frame").innerText()).toBe(frame);
  await page.getByRole("button", { name: "Play product animation" }).click();
  await expect(demo).toHaveAttribute("data-running", "true");
  await page.locator("#examples").scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute("data-running", "false");
  await page.locator(".type-showcase").scrollIntoViewIfNeeded();
  await expect(page.locator(".type-showcase")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.getByRole("button", { name: "Pause question showcase" }).click();
  await expect(page.locator(".type-showcase")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await page.getByRole("button", { name: "Play question showcase" }).click();
  await page.locator(".type-showcase-window").hover();
  expect(
    await page
      .locator(".type-ticker")
      .first()
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe("paused");
});

test("missing examples fall back to the workspace and a zoom-equivalent viewport keeps controls usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/forms?*", (route) =>
    route.fulfill({
      json: { items: [], total: 0, offset: 0, limit: 100 },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Create your first form" }).first(),
  ).toHaveAttribute("href", "/workspace");
  await expect(page.getByRole("link", { name: "Make your own" })).toHaveCount(
    3,
  );
  // 1440 physical pixels at 200% browser zoom correspond to 720 CSS pixels.
  await page.setViewportSize({ width: 720, height: 450 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
