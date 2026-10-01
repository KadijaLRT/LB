import Groq from "groq-sdk";

// Real, concrete faceless video concepts for a specific niche — no camera,
// no identity reveal required. This is a format/mechanics generator, not a
// chart reading: nothing here claims astrological grounding. Niche defaults
// to organizational psychology / workplace structure / burnout, since
// that's this user's stated field, but accepts any niche string so it's
// reusable if that ever changes.
const SYSTEM_PROMPT = `You generate faceless short-form video concepts for someone who wants to build an audience and authority in a specific professional niche WITHOUT showing their face or revealing personal identifying details.

Voice: direct, confident, no hype, no manufactured urgency. Write the way a real person in this field would actually talk, not generic "content creator" copy. No "Let's dive in," no stacked exclamation points, no "You won't believe."

Hard rules:
- Every concept must be genuinely executable with zero camera time: text-on-screen over B-roll, a green-screen slide/document breakdown, or a voiceover over static/stock visuals. Each concept must specify which of these three visual approaches it uses.
- The hook must be a real, specific line — not a description of a hook ("a hook about burnout") but the literal words that would appear on screen or be spoken first.
- Ground every concept in the stated niche/expertise. Do not invent specific statistics, studies, or client stories — if a claim needs a number or a named study, phrase it as a general, defensible professional observation instead ("teams under chronic overload see slower execution," not "40% of teams fail").
- Do not invent personal anecdotes, incidents, or client details that weren't provided. If the person's own background/experience notes are given, you may draw on those; otherwise keep it general and professional, not a fake story.
- Never claim or imply a specific growth outcome, follower count, or income result from following this format.
- Generate exactly 4 concepts, each using a different one of these visual approaches where possible: (1) B-roll + text overlay, (2) green-screen slide/document breakdown, (3) voiceover over static or screen-recording, (4) your choice of the strongest remaining approach for this niche.
- Never explain what you did. Output ONLY the JSON below, no markdown fences.

Return strict JSON:
{
  "concepts": [
    {
      "title": "short name for the concept",
      "visual_approach": "one of: b-roll-text-overlay | green-screen-breakdown | voiceover-static | screen-recording",
      "visual_direction": "one concrete sentence on what's actually on screen",
      "hook": "the literal first line, spoken or on-screen",
      "script_or_overlay": "the rest of the content, 60-130 words, in the person's field, no invented stats/anecdotes",
      "why_it_fits": "one sentence on why this format suits a faceless/private creator"
    }
  ]
}`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { profile, niche, focusTopic } = req.body || {};
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const resolvedNiche = (niche && String(niche).trim()) || "organizational psychology, workplace structure, and burnout recovery";

    const contextLines = [
      `Niche/field: ${resolvedNiche}`,
      focusTopic && `Specific focus for this batch: ${focusTopic}`,
      profile?.content_voice_sample && `Their own actual past posts (match this rhythm/voice closely):\n${profile.content_voice_sample}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextLines },
        ],
        temperature: 0.8,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      });
    } catch (err) {
      const detail = err?.error?.message || err?.message || "Unknown Groq error";
      console.error("Groq niche-hooks call failed:", detail);
      return res.status(502).json({ error: `Hook generator call failed: ${detail}` });
    }

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      console.error("Niche-hooks response was not parseable JSON:", raw.slice(0, 500));
      return res.status(502).json({ error: "Hook generator returned unparseable output. Try again." });
    }

    if (!Array.isArray(parsed.concepts)) {
      return res.status(502).json({ error: "Hook generator returned an unexpected shape. Try again." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    const detail = err?.error?.message || err?.message || "Unknown server error";
    console.error("Niche-hooks endpoint crashed:", err);
    return res.status(500).json({ error: `Hook generator failed: ${detail}` });
  }
}
