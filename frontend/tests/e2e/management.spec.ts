import { expect, test } from "@playwright/test";

test("workspace rename, duplicate, delete confirmation and focus restoration", async ({
  page,
  request,
}) => {
  const title = `Manage ${Date.now()}`;
  const form = await (
    await request.post("/api/v1/forms", { data: { title } })
  ).json();
  await page.goto("/workspace");
  await page.getByLabel("Search forms").fill(title);
  const trigger = page.getByLabel(`Actions for ${title}`, { exact: true });
  await trigger.click();
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.getByLabel("Form name", { exact: true })).toBeFocused();
  await page.getByLabel("Form name", { exact: true }).fill(`${title} renamed`);
  await page.getByLabel("Form name", { exact: true }).press("Enter");
  await expect(
    page.getByRole("link", { name: `Open ${title} renamed`, exact: true }),
  ).toBeVisible();
  await page
    .getByLabel(`Actions for ${title} renamed`, { exact: true })
    .click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate form", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: `Open ${title} renamed (copy)`,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel(`Actions for ${title} renamed (copy)`, { exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "all 0 stored responses",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByLabel(`Actions for ${title} renamed (copy)`, { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel(`Actions for ${title} renamed (copy)`, { exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete form", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: `Open ${title} renamed (copy)`,
      exact: true,
    }),
  ).toHaveCount(0);
  expect((await request.get(`/api/v1/forms/${form.id}`)).status()).toBe(200);
});
