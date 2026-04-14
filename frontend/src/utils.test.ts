import { AxiosError } from "axios"
import { describe, expect, test } from "bun:test"
import { ApiError } from "./client/core/ApiError"
import { getInitials, handleError } from "./utils"

describe("getInitials", () => {
  test("returns uppercased initials for two-word names", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL")
  })

  test("returns initials for single-word names", () => {
    expect(getInitials("grace")).toBe("G")
  })
})

describe("handleError", () => {
  test("uses first validation error message from API detail list", () => {
    let received = ""
    const showError = (msg: string) => {
      received = msg
    }
    const apiError = new ApiError(
      { method: "GET", url: "/test", path: "/test" } as any,
      {
        url: "/test",
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        body: { detail: [{ msg: "字段不能为空" }] },
      },
      "Request failed",
    )

    handleError.call(showError, apiError)
    expect(received).toBe("字段不能为空")
  })

  test("uses axios error message when error is AxiosError", () => {
    let received = ""
    const showError = (msg: string) => {
      received = msg
    }
    const axiosError = new AxiosError("Network Error")

    handleError.call(showError, axiosError as any)
    expect(received).toBe("Network Error")
  })
})
