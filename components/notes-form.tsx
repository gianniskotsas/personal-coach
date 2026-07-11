"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addNote } from "@/app/(dashboard)/notes/actions";

export function NotesForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addNote(formData);
      if (result.ok) {
        toast.success("Note added");
        formRef.current?.reset();
      } else {
        toast.error(result.error ?? "Failed to add note");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-3 max-w-xl">
      <Textarea name="text" rows={3} placeholder="Thought, idea, concern…" required />
      <div className="flex gap-2">
        <Select name="note_type" defaultValue="thought">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thought">thought</SelectItem>
            <SelectItem value="idea">idea</SelectItem>
            <SelectItem value="concern">concern</SelectItem>
            <SelectItem value="career_step">career_step</SelectItem>
          </SelectContent>
        </Select>
        <Input name="tags" placeholder="tags, comma-separated" className="flex-1" />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
