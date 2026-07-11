import { createHash } from "node:crypto";
import type { EmbedFn } from "@/lib/embed";

// deterministic pseudo-embedding: same text → same vector; near-duplicate texts do NOT cluster,
// so tests asserting semantic ranking must query with the exact stored text.
export const fakeEmbed: EmbedFn = async (texts) =>
  texts.map((t) => {
    const h = createHash("sha256").update(t).digest();
    return Array.from({ length: 1536 }, (_, i) => (h[i % 32] - 128) / 128);
  });
