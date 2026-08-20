import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

import { waitForAnimations } from "../helpers/animations";
import { installMockBridge } from "../helpers/bridge";

const SYSTEM_MANAGER_PUBKEY =
  "2d9424195e68d77a8cd1183c543f86fde64df1ac783296d6d309e31ab8b255e6";
const UNMAPPED_AGENT_PUBKEY = "f".repeat(64);

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("reports disconnection")) {
    await installMockBridge(page, {
      organizationFactsErrors: ["mock adapter unavailable", null],
    });
    return;
  }
  await installMockBridge(page, {
    organizationChannels: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "operations-finance",
        channelType: "stream",
        visibility: "private",
        description: "Operations & Finance coordination",
        topic: "Close the current reporting cycle",
        purpose: "Coordinate owner-reviewed finance work",
        memberPubkeys: [
          "dfc0163ab1c9fcda33ab0afd83386b2b173758b10d989dfba6ae3843e2f985d1",
        ],
      },
    ],
    managedAgents: [
      {
        name: "System Manager",
        pubkey: SYSTEM_MANAGER_PUBKEY,
        status: "running",
      },
      {
        name: "Unmapped reviewer",
        pubkey: UNMAPPED_AGENT_PUBKEY,
        status: "stopped",
      },
      {
        name: "Legacy record",
        pubkey: "legacy-record",
        status: "stopped",
      },
      {
        name: "Finance Lead",
        pubkey:
          "dfc0163ab1c9fcda33ab0afd83386b2b173758b10d989dfba6ae3843e2f985d1",
        personaId: "finance-lead",
        teamId: "operations-finance",
        status: "running",
      },
    ],
    teams: [
      {
        id: "operations-finance",
        name: "Operations & Finance",
        description: "Owner-reviewed finance work",
        personaIds: ["finance-lead"],
      },
    ],
  });
});

test("organization reports disconnection and retries without hiding planning data", async ({
  page,
}) => {
  await page.goto("/#/organization");

  const retry = page.getByRole("button", {
    name: /Buzz disconnected.*Retry now/,
  });
  await expect(retry).toBeVisible();
  await expect(page.getByText("agent facts unavailable")).toBeVisible();
  await expect(page.getByTestId("organization-view")).toBeVisible();

  await retry.click();
  await expect(page.getByText("Buzz live", { exact: true })).toBeVisible();
  await expect(retry).not.toBeVisible();
});

test("organization sidebar route opens the chart and preserves department detail in the URL", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await page.getByTestId("open-organization-view").click();
  await expect(page).toHaveURL(/#\/organization$/);
  await expect(page.getByTestId("organization-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Organization" })).toHaveText(
    "Organization",
  );
  await expect(page.getByText("Buzz live", { exact: true })).toBeVisible();
  await expect(
    page.getByText("· 1 identity excluded", { exact: true }),
  ).toBeVisible();
  const systemManager = page.getByTestId("organization-role-system-manager");
  await expect(systemManager).toContainText("observed");
  await expect(systemManager).toContainText("System Manager · running");

  const reconciliation = page.getByTestId(
    "organization-identity-reconciliation",
  );
  await expect(reconciliation).toBeVisible();
  await expect(
    reconciliation.getByLabel(
      "Unmapped reviewer, stopped, no Agent Tower role link",
    ),
  ).toBeVisible();
  await expect(reconciliation).toContainText(
    "Finance Lead · placement pending",
  );

  await expect(page.getByTestId("organization-system-buzz")).toContainText(
    "Not the organisation hierarchy",
  );
  await expect(
    page.getByTestId("organization-system-agent-tower"),
  ).toContainText("Authoritative local organisation");
  await expect(page.getByTestId("organization-system-hermes")).toContainText(
    "Agent runtime",
  );
  await expect(page.getByTestId("organization-system-linear")).toContainText(
    "Canonical planned-work",
  );
  await expect(
    page.getByTestId("organization-system-rheos-brain"),
  ).toContainText("Durable knowledge");
  await expect(
    page.getByTestId("organization-system-muse-local-rig"),
  ).toContainText("Optional coding workspace");

  await waitForAnimations(page);
  const chartPath = testInfo.outputPath("organization-chart.png");
  const chartScreenshot = await page
    .getByTestId("organization-view")
    .screenshot({ path: chartPath });

  await page.getByTestId("organization-department-operations").click();
  await expect(page).toHaveURL(/department=operations/);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Operations & Finance", { exact: true }),
  ).toBeVisible();
  const financeSeat = dialog.getByTestId(
    "organization-seat-operations-finance-lead",
  );
  await expect(
    financeSeat.getByText("Finance Lead", { exact: true }),
  ).toBeVisible();
  await expect(financeSeat).toContainText("Finance Lead · running");
  await expect(financeSeat).toContainText("Placement pending");
  await expect(financeSeat).toContainText(
    "Reports to Head of Operations & Finance",
  );
  await expect(dialog).toContainText("1 channel · 1 team");
  await expect(dialog.getByTestId("organization-live-channels")).toContainText(
    "#operations-finance",
  );
  await expect(dialog.getByTestId("organization-live-channels")).toContainText(
    "Close the current reporting cycle",
  );
  await waitForAnimations(page);
  const dialogPath = testInfo.outputPath("organization-operations-dialog.png");
  const dialogScreenshot = await dialog.screenshot({ path: dialogPath });

  const screenshotHashes = {
    [chartPath]: sha256(chartScreenshot),
    [dialogPath]: sha256(dialogScreenshot),
  };
  expect(screenshotHashes[chartPath]).not.toBe(screenshotHashes[dialogPath]);
  await testInfo.attach("organization-screenshot-sha256", {
    body: Buffer.from(JSON.stringify(screenshotHashes, null, 2)),
    contentType: "application/json",
  });

  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/department=operations/);
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

test("organization exports only after owner destination selection and reports errors", async ({
  page,
}, testInfo) => {
  await installMockBridge(page, {
    organizationExportResults: [
      { saved: false },
      {
        saved: true,
        destination: "/tmp/buzz-organization-snapshot.json",
      },
      { error: "mock destination unavailable" },
    ],
  });
  await page.goto("/#/organization");

  await page.getByTestId("organization-export-open").click();
  const dialog = page.getByTestId("organization-export-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Secret-free organization snapshot");
  await expect(dialog).toContainText("Private channel names");
  await expect(dialog).toContainText("organization-sensitive");
  await expect(dialog).toContainText("Keys and auth tags");
  await expect(dialog).toContainText("Agent Tower policy or knowledge");
  await expect(dialog).not.toContainText(SYSTEM_MANAGER_PUBKEY);
  await waitForAnimations(page);
  await dialog.screenshot({
    path: testInfo.outputPath("organization-safe-export-dialog.png"),
  });

  const confirm = dialog.getByTestId("organization-export-confirm");
  await confirm.click();
  await expect(dialog.getByTestId("organization-export-success")).toHaveCount(
    0,
  );
  await expect(dialog.getByTestId("organization-export-error")).toHaveCount(0);

  await confirm.click();
  await expect(dialog.getByTestId("organization-export-success")).toContainText(
    "/tmp/buzz-organization-snapshot.json",
  );

  await confirm.click();
  await expect(dialog.getByTestId("organization-export-error")).toContainText(
    "mock destination unavailable",
  );
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
