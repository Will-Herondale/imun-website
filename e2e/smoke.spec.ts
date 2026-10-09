import { test, expect } from "@playwright/test";

test.describe("public site", () => {
  test("homepage renders hero, navigation and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Indian Model United Nations/);
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

  /** Fills every answer except the declaration checkboxes. */
  async function fillForm(page: import("@playwright/test").Page) {
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
    await page.getByLabel(/third committee/i).selectOption("AIPPM");
    await page.getByLabel(/preferred country/i).fill("India");
  }

  test("shows the form when registration is open", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Become a delegate/i })).toBeVisible();
  });

  /* A typed UTR could be anything, so it must not appear as a way to register:
   * the only route to a seat is a payment the server verifies with FamGateway. */
  test("offers no self-reported payment reference field", async ({ page }) => {
    await expect(page.getByLabel(/transaction ID/i)).toHaveCount(0);
    await expect(page.getByLabel(/UTR/i)).toHaveCount(0);
    await expect(page.getByText(/cannot accept a self-reported transaction reference/i)).toBeVisible();
  });

  test("saves the draft and starts a verified checkout instead of registering", async ({ page }) => {
    /* Any POST to the legacy endpoint would be a registration attempt that skips
     * verification — it must never happen from the public form. */
    const unverifiedPosts: string[] = [];
    page.on("request", (r) => {
      const url = r.url();
      if (r.method() === "POST" && url.includes("/api/registrations") && !url.includes("/intents")) {
        unverifiedPosts.push(url);
      }
    });

    const intentPost = page.waitForRequest(
      (r) => r.url().includes("/api/registrations/intents") && r.method() === "POST"
    );

    await fillForm(page);
    await page.getByLabel(/I confirm that/i).check();
    await page.getByLabel(/I agree to follow/i).check();
    await page.getByRole("button", { name: /Pay .* & register/i }).click();
    await intentPost;

    /* No seat is granted without a verified payment. */
    await expect(page.getByText(/registration received/i)).toHaveCount(0);
    expect(unverifiedPosts).toEqual([]);
  });

  test("client-side validation blocks an empty submission", async ({ page }) => {
    await page.getByRole("button", { name: /Pay .* & register/i }).click();
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

  test("an organiser can add a delegate by hand", async ({ page }) => {
    const email = `admin.e2e+${Date.now()}@example.com`;

    async function signIn() {
      await page.goto("/admin/login");
      await page.getByLabel(/email/i).fill("organiser@iemun.example");
      await page.getByLabel(/password/i).fill("e2e-test-admin-password-0123");
      await page.getByRole("button", { name: /Sign in/i }).click();
      await page.waitForURL("**/admin");
    }

    async function fillDelegateForm(theEmail: string) {
      await page.getByLabel(/full name/i).fill("Zoya Verma");
      await page.getByLabel(/email address/i).fill(theEmail);
      await page.getByLabel(/contact number/i).fill("9876543210");
      await page.getByLabel(/school name/i).fill("Delhi Public School");
      await page.getByLabel(/grade/i).fill("10");
      await page.getByLabel(/prior MUN conferences/i).selectOption("1");
      await page
        .getByLabel(/MUN history/i)
        .fill("Harvest MUN | 2026 | DISEC | Delegate | Special Mention");
      await page.getByLabel(/first committee/i).selectOption("DISEC");
      await page.getByLabel(/second committee/i).selectOption("UNHRC");
      await page.getByLabel(/third committee/i).selectOption("AIPPM");
      await page.getByLabel(/preferred country/i).fill("India");
      await page.getByLabel(/payment reference/i).fill("UTR998877665544");
      await page.getByLabel(/sent by/i).fill("Verma");
    }

    await signIn();
    await expect(page.getByRole("button", { name: "Add delegate", exact: true })).toBeVisible();

    /* Create. */
    await page.getByRole("button", { name: "Add delegate", exact: true }).click();
    await fillDelegateForm(email);
    await page.getByRole("button", { name: "Save delegate" }).click();
    await expect(page.getByText(/Zoya Verma was added to the registration list/i)).toBeVisible();
    /* Earlier runs leave rows with the same name, so match on the unique email. */
    await expect(page.getByRole("row").filter({ hasText: email })).toBeVisible();

    /* The same email cannot produce a second seat. */
    await page.getByRole("button", { name: "Add delegate", exact: true }).click();
    await fillDelegateForm(email);
    await page.getByRole("button", { name: "Save delegate" }).click();
    await expect(page.getByText(/That email already has a registration/i)).toBeVisible();
    await page.getByRole("button", { name: /Open the existing registration/i }).click();
    const details = page.getByRole("dialog", { name: /Registration details/i });
    await expect(details).toBeVisible();
    await expect(details.getByText(email)).toBeVisible();
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill("organiser@iemun.example");
    await page.getByLabel(/password/i).fill("definitely-wrong-password");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });
});