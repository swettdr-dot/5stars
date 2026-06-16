import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("s3cret");
    expect(await verifyPassword("s3cret", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret");
    expect(await verifyPassword("nope", hash)).toBe(false);
  });
});
