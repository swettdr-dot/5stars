import { describe, it, expect } from "vitest";
import { buildReviewCreateData } from "@/lib/review-build";

describe("buildReviewCreateData", () => {
  const base = {
    businessId: "b1", sellerId: "s1", starThreshold: 5,
    starRating: 5, answers: [{ questionId: "q1", value: "Sí" }],
    comment: "", contactName: "", contactPhone: "", contactEmail: "",
  };
  it("marks 5-star as redirected", () => {
    const d = buildReviewCreateData(base);
    expect(d.outcome).toBe("REDIRECTED_GOOGLE");
    expect(d.answers.create).toHaveLength(1);
  });
  it("marks low rating as internal and keeps contact", () => {
    const d = buildReviewCreateData({ ...base, starRating: 3, comment: "lento", contactName: "Ana" });
    expect(d.outcome).toBe("INTERNAL");
    expect(d.comment).toBe("lento");
    expect(d.contactName).toBe("Ana");
  });
});
