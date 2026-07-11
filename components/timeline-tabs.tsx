"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DailyDoc = {
  period_start: string;
  raw: { headline?: string; day?: string };
};

// The real weekly JSON either nests these fields under `weekly_summary` or has
// them directly on `raw` (see lib/ingest/chunker.ts's own fallback for the same
// ambiguity). Declaring both `raw` and `raw.weekly_summary` with the identical
// field set means `w.raw.weekly_summary ?? w.raw` below infers one consistent
// type either way, instead of a union TypeScript can't narrow.
type WeeklySummaryFields = {
  headline?: string;
  key_accomplishments?: string[];
  one_next_action?: string;
  product_pct?: number;
  se_pct?: number;
};

type WeeklyDoc = {
  period_start: string;
  raw: WeeklySummaryFields & { weekly_summary?: WeeklySummaryFields };
};

type QuarterlyDoc = {
  period_start: string;
  body_md: string;
};

export type { DailyDoc, WeeklyDoc, QuarterlyDoc };

// `period_start` is a "YYYY-MM-DD" date-only string. `new Date(str)` parses that
// as UTC midnight, but `toLocaleDateString`/`getFullYear` format in the browser's
// local timezone — so anyone west of UTC sees the previous day. Parse the parts
// manually and construct a local-timezone Date instead of shifting through UTC.
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function TimelineTabs({
  dailies,
  weeklies,
  quarterlies,
}: {
  dailies: DailyDoc[];
  weeklies: WeeklyDoc[];
  quarterlies: QuarterlyDoc[];
}) {
  return (
    <Tabs defaultValue="daily" className="max-w-2xl mx-auto px-6 py-8">
      <TabsList variant="line" className="mb-6">
        <TabsTrigger value="daily" className="data-[state=active]:font-semibold">Daily</TabsTrigger>
        <TabsTrigger value="weekly" className="data-[state=active]:font-semibold">Weekly</TabsTrigger>
        <TabsTrigger value="quarterly" className="data-[state=active]:font-semibold">Quarterly</TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="space-y-0">
        {dailies.length === 0 && <p className="text-sm text-muted-foreground">No daily entries yet.</p>}
        {dailies.map((d) => (
          <article key={d.period_start} className="py-5 border-t first:border-t-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <h3 className="text-base font-semibold tracking-tight">
                {parseDateOnly(d.period_start).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {parseDateOnly(d.period_start).getFullYear()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {d.raw.headline ?? "(no headline)"}
            </p>
          </article>
        ))}
      </TabsContent>

      <TabsContent value="weekly" className="space-y-0">
        {weeklies.length === 0 && <p className="text-sm text-muted-foreground">No weekly reports yet.</p>}
        {weeklies.map((w) => {
          const summary = w.raw.weekly_summary ?? w.raw;
          const pct = summary.product_pct != null && summary.se_pct != null
            ? `product ${summary.product_pct}% · SE ${summary.se_pct}%`
            : null;
          return (
            <article key={w.period_start} className="py-5 border-t first:border-t-0">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold tracking-tight">
                  Week of{" "}
                  {parseDateOnly(w.period_start).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </h3>
                {pct && <span className="text-xs text-muted-foreground shrink-0">{pct}</span>}
              </div>
              {summary?.headline && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{summary.headline}</p>
              )}
              {summary?.key_accomplishments && summary.key_accomplishments.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                    Key accomplishments
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {summary.key_accomplishments.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary?.one_next_action && (
                <blockquote className="border-l-2 pl-3.5 text-sm italic">
                  {summary.one_next_action}
                </blockquote>
              )}
            </article>
          );
        })}
      </TabsContent>

      <TabsContent value="quarterly" className="space-y-8">
        {quarterlies.length === 0 && <p className="text-sm text-muted-foreground">No quarterly briefs yet.</p>}
        {quarterlies.map((q) => (
          <div key={q.period_start} className="typeset">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.body_md}</ReactMarkdown>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
