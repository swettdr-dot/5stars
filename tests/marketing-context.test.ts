import { describe, it, expect } from "vitest";
import { marketingBusinessWhere } from "@/lib/marketing/context";

describe("marketingBusinessWhere", () => {
  it("business admin se acota a su negocio e ignora el id pedido", () => {
    expect(marketingBusinessWhere({ role: "BUSINESS_ADMIN", businessId: "b1" }, "otro"))
      .toEqual({ id: "b1" });
  });
  it("agency admin combina su agencia con el negocio pedido", () => {
    expect(marketingBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }, "b9"))
      .toEqual({ id: "b9", agencyId: "a1" });
  });
  it("agency admin sin id pedido se acota solo a su agencia", () => {
    expect(marketingBusinessWhere({ role: "AGENCY_ADMIN", agencyId: "a1" }))
      .toEqual({ agencyId: "a1" });
  });
  it("super admin con id pedido se acota a ese negocio", () => {
    expect(marketingBusinessWhere({ role: "SUPER_ADMIN" }, "b3"))
      .toEqual({ id: "b3" });
  });
});
