"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createNote } from "@/lib/notes";

export async function addNote(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "unauthorized" };
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { ok: false, error: "Note text is required" };
  await createNote({
    text,
    noteType: String(formData.get("note_type") ?? "thought"),
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    source: "web",
  });
  revalidatePath("/notes");
  return { ok: true };
}
