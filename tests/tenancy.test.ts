import { describe, it, expect } from "vitest";
import { businessWhereForSession } from "@/lib/tenancy";

describe("businessWhereForSession", () => {
  it("super admin sees all (empty filter)", () => {
    expect(businessWhereForSession({ role: "SUPER_ADMIN" })).toEqual({});
  });
  it("agency admin scoped to their agency", () => {
    expect(businessWhereForSession({ role: "AGENCY_ADMIN", agencyId: "a1" }))
      .toEqual({ agencyId: "a1" });
  });
  it("business admin scoped to their business", () => {
    expect(businessWhereForSession({ role: "BUSINESS_ADMIN", businessId: "b1" }))
      .toEqual({ id: "b1" });
  });
  it("seller scoped to their business", () => {
    expect(businessWhereForSession({ role: "SELLER", businessId: "b1" }))
      .toEqual({ id: "b1" });
  });
});
