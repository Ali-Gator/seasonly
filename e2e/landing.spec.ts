import { expect, test } from "@playwright/test";

test("the placeholder landing renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seasonly" })).toBeVisible();
});
