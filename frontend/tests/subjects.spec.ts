import { expect, test } from "@playwright/test";

import { firstSuperuser, firstSuperuserPassword } from "./config.ts";
import { createUser } from "./utils/privateApi";
import { randomEmail, randomPassword } from "./utils/random";
import { logInUser } from "./utils/user";

const randomPersonName = () =>
  `自动化人员-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe("Subjects workspace access control", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Superuser can open /subjects and see heading + tabs", async ({
    page,
  }) => {
    await logInUser(page, firstSuperuser, firstSuperuserPassword);
    await expect(page.getByRole("link", { name: "主体维护" })).toBeVisible();

    await page.goto("/subjects");

    await expect(page.getByRole("heading", { name: "主体维护" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "人员" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "机构" })).toBeVisible();
    await expect(page.getByRole("button", { name: "新增人员" })).toBeVisible();
  });

  test("Non-superuser cannot access /subjects", async ({ page }) => {
    const email = randomEmail();
    const password = randomPassword();

    await createUser({ email, password });
    await logInUser(page, email, password);
    await expect(
      page.getByRole("link", { name: "主体维护" }),
    ).not.toBeVisible();

    await page.goto("/subjects");

    await expect(page).not.toHaveURL(/\/subjects\/?$/);
    await expect(
      page.getByRole("heading", { name: "主体维护" }),
    ).not.toBeVisible();
  });

  test("Superuser can create, edit, and delete a person", async ({ page }) => {
    const createdName = randomPersonName();
    const updatedName = randomPersonName();

    await logInUser(page, firstSuperuser, firstSuperuserPassword);
    await page.goto("/subjects");

    await page.getByRole("button", { name: "新增人员" }).click();
    await page.getByLabel("人员类型").click();
    await page.getByRole("option", { name: "客户联系人" }).click();
    await page.getByLabel("姓名").fill(createdName);
    await page.getByLabel("别名").fill("初始别名");
    await page.getByLabel("备注").fill("初始备注");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("人员创建成功")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: createdName });
    await expect(createdRow).toBeVisible();

    await createdRow
      .getByRole("button", { name: `操作 ${createdName}` })
      .click();
    await page.getByRole("menuitem", { name: "编辑人员" }).click();
    await page.getByLabel("人员类型").click();
    await page.getByRole("option", { name: "外部顾问" }).click();
    await page.getByLabel("姓名").fill(updatedName);
    await page.getByLabel("别名").fill("更新别名");
    await page.getByLabel("备注").fill("更新备注");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("人员更新成功")).toBeVisible();

    const updatedRow = page.getByRole("row").filter({ hasText: updatedName });
    await expect(updatedRow).toBeVisible();

    await updatedRow
      .getByRole("button", { name: `操作 ${updatedName}` })
      .click();
    await page.getByRole("menuitem", { name: "删除人员" }).click();
    await page.getByRole("button", { name: "删除" }).click();

    await expect(page.getByText("人员已成功删除")).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: updatedName }),
    ).not.toBeVisible();
  });
});
