import { NextResponse } from "next/server";

// Optional live-AI layer. Every failure returns 200 {ok:false} — never an
// error status — so the demo console stays free of network errors; the
// client silently keeps its generated advisory.

const VALID = new Set(["ADVISORY", "WARNING", "EMERGENCY"]);

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!apiKey) return NextResponse.json({ ok: false });

  let ctx: Record<string, unknown>;
  try {
    ctx = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }

  const prompt = `You write official heat advisories for outdoor workers (street vendors, traffic police, delivery riders) on behalf of a municipal corporation in India.

Situation snapshot (JSON, from the city's heat-risk system):
${JSON.stringify(ctx)}

Write ONE advisory for this hour. Rules:
- Plain, calm, official language. No exclamation marks.
- Ground every statement ONLY in the numbers and zone names in the snapshot. Invent nothing — no places, counts, or times not given.
- Name the critical/alert zones given; direct workers to the cooling point named; always include "drink water every 20 minutes" and "call 108 for heat illness".
- advisory_hi must be a faithful Hindi rendering of advisory_en.
- urgency: "EMERGENCY" if any zone is CRITICAL, "WARNING" if any is ALERT, else "ADVISORY".

Respond with ONLY this JSON object, no markdown fences:
{"headline": "...", "advisory_en": "...", "advisory_hi": "...", "urgency": "ADVISORY|WARNING|EMERGENCY"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return NextResponse.json({ ok: false });
    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return NextResponse.json({ ok: false });
    const parsed = JSON.parse(text.replace(/^```json\s*|```\s*$/g, ""));
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.advisory_en !== "string" ||
      typeof parsed.advisory_hi !== "string" ||
      !VALID.has(parsed.urgency)
    )
      return NextResponse.json({ ok: false });
    return NextResponse.json({
      ok: true,
      headline: parsed.headline,
      advisory_en: parsed.advisory_en,
      advisory_hi: parsed.advisory_hi,
      urgency: parsed.urgency,
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
