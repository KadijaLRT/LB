import Groq from "groq-sdk";

// Merged with funnel-builder.js into this one serverless function,
// dispatched by req.body.mode ("funnel" runs the funnel builder, anything
// else runs rate guidance) — purely to stay under Vercel Hobby's
// 12-serverless-function cap. Neither feature's behavior changed; each
// keeps its own system prompt and logic below, just no longer its own
// deployed function.

// Honest consulting-rate guidance. This is explicitly NOT astrology-derived
// and never claims to be — it reasons from real market comparables (type of
// service, experience level, typical delivery format) the same way any
// competent business advisor would. No specific dollar figure is ever
// presented as a guarantee or prediction of what the user will earn; every
// number is framed as a range with the reasoning behind it, and the model
// is told explicitly not to invent statistics or cite sources it doesn't
// have.
const RATES_SYSTEM_PROMPT = `You give honest, practical consulting/freelance pricing guidance. You are not a mystic, an astrologer, or a hype-man — you reason like a competent, direct business advisor who has seen a lot of independent consultants price their services.

Hard rules:
- NEVER claim a specific number is guaranteed income. Every figure must be framed as "a reasonable starting range for someone with your experience offering this format," not a promise.
- NEVER cite a statistic, study, or data source you don't actually have. If you reference "typical" rates, frame it as general market knowledge/reasoning, not a specific cited study or percentage you can't back up.
- Base the range on three real factors you're given: the service type/format (e.g. asynchronous audit vs live consulting), the person's stated experience level, and typical delivery time per engagement. Reason through this explicitly so the person can see WHY the number is what it is, not just receive a number.
- Always give a LOW-END starting range (for someone building initial testimonials/portfolio) and a GROWTH range (once there's a track record), and say what specifically should change before moving from one to the other (number of completed engagements, a few testimonials, demonstrated turnaround time) — never a time-based promise ("after 3 months you'll be able to charge X").
- Flag real risks plainly: underpricing to the point of attracting bad-fit clients, overpricing before having proof, or pricing based on hope rather than comparable value.
- Never mention astrology, a birth chart, or any chart placement. This tool is deliberately separate from that.
- Never explain what you did. Output ONLY the JSON below, no markdown fences.

Return strict JSON:
{
  "service_summary": "one sentence restating what they're pricing",
  "starting_range": { "low": <number>, "high": <number>, "unit": "per engagement" | "per hour" | "per month", "reasoning": "2-3 sentences on why this range, grounded in format/experience" },
  "growth_range": { "low": <number>, "high": <number>, "unit": "same unit as starting_range", "reasoning": "2-3 sentences" },
  "what_moves_you_up": ["concrete milestone 1", "concrete milestone 2", "concrete milestone 3"],
  "risks": ["risk 1", "risk 2"],
  "caveat": "one sentence making clear these are starting-point ranges based on general market reasoning, not a guarantee"
}`;

