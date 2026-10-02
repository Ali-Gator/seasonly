import { expect, test } from "@playwright/test";

// Asserts only what survives the placeholder being replaced: the page answers and is branded.
test("the landing renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Seasonly/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
