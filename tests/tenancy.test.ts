import { describe, it, expect } from "vitest";
import {
  businessWhereForSession,
  canManageBusinessConfig,
  manageableBusinessWhere,
} from "@/lib/tenancy";

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

describe("canManageBusinessConfig", () => {
  it("permite a super y agencia", () => {
    expect(canManageBusinessConfig("SUPER_ADMIN")).toBe(true);
    expect(canManageBusinessConfig("AGENCY_ADMIN")).toBe(true);
  });
  it("niega a negocio y vendedor", () => {
    expect(canManageBusinessConfig("BUSINESS_ADMIN")).toBe(false);
    expect(canManageBusinessConfig("SELLER")).toBe(false);
  });
});

describe("manageableBusinessWhere", () => {
  it("agencia combina el negocio pedido con su agencia", () => {
    expect(manageableBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }, "b9"))
      .toEqual({ id: "b9", agencyId: "a1" });
  });
  it("super admin se acota al negocio pedido", () => {
    expect(manageableBusinessWhere({ role: "SUPER_ADMIN" }, "b3"))
      .toEqual({ id: "b3" });
  });
  it("negocio no puede gestionar (null)", () => {
    expect(manageableBusinessWhere({ role: "BUSINESS_ADMIN", businessId: "b1" }, "b1"))
      .toBeNull();
  });
  it("vendedor no puede gestionar (null)", () => {
    expect(manageableBusinessWhere({ role: "SELLER", businessId: "b1" }, "b1"))
      .toBeNull();
  });
});
