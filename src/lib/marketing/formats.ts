export type PostFormat = "SQUARE" | "STORY";

export const FORMAT_DIMS: Record<PostFormat, { width: number; height: number }> = {
  SQUARE: { width: 1080, height: 1080 },
  STORY: { width: 1080, height: 1920 },
};

export const ALL_FORMATS: PostFormat[] = ["SQUARE", "STORY"];

export const FORMAT_LABEL: Record<PostFormat, string> = {
  SQUARE: "Feed (1:1)",
  STORY: "Story (9:16)",
};
