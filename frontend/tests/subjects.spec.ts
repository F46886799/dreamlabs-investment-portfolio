import { expect, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

test.describe("Subjects workspace access control", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Superuser can open /subjects and see heading + tabs", async ({
    page,
  }) => {
    await logInUser(page, firstSuperuser, firstSuperuserPassword)
    await expect(page.getByRole("link", { name: "主体维护" })).toBeVisible()

    await page.goto("/subjects")

    await expect(page.getByRole("heading", { name: "主体维护" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "人员" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "机构" })).toBeVisible()
  })

  test("Non-superuser cannot access /subjects", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()

    await createUser({ email, password })
    await logInUser(page, email, password)
    await expect(page.getByRole("link", { name: "主体维护" })).not.toBeVisible()

    await page.goto("/subjects")

    await expect(page).not.toHaveURL(/\/subjects\/?$/)
    await expect(page.getByRole("heading", { name: "主体维护" })).not.toBeVisible()
  })
})
