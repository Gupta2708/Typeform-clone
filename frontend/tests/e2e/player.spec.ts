import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

async function published(request: APIRequestContext, types: string[]) {
  const form = await (
    await request.post("/api/v1/forms", {
      data: { title: `Player check ${Date.now()}` },
    })
  ).json();
  const questions = types.map((type) => ({
    id: crypto.randomUUID(),
    type,
    title: `Your ${type.replaceAll("_", " ")} answer?`,
    description: "Take your time. There’s no rush.",
    required: true,
    settings:
      type === "rating"
        ? { scale: 5 }
        : type === "number"
          ? { min: 0, max: 10 }
          : {},
    options: ["multiple_choice", "dropdown"].includes(type)
      ? ["Design", "People", "Service"].map((label) => ({
          id: crypto.randomUUID(),
          label,
        }))
      : [],
  }));
  const saved = await (
    await request.put(`/api/v1/forms/${form.id}/draft`, {
      data: {
        expected_revision: 0,
        title: form.title,
        questions,
        thank_you: {
          title: "You made our day.",
          description: "Your answers arrived safely.",
        },
      },
    })
  ).json();
  const result = await (
    await request.post(`/api/v1/forms/${form.id}/publish`, {
      data: { expected_revision: saved.draft_revision },
    })
  ).json();
  return result;
}
async function heading(page: Page, type: string) {
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Your ${type.replaceAll("_", " ")} answer`),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next question" }),
  ).toBeEnabled();
}

test("anonymous flow validates and stores all eight types with keyboard navigation, back, false and zero", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const types = [
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
  ];
  const form = await published(request, types);
  await page.goto(`/to/${form.slug}`);
  const screenshots = path.resolve(
    __dirname,
    "../../../docs/screenshots/phase-4",
  );
  await fs.mkdir(screenshots, { recursive: true });
  await heading(page, "short_text");
  await page.screenshot({
    path: path.join(screenshots, "public-text-desktop.png"),
    fullPage: true,
  });
  await heading(page, "short_text");
  await expect(page.getByRole("heading")).toBeFocused();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("textbox").fill("  Ada  ");
  await page.getByRole("textbox").press("Enter");
  await heading(page, "long_text");
  await page.getByRole("textbox").fill("Line one");
  await page.getByRole("textbox").press("End");
  await page.getByRole("textbox").press("Enter");
  await page.keyboard.type("Line two");
  await expect(page.getByRole("textbox")).toHaveValue("Line one\nLine two");
  await page.getByRole("textbox").press("Control+Enter");
  await heading(page, "multiple_choice");
  await page.screenshot({
    path: path.join(screenshots, "public-choice-desktop.png"),
    fullPage: true,
  });
  await page.keyboard.press("B");
  await expect(
    page.getByRole("radio", { name: "People", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await heading(page, "dropdown");
  const combo = page.getByRole("combobox");
  await combo.fill("serv");
  await expect(page.getByRole("option")).toHaveCount(1);
  await combo.press("ArrowDown");
  await combo.press("Enter");
  await expect(combo).toHaveValue("Service");
  await combo.press("Enter");
  await heading(page, "email");
  await page.getByRole("textbox").fill("not-an-email");
  await page.getByRole("textbox").press("Enter");
  await expect(page.locator(".player-error")).toContainText("valid email");
  await page.getByRole("textbox").fill("ada@example.com");
  await page.getByRole("textbox").press("Enter");
  await heading(page, "number");
  await page.getByRole("textbox").fill("Infinity");
  await page.getByRole("textbox").press("Enter");
  await expect(page.locator(".player-error")).toContainText("finite number");
  await page.getByRole("textbox").fill("11");
  await page.getByRole("textbox").press("Enter");
  await expect(page.locator(".player-error")).toContainText("no more than 10");
  await page.getByRole("textbox").fill("0");
  await page.getByRole("textbox").press("Enter");
  await heading(page, "yes_no");
  await page.keyboard.press("B");
  await expect(
    page.getByRole("radio", { name: "No", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await heading(page, "rating");
  await page.getByRole("button", { name: "Previous question" }).click();
  await heading(page, "yes_no");
  await expect(
    page.getByRole("radio", { name: "No", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await heading(page, "rating");
  await page.getByRole("radio", { name: "1 out of 5" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "3 out of 5" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "You made our day." }),
  ).toBeVisible();
  const data = await (
    await request.get(`/api/v1/forms/${form.id}/responses`)
  ).json();
  expect(data.total).toBe(1);
  expect(data.items[0].answers.map((a: { value: unknown }) => a.value)).toEqual(
    [
      "Ada",
      "Line one\nLine two",
      form.questions[2].options[1].id,
      form.questions[3].options[2].id,
      "ada@example.com",
      0,
      false,
      3,
    ],
  );
});

test("lost acknowledgement retains answers and retry reuses the same key without a second response", async ({
  page,
  request,
}) => {
  const form = await published(request, ["short_text"]);
  await page.goto(`/to/${form.slug}`);
  const attempts: unknown[] = [];
  await page.route(
    `**/api/v1/public/forms/${form.slug}/responses`,
    async (route) => {
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) {
        const result = await route.fetch();
        expect(result.status()).toBe(201);
        await route.abort();
      } else await route.continue();
    },
  );
  await page.getByRole("textbox").fill("Keep my answer");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator(".player-error")).toContainText("still here");
  await expect(page.getByRole("textbox")).toHaveValue("Keep my answer");
  await expect(
    page.getByRole("heading", { name: "You made our day." }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry submission", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You made our day." }),
  ).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
  expect(
    (await (await request.get(`/api/v1/forms/${form.id}`)).json())
      .response_count,
  ).toBe(1);
});

test("transitions suppress repeated Enter and mobile player remains spacious and usable", async ({
  page,
  request,
}) => {
  const form = await published(request, [
    "short_text",
    "multiple_choice",
    "dropdown",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/to/${form.slug}`);
  await page.getByRole("textbox").fill("Mobile answer");
  await page.getByRole("textbox").press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await heading(page, "multiple_choice");
  await expect(page.locator(".player-question")).toHaveCount(1);
  const directory = path.resolve(
    __dirname,
    "../../../docs/screenshots/phase-4",
  );
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, "public-choice-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("radio", { name: "People" }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await heading(page, "dropdown");
  await page.getByRole("combobox").click();
  await page.screenshot({
    path: path.join(directory, "public-dropdown-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("option", { name: "Service", exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You made our day." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("closing collection is reflected on an open player's submission and later visits", async ({
  page,
  request,
}) => {
  const form = await published(request, ["short_text"]);
  await page.goto(`/to/${form.slug}`);
  await page.getByRole("textbox").fill("Before closing");
  expect(
    (await request.post(`/api/v1/forms/${form.id}/unpublish`)).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator(".player-error")).toContainText(
    /closed|accepting|paused/i,
  );
  await expect(page.getByRole("textbox")).toHaveValue("Before closing");
  expect(
    (await (await request.get(`/api/v1/forms/${form.id}`)).json())
      .response_count,
  ).toBe(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This conversation is on pause." }),
  ).toBeVisible();
});
