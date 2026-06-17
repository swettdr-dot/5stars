import { describe, it, expect } from "vitest";
import { blobKey } from "@/lib/marketing/storage";

describe("blobKey", () => {
  it("arma una ruta estable por negocio/post/formato", () => {
    expect(blobKey("b1", "p9", "SQUARE")).toBe("marketing/b1/p9-square.png");
    expect(blobKey("b1", "p9", "STORY")).toBe("marketing/b1/p9-story.png");
  });
});
