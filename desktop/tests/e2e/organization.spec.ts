import { expect, test } from "@playwright/test";

import { installMockBridge } from "../helpers/bridge";

test.beforeEach(async ({ page }) => {
  await installMockBridge(page);
});

test("organization sidebar route opens the chart and preserves department detail in the URL", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await page.getByTestId("open-organization-view").click();
  await expect(page).toHaveURL(/#\/organization$/);
  await expect(page.getByTestId("organization-view")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organization" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("organization-view.png"),
  });

  await page.getByTestId("organization-department-engineering").click();
  await expect(page).toHaveURL(/department=engineering/);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Engineering", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Code Lead", { exact: true })).toBeVisible();
  await expect
    .poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await page.screenshot({
    path: testInfo.outputPath("organization-engineering-dialog.png"),
  });

  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/department=engineering/);
  await expect(page.getByTestId("open-organization-view")).toHaveAttribute(
    "data-active",
    "true",
  );

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/#\/organization$/);

  await page.getByTestId("global-back").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/#\/organization$/);
});

test("organization counsel stays clear of the CEO at compact desktop widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/#/organization");

  const counsel = page.getByTestId("organization-council");
  const ceo = page.getByTestId("organization-role-ceo");
  await expect(counsel).toBeVisible();
  await expect(ceo).toBeVisible();

  const counselBox = await counsel.boundingBox();
  const ceoBox = await ceo.boundingBox();
  expect(counselBox).not.toBeNull();
  expect(ceoBox).not.toBeNull();

  const overlaps =
    counselBox !== null &&
    ceoBox !== null &&
    counselBox.x < ceoBox.x + ceoBox.width &&
    counselBox.x + counselBox.width > ceoBox.x &&
    counselBox.y < ceoBox.y + ceoBox.height &&
    counselBox.y + counselBox.height > ceoBox.y;
  expect(overlaps).toBe(false);
});

test("organization direct links accept known departments and ignore invalid ids", async ({
  page,
}) => {
  await page.goto("/#/organization?department=engineering");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Engineering");

  await page.goto("/#/organization?department=creative");
  await expect(page.getByTestId("organization-view")).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
