import OpenAI from "openai";
import { createHash } from "node:crypto";

let client: OpenAI | null = null;
const getClient = () => (client ??= new OpenAI());
const BATCH = 100;

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

// Dev/test-only deterministic embeddings, gated behind COACH_EMBED_MODE=fake.
// Lets the app run locally with no OpenAI key. NEVER set this in production —
// it makes semantic search meaningless (only the keyword/FTS leg stays useful).
const fakeEmbedText = (texts: string[]): number[][] =>
  texts.map((t) => {
    const h = createHash("sha256").update(t).digest();
    return Array.from({ length: 1536 }, (_, i) => (h[i % 32] - 128) / 128);
  });

export const embedTexts: EmbedFn = async (texts) => {
  if (process.env.COACH_EMBED_MODE === "fake") return fakeEmbedText(texts);
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    let res;
    try {
      res = await getClient().embeddings.create({ model: "text-embedding-3-small", input: batch });
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
      res = await getClient().embeddings.create({ model: "text-embedding-3-small", input: batch });
    }
    for (const d of res.data) out[i + d.index] = d.embedding;
  }
  return out;
};
