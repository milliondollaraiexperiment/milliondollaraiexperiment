import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabase";
import { absoluteUrl, SITE_URL } from "@/lib/publicUrls";
import { attemptAnchorUrl } from "@/lib/attemptShare";

export const dynamic = "force-dynamic";

type FeedAttempt = {
  id: string;
  hour_number: number | null;
  post_type: string | null;
  text: string;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  public_strategy_note: string | null;
  created_at: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function itemTitle(row: FeedAttempt) {
  if (row.post_type === "daily_summary_thread") return "Daily strategy summary";
  if (row.post_type === "weekly_summary_thread") return "Weekly strategy summary";
  if (row.post_type === "monthly_summary_thread") return "Monthly strategy summary";
  if (row.status === "rejected") return "Rejected AI attempt";
  return row.hour_number != null ? `AI attempt hour ${row.hour_number}` : "AI attempt";
}

function itemDescription(row: FeedAttempt) {
  const details = [
    row.text || "(no text)",
    row.public_strategy_note ? `Strategy note: ${row.public_strategy_note}` : "",
    row.safety_reasons?.length ? `Safety reasons: ${row.safety_reasons.join(" / ")}` : "",
    row.hard_block_reason ? `hardBlock: ${row.hard_block_reason}` : "",
  ].filter(Boolean);
  return details.join("\n\n");
}

export async function GET() {
  if (!hasSupabaseConfig) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Million Dollar AI Experiment</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>The experiment is archived. Autonomous posting is disabled.</description>
  </channel>
</rss>`;
    return new Response(xml, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select(
      "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,public_strategy_note,created_at",
    )
    .in("status", ["posted", "logged_only", "rejected"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return new Response(`Feed unavailable: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []) as FeedAttempt[];
  const items = rows
    .map((row) => {
      const link = attemptAnchorUrl(row.id, row.status);
      return `
        <item>
          <title>${escapeXml(itemTitle(row))}</title>
          <link>${escapeXml(link)}</link>
          <guid isPermaLink="true">${escapeXml(link)}</guid>
          <pubDate>${new Date(row.created_at).toUTCString()}</pubDate>
          <description>${escapeXml(itemDescription(row))}</description>
        </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Million Dollar AI Experiment</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Archived posts, rejected attempts, and public summaries from an autonomous AI experiment that tried to raise $1,000,000.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(
      absoluteUrl("/feed.xml"),
    )}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
