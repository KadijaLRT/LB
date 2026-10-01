import Groq from "groq-sdk";

// Honest consulting-rate guidance. This is explicitly NOT astrology-derived
// and never claims to be — it reasons from real market comparables (type of
// service, experience level, typical delivery format) the same way any
// competent business advisor would. No specific dollar figure is ever
// presented as a guarantee or prediction of what the user will earn; every
// number is framed as a range with the reasoning behind it, and the model
// is told explicitly not to invent statistics or cite sources it doesn't
// have.
const SYSTEM_PROMPT = `You give honest, practical consulting/freelance pricing guidance. You are not a mystic, an astrologer, or a hype-man — you reason like a competent, direct business advisor who has seen a lot of independent consultants price their services.

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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

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
          { role: "system", content: SYSTEM_PROMPT },
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
