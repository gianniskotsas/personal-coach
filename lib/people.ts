import { query } from "./db";

export async function personHistory(name: string, since?: string) {
  return query(
    `SELECT date::text, workstream, name, activity_type, description, impact, collaborators
     FROM activities
     WHERE EXISTS (SELECT 1 FROM unnest(collaborators) c WHERE c ILIKE '%' || $1 || '%')
       AND ($2::date IS NULL OR date >= $2)
     ORDER BY date ASC`,
    [name, since ?? null]);
}
