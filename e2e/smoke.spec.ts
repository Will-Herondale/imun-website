import { test, expect } from "@playwright/test";

test.describe("public site", () => {
  test("homepage renders hero, navigation and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Indian MUN/);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .or(page.getByRole("button", { name: "Open main menu" }))
    ).toBeVisible();
    await expect(page.locator("img[alt]").first()).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("link", { name: /Register/ }).first()).toBeVisible();
  });

  test("registration and every top-level page reachable from home", async ({ page }) => {
    const routes = ["/about", "/conference", "/committees", "/registration", "/faq", "/contact", "/privacy"];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} status`).toBe(200);
    }
  });

  test("mobile menu opens and closes with escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Open main menu" }).click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("registration flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/registration");
  });

  test("shows the form when registration is open", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Become a delegate/i })).toBeVisible();
  });

  test("valid submission shows success state", async ({ page }) => {
    const task = page.waitForResponse(
      (r) => r.url().includes("/api/registrations") && r.request().method() === "POST"
    );

    await page.getByLabel(/full name/i).fill("Aarav Sharma");
    await page.getByLabel(/email/i).fill("aarav.e2e@example.com");
    await page.getByLabel(/contact number/i).fill("9876543210");
    await page.getByLabel(/school/i).fill("St Xavier's Collegiate School");
    await page.getByLabel(/grade/i).fill("11");
    await page.getByLabel(/how many/i).selectOption("1");
    await page
      .getByLabel(/participated in/i)
      .fill("Harvest MUN | 2026 | DISEC | Delegate | Special Mention");
    await page.getByLabel(/first committee/i).selectOption("DISEC");
    await page.getByLabel(/second committee/i).selectOption("UNHRC");
    await page.getByLabel(/third committee/i).selectOption("EU");
    await page.getByLabel(/preferred country/i).fill("India");
    await page.getByLabel(/transaction ID/i).fill("412345678901");
    await page.getByLabel(/I confirm that/i).check();
    await page.getByLabel(/I agree to follow/i).check();

    await page.getByRole("button", { name: /Submit/i }).click();
    const res = await task;
    expect(res.status()).toBe(201);

    await expect(page.getByText(/registration received/i)).toBeVisible();
  });

  test("client-side validation blocks an empty submission", async ({ page }) => {
    await page.getByRole("button", { name: /Submit/i }).click();
    await expect(page.getByText(/Name contains invalid characters/i)).toBeVisible();
    await expect(page.locator("[role=alert]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/registration$/);
  });
});

test.describe("admin console", () => {
  test("login page renders and accepts valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /Organiser sign in/i })).toBeVisible();

    await page.getByLabel(/email/i).fill("organiser@iemun.example");
    await page.getByLabel(/password/i).fill("e2e-test-admin-password-0123");
    await page.getByRole("button", { name: /Sign in/i }).click();

    await page.waitForURL("**/admin");
    await expect(page.getByText(/Delegate registrations/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Export CSV/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Delegate/i })).toBeVisible();
  });

  test("unauthenticated access to /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/login");
    await expect(page.getByRole("heading", { name: /Organiser sign in/i })).toBeVisible();
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("organiser@iemun.example");
    await page.getByLabel(/password/i).fill("definitely-wrong-password");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });
});