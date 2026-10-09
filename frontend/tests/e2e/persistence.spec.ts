import { expect, test } from "@playwright/test";

test("inline editing publishes the latest revision and an anonymous answer appears in results", async ({
  page,
  browser,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Create form", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Form name" })
    .fill(`A real conversation ${Date.now()}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create form" })
    .click();
  await page.getByRole("button", { name: "Add your first question" }).click();
  await page
    .getByRole("textbox", { name: "Question title", exact: true })
    .fill("What should we call you?");
  await page.getByRole("switch", { name: "Required" }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const publicUrl = await page
    .getByRole("textbox", { name: "Public form link" })
    .inputValue();
  const formId = page.url().split("/")[4];
  const anonymous = await browser.newContext({ reducedMotion: "reduce" });
  const respondent = await anonymous.newPage();
  await respondent.goto(publicUrl);
  await expect(
    respondent.getByRole("heading", { name: /What should we call you/ }),
  ).toBeVisible();
  await respondent.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(respondent.locator(".player-error")).toContainText("answer");
  await respondent.getByRole("textbox").fill("Ada Lovelace");
  await respondent.getByRole("textbox").press("Enter");
  await expect(
    respondent.getByRole("heading", { name: /Thank/ }),
  ).toBeVisible();
  await expect(
    respondent.getByRole("progressbar", { name: "Completed" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("link", { name: "Results", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Ada Lovelace" })).toBeVisible();
  await page.getByRole("button", { name: /^View response/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "What should we call you?",
  );
  await expect(page.getByRole("dialog")).toContainText("Ada Lovelace");
  const saved = await (await request.get(`/api/v1/forms/${formId}`)).json();
  expect(saved.response_count).toBe(1);
  expect(saved.questions[0].title).toBe("What should we call you?");
  await anonymous.close();
});
