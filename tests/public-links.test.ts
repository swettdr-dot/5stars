import { describe, expect, it } from "vitest";
import { sellerReviewLink } from "@/lib/public-links";

describe("sellerReviewLink", () => {
  it("arma el enlace público del vendedor", () => {
    expect(sellerReviewLink("https://app.test", "cafe-luna", "ana")).toBe(
      "https://app.test/r/cafe-luna/ana",
    );
  });

  it("no duplica la barra final del base", () => {
    expect(sellerReviewLink("https://app.test/", "cafe-luna", "ana")).toBe(
      "https://app.test/r/cafe-luna/ana",
    );
  });
});
