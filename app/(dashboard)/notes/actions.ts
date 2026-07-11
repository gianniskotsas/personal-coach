"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createNote } from "@/lib/notes";

export async function addNote(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("unauthorized");
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await createNote({
    text,
    noteType: String(formData.get("note_type") ?? "thought"),
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    source: "web",
  });
  revalidatePath("/notes");
}