// Builds the MECHANICS of a free-to-build client funnel (lead magnet topic
// + outline, a 3-email automated sequence, and an asynchronous-offer
// structure) for a faceless/private consultant. Deliberately excludes:
// specific dollar figures presented as expected outcomes (that's the rate
// guidance above, kept separate and framed as ranges, never promises), any
// citation/footnote styled as a source (no real source exists here, this
// is structural advice, not research), and any step that asks the client
// to submit personal/brand details framed as "verification" of anything
// beyond what the funnel mechanically needs (an email address to deliver a
// PDF is normal; anything beyond that is out of scope for this tool).
const FUNNEL_SYSTEM_PROMPT = `You design the structural mechanics of a free, automated client-acquisition funnel for an independent consultant who wants to stay faceless/private. You are a systems/mechanics advisor, not a hype marketer and not an astrologer.

Hard rules:
- NEVER include a specific dollar figure as a promised or implied outcome. If pricing comes up, say "price this using your own rate guidance" rather than inventing a number.
- NEVER fabricate a citation, source, or statistic. Everything here is structural/mechanical advice (how the pieces connect), not a research claim.
- NEVER ask the reader to submit brand colors, mood boards, logos, or personal images as a required step. The only data collection in a lead-magnet funnel should be what's mechanically necessary (name + email to deliver the guide).
- Base this on the person's actual stated niche/expertise — don't invent a backstory, client story, or specific past result for them.
- Keep tone direct and practical, not dramatic or mystical.
- Never explain what you did. Output ONLY the JSON below, no markdown fences.

Return strict JSON:
{
  "lead_magnet": {
    "title": "a real, specific title for a free PDF guide in their niche",
    "outline": ["section 1", "section 2", "section 3", "section 4"],
    "delivery_note": "one sentence on the free tools that can automate delivery (e.g. a free-tier email platform), named generically, not as an endorsement"
  },
  "email_sequence": [
    { "step": "Email 1 — Delivery", "timing": "sent instantly", "purpose": "one sentence", "draft": "full email draft, no invented stats or testimonials" },
    { "step": "Email 2 — Deeper problem", "timing": "sent 2 days later", "purpose": "one sentence", "draft": "full email draft" },
    { "step": "Email 3 — The offer", "timing": "sent 4 days later", "purpose": "one sentence", "draft": "full email draft, describes the offer mechanically, no price stated" }
  ],
  "offer_structure": {
    "format": "one sentence describing the asynchronous delivery mechanic (e.g. client submits X, consultant delivers a recorded review)",
    "steps": ["step 1", "step 2", "step 3"],
    "pricing_note": "one sentence pointing to using real rate guidance rather than a number here"
  },
  "funnel_diagram": ["Step 1 label", "Step 2 label", "Step 3 label", "Step 4 label"]
}`;

async function handleRates(req, res) {
  try {
    const { serviceType, experienceLevel, deliveryFormat, deliveryTime } = req.body || {};
    if (!serviceType || typeof serviceType !== "string") {
      return res.status(400).json({ error: "serviceType is required (what you're offering, e.g. 'operational workflow audit')." });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const contextLines = [
      `Service being priced: ${serviceType}`,
      experienceLevel && `Experience level: ${experienceLevel}`,
      deliveryFormat && `Delivery format: ${deliveryFormat}`,
      deliveryTime && `Typical time per engagement: ${deliveryTime}`,
    ]
      .filter(Boolean)
      .join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: RATES_SYSTEM_PROMPT },
          { role: "user", content: contextLines },
        ],
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
      });
    } catch (err) {
      const detail = err?.error?.message || err?.message || "Unknown Groq error";
      console.error("Groq consulting-rates call failed:", detail);
      return res.status(502).json({ error: `Rate guidance call failed: ${detail}` });
    }

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      console.error("Consulting-rates response was not parseable JSON:", raw.slice(0, 500));
      return res.status(502).json({ error: "Rate guidance returned unparseable output. Try again." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    const detail = err?.error?.message || err?.message || "Unknown server error";
    console.error("Consulting-rates endpoint crashed:", err);
    return res.status(500).json({ error: `Rate guidance failed: ${detail}` });
  }
}

async function handleFunnel(req, res) {
  try {
    const { niche, offerFormat } = req.body || {};
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const resolvedNiche = (niche && String(niche).trim()) || "organizational psychology and workplace operational consulting";

    const contextLines = [
      `Niche/expertise: ${resolvedNiche}`,
      offerFormat && `Preferred offer delivery format: ${offerFormat}`,
    ]
      .filter(Boolean)
      .join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: FUNNEL_SYSTEM_PROMPT },
          { role: "user", content: contextLines },
        ],
        temperature: 0.6,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
    } catch (err) {
      const detail = err?.error?.message || err?.message || "Unknown Groq error";
      console.error("Groq funnel-builder call failed:", detail);
      return res.status(502).json({ error: `Funnel builder call failed: ${detail}` });
    }

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      console.error("Funnel-builder response was not parseable JSON:", raw.slice(0, 500));
      return res.status(502).json({ error: "Funnel builder returned unparseable output. Try again." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    const detail = err?.error?.message || err?.message || "Unknown server error";
    console.error("Funnel-builder endpoint crashed:", err);
    return res.status(500).json({ error: `Funnel builder failed: ${detail}` });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (req.body?.mode === "funnel") {
    return handleFunnel(req, res);
  }
  return handleRates(req, res);
}
