import { test, expect } from "@playwright/test";
test("complete demo journey, evidence, comparison and refinement", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your taste is",
  );
  await page.getByRole("link", { name: "Discover My Taste" }).click();
  await page
    .getByRole("button", { name: "Use the example taste profile" })
    .click();
  await page.getByLabel("An occasion in mind?").fill("Gallery afternoon");
  await page.getByRole("button", { name: "Weave My Taste DNA" }).click();
  await expect(
    page.getByRole("heading", { name: "The Everyday Aesthete" }),
  ).toBeVisible();
  await expect(
    page.getByText("Local sample catalog · No Qloo calls were made."),
  ).toBeVisible();
  await page.getByText("Follow the evidence", { exact: true }).first().click();
  await expect(
    page
      .getByText("Locally authored fixture; not retrieved from Qloo.")
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Compare the evidence" }).click();
  await expect(
    page.getByText("GENERIC LLM-ONLY BASELINE · SIMULATED"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Refine my taste" }).click();
  await expect(
    page.getByRole("button", { name: "Sade", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("empty dashboard and input validation", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Your story starts")).toBeVisible();
  await page.getByRole("link", { name: "Discover My Taste" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose at least one",
  );
});
test("API validation and visible retry state", async ({ page, request }) => {
  const response = await request.post("/api/recommendations", {
    data: { music: [] },
  });
  expect(response.status()).toBe(400);
  await page.goto("/discover");
  await page
    .getByRole("button", { name: "Use the example taste profile" })
    .click();
  await page.route("**/api/recommendations", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Live mode needs QLOO_API_KEY on the server.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Weave My Taste DNA" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "QLOO_API_KEY",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("feedback retrieves an alternative, survives reload, and can be reset", async ({
  page,
}) => {
  await page.goto("/discover");
  await page
    .getByRole("button", { name: "Use the example taste profile" })
    .click();
  await page.getByRole("button", { name: "Weave My Taste DNA" }).click();
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Khruangbin", exact: true }),
  });
  await card.getByText("Not for me · find an alternative").click();
  await card.getByLabel("What should change?").selectOption("Already familiar");
  await card.getByRole("button", { name: "Find an alternative" }).click();
  await expect(
    page.getByRole("heading", { name: "Cleo Sol", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Khruangbin", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("1 suggestions excluded.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cleo Sol", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset exclusions" }).click();
  await expect(
    page.getByRole("heading", { name: "Khruangbin", exact: true }),
  ).toBeVisible();
});

test("all onboarding steps and custom input produce preference-dependent results", async ({
  page,
}) => {
  await page.goto("/discover");
  await page.getByRole("button", { name: "Radiohead", exact: true }).click();
  await page
    .getByLabel("Something else comes to mind?")
    .fill("A custom artist");
  await page.getByRole("button", { name: "Add custom interest" }).click();
  await expect(
    page.getByRole("button", { name: "A custom artist", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Interstellar", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Streetwear", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Nature walks", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Jewel tones", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Styling budget").selectOption("Under $100");
  await page.getByLabel("An occasion in mind?").fill("Outdoor walk");
  await page.getByRole("button", { name: "Weave My Taste DNA" }).click();
  await expect(
    page.getByRole("heading", { name: "Little Simz", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Columbus", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Uniqlo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Outfit concepts", exact: true })
    .click();
  await expect(
    page.getByText("Supportive walking shoes", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Packable weather layer", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("damaged cached results do not block a fresh discovery", async ({
  page,
}) => {
  await page.goto("/discover");
  await page
    .getByRole("button", { name: "Use the example taste profile" })
    .click();
  await page.getByRole("button", { name: "Weave My Taste DNA" }).click();
  await expect(
    page.getByRole("heading", { name: "Khruangbin", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem("tasteweave-result", "{broken json"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Khruangbin", exact: true }),
  ).toBeVisible();
});
