import { test, expect } from "@playwright/test";

async function finishOnboarding(page: import("@playwright/test").Page) {
  await page.waitForFunction(() =>
    localStorage.getItem("agendaUser") !== null || document.body.innerText.includes("Welcome to Agenda+"),
  );
  const welcome = page.getByRole("dialog").filter({ hasText: "Welcome to Agenda+" });
  if (await page.evaluate(() => localStorage.getItem("agendaUser") === null)) {
    await welcome.locator("#name").fill("Agenda+ Test");
    await welcome.locator("#url").fill("https://example.com");
    await welcome.getByRole("button", { name: "Launch BUDD-IE" }).click();
    await expect(welcome).toBeHidden();
  }
  const skipSync = page.getByRole("button", { name: "Skip & Continue to Dashboard" });
  await skipSync.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  if (await skipSync.isVisible().catch(() => false)) await skipSync.click();
}

test.describe("Agenda+ production app", () => {
  test("exported routes and sidebar destinations are available", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Agenda\+/);
    await finishOnboarding(page);

    const pages = [
      ["University Portal", "/portal", "BUDD-IE Portal Sync"],
      ["Assignments", "/assignments", "Upcoming Assignments"],
      ["Grades", "/grades", "Grade Overview"],
      ["Calendar", "/calendar", "This Week's Deadlines"],
      ["Discussions", "/discussions", "Discussions"],
      ["Announcements", "/announcements", "Announcements"],
      ["Study", "/study", "Study Hub"],
      ["Live Session", "/live", "Join Live Session"],
    ] as const;

    for (const [label, path, marker] of pages) {
      await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", path);
      await page.goto(path);
      await finishOnboarding(page);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}(?:/)?$`));
      await expect(page.locator("main")).toContainText(marker, { timeout: 10000 });
      await expect(page.locator("body")).not.toContainText("Directory listing");
    }
  });

  test("tasks can be added, saved across reload, and completed", async ({ page }) => {
    await page.goto("/tasks");
    await finishOnboarding(page);

    await page.getByRole("button", { name: "Add Task", exact: true }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Add a New Task" });
    await dialog.locator("#task-title").fill("E2E task persistence check");
    await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
    await expect(page.getByText("E2E task persistence check", { exact: true })).toBeVisible();

    await page.reload();
    const taskRow = page.getByRole("row").filter({ hasText: "E2E task persistence check" });
    await expect(taskRow).toBeVisible();
    await taskRow.getByRole("checkbox").click();
    await page.getByRole("tab", { name: "Completed" }).click();
    await expect(taskRow).toContainText("Completed");
  });
});
