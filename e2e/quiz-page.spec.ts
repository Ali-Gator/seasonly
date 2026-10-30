/**
 * The quiz page on the real router: its history entries have to survive Next's own, which a DOM
 * test cannot show.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { expect, type Page, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

const PATH = "/color-analysis-quiz";

async function toResult(page: Page) {
  await page.goto(PATH);
  for (const [i, label] of ["Blue or purple", "Silver", "Burns, rarely tans"].entries()) {
    await expect(page.getByText(`Question ${i + 1} of 4`)).toBeVisible();
    await page.getByText(label, { exact: true }).click();
  }
  await expect(page.getByText("Question 4 of 4")).toBeVisible();
  await page.getByText("Blonde", { exact: true }).click();
  await page.getByRole("button", { name: "See my result" }).click();
  await expect(page.getByRole("heading", { name: "Summer", exact: true })).toBeVisible();
}

test.describe("the quiz page", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-page-opens-on-question-1} */
  test("shows every option of question 1 in the first phone screen, with no Back", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(page.locator("h1")).toHaveText("Color analysis quiz: what season am I?");
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
    const last = await page.locator("label.sn-quiz").last().boundingBox();
    expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThanOrEqual(812);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-back-inside-the-quiz} */
  test("Back shows the previous question with its answer, at the same address", async ({
    page,
  }) => {
    await page.goto(PATH);
    await page.getByText("Blue or purple", { exact: true }).click();
    await expect(page.getByText("Question 2 of 4")).toBeVisible();
    await page.getByText("Silver", { exact: true }).click();
    await expect(page.getByText("Question 3 of 4")).toBeVisible();

    await page.goBack();
    await expect(page.getByText("Question 2 of 4")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Silver/ })).toBeChecked();
    await expect(page).toHaveURL(new RegExp(`${PATH}$`));

    await page.goBack();
    await expect(page.getByText("Question 1 of 4")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Blue or purple/ })).toBeChecked();

    await page.goForward();
    await expect(page.getByText("Question 2 of 4")).toBeVisible();
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-reload-on-the-result} */
  test("a reload keeps the result", async ({ page }) => {
    await toResult(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Summer", exact: true })).toBeVisible();
  });

  /**
   * {@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-link-carries-the-answers}
   * {@link openspec/specs/quiz-page/spec.md#scenario-back-from-the-photo-guide-returns-to-the-result}
   * {@link openspec/specs/capture-flow/spec.md#scenario-opening-with-the-quiz-pages-answers}
   */
  test("the selfie link opens the guide with a clean address, and Back returns to the result", async ({
    page,
  }) => {
    await toResult(page);
    await page.getByRole("link", { name: "Add a selfie for your exact season" }).click();
    await expect(
      page.getByRole("heading", { name: "Three things before your selfie" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/analyze$/);

    await page.goBack();
    await expect(page.getByRole("heading", { name: "Summer", exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${PATH}$`));
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-a-tap-moves-on-as-in-the-flow} */
  test("focus moves to each new question's heading", async ({ page }) => {
    await page.goto(PATH);
    await page.getByText("Blue or purple", { exact: true }).click();
    await expect(page.getByRole("heading", { name: /Hold gold and silver/ })).toBeFocused();
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  test("Forward after a reload keeps every answer the result's entry holds", async ({ page }) => {
    await toResult(page);
    for (const n of [4, 3, 2, 1]) {
      await page.goBack();
      await expect(page.getByText(`Question ${n} of 4`)).toBeVisible();
    }
    await page.reload();
    await expect(page.getByText("Question 1 of 4")).toBeVisible();
    for (const n of [2, 3, 4]) {
      await page.goForward();
      await expect(page.getByText(`Question ${n} of 4`)).toBeVisible();
    }
    await page.goForward();
    await expect(
      page.getByRole("link", { name: "Add a selfie for your exact season" }),
    ).toHaveAttribute("href", "/analyze?veins=blue&jewelry=silver&sun=burn&hair=blonde");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-reload-on-the-result} */
  test("an answer changed through Back survives a reload of the result", async ({ page }) => {
    await toResult(page);
    await page.goBack();
    await expect(page.getByText("Question 4 of 4")).toBeVisible();
    await page.getByText("Red or auburn", { exact: true }).click();
    await page.goForward();
    await expect(
      page.getByRole("link", { name: "Add a selfie for your exact season" }),
    ).toHaveAttribute("href", /hair=red/);
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Add a selfie for your exact season" }),
    ).toHaveAttribute("href", /hair=red/);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-nothing-is-sent} */
  test("sends nothing to the API", async ({ page }) => {
    const api: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
    });
    await toResult(page);
    expect(api).toEqual([]);
  });
});
