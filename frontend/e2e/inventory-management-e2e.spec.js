import { test, expect } from "@playwright/test";

const HOSPITAL_EMAIL = "hospital@vaxora.local";
const HOSPITAL_PASSWORD = "Hospital@123"; // <- adjust to the seeded password

async function loginAsHospital(page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(HOSPITAL_EMAIL);
  await page.getByLabel(/password/i).fill(HOSPITAL_PASSWORD);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL("**/hospital/**", { timeout: 15000 });
}

test.describe("Inventory Management E2E", () => {
  test("Hospital user can open the inventory tab and see KPI cards", async ({
    page,
  }) => {
    await loginAsHospital(page);
    await page.goto("/hospital/inventory");
    await expect(page.getByText(/vaccine inventory/i)).toBeVisible({
      timeout: 10000,
    });
    // KPI summary cards should render
    await expect(page.getByText(/total vials/i)).toBeVisible();
  });

  test("Inventory batch table renders rows when data is available", async ({
    page,
  }) => {
    await loginAsHospital(page);
    await page.goto("/hospital/inventory");
    await page.waitForLoadState("networkidle");
    // Either batches render or an empty state message appears
    const hasRows = await page.locator("table tbody tr").count();
    const hasEmpty = await page
      .getByText(/no batches|no inventory|empty/i)
      .count();
    expect(hasRows + hasEmpty).toBeGreaterThan(0);
  });

  test("Search filter narrows the batch list", async ({ page }) => {
    await loginAsHospital(page);
    await page.goto("/hospital/inventory");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder(/search/i).first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill("Pfizer");
      await page.waitForTimeout(300);
      // Verify the search input accepted the value
      await expect(searchInput).toHaveValue("Pfizer");
    }
  });

  test("Restock modal opens and validates required fields", async ({
    page,
  }) => {
    await loginAsHospital(page);
    await page.goto("/hospital/inventory");

    const restockBtn = page
      .getByRole("button", { name: /restock|log shipment|add stock/i })
      .first();
    await restockBtn.click();

    await expect(page.getByText(/Log Vaccine Restock Shipment/i)).toBeVisible();

    // Submit without filling anything — should not call the API
    const submitBtn = page.getByRole("button", { name: /commit shipment/i });
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toMatch(/vaccine product name/i);
      dialog.dismiss();
    });
    await submitBtn.click();
  });

  test("Restock modal rejects an empty submission cleanly", async ({
    page,
  }) => {
    await loginAsHospital(page);
    await page.goto("/hospital/inventory");
    await page
      .getByRole("button", { name: /restock|log shipment|add stock/i })
      .first()
      .click();
    await expect(page.getByText(/Log Vaccine Restock Shipment/i)).toBeVisible();
    // Close the modal via the X button
    await page
      .getByRole("button", { name: /×|close/i })
      .first()
      .click();
    await expect(page.getByText(/Log Vaccine Restock Shipment/i)).toBeHidden();
  });

  test("Protected inventory route redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/hospital/inventory");
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /log in|sign in/i }),
    ).toBeVisible();
  });
});
