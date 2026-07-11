import { describe, it, expect, vi } from "vitest";

const createMock = vi.fn(async ({ input }: { input: string[] }) => ({
  data: input.map((_, i) => ({ index: i, embedding: Array(1536).fill(0.1) })),
}));
vi.mock("openai", () => ({
  default: class { embeddings = { create: createMock }; },
}));

const { embedTexts } = await import("@/lib/embed");

describe("embedTexts", () => {
  it("batches inputs of >100 into multiple calls", async () => {
    const texts = Array.from({ length: 150 }, (_, i) => `t${i}`);
    const out = await embedTexts(texts);
    expect(out).toHaveLength(150);
    expect(out[0]).toHaveLength(1536);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
