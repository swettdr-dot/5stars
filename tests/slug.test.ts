import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Café Pérez 1")).toBe("cafe-perez-1");
  });
  it("strips leading/trailing separators", () => {
    expect(slugify("  Hola!!  ")).toBe("hola");
  });
});
