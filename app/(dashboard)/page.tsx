import { query } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { TimelineTabs, type DailyDoc, type WeeklyDoc, type QuarterlyDoc } from "@/components/timeline-tabs";

export const dynamic = "force-dynamic";

export default async function Timeline() {
  await requireSession();
  const [dailies, weeklies, quarterlies] = await Promise.all([
    query<DailyDoc>(
      `SELECT period_start::text, raw FROM documents WHERE doc_type='daily_entry'
       ORDER BY period_start DESC LIMIT 30`),
    query<WeeklyDoc>(
      `SELECT period_start::text, raw FROM documents WHERE doc_type='weekly_report'
       ORDER BY period_start DESC LIMIT 52`),
    query<QuarterlyDoc>(
      `SELECT period_start::text, body_md FROM documents WHERE doc_type='quarterly_brief'
       ORDER BY period_start DESC LIMIT 8`),
  ]);
  return <TimelineTabs dailies={dailies} weeklies={weeklies} quarterlies={quarterlies} />;
}
