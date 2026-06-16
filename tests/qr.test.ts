import { describe, it, expect } from "vitest";
import { qrDataUrl } from "@/lib/qr";

describe("qrDataUrl", () => {
  it("returns a PNG data URL", async () => {
    const url = await qrDataUrl("https://example.com/r/foo");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
