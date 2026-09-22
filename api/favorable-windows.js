import { parseNatalLongitudes, findFavorableWindows } from "./_ephemeris.js";

const AREA_KEY_BODIES = {
  career: ["Sun", "Saturn", "Mars", "Mercury", "Jupiter"],
  friendships: ["Moon", "Mercury", "Uranus", "Venus"],
  love: ["Venus", "Mars", "Moon", "Sun"],
  finance: ["Jupiter", "Saturn", "Venus", "Moon"],
};

// Standard, well-established meanings — not app-specific interpretation,
// just what these planets and aspect types conventionally represent in
// Western astrology. Used to build one honest plain-English sentence per
// real computed window, entirely template-based — no AI call, so there's
// no risk of this drifting from what the real data actually says.
const PLANET_MEANING = {
  Sun: "visibility and confidence",
  Moon: "emotional timing and instinct",
  Mercury: "communication and conversations",
  Venus: "attraction, money, and things going smoothly",
  Mars: "drive and taking action",
  Jupiter: "luck, expansion, and opportunity",
  Saturn: "follow-through and things holding up long-term",
  Uranus: "sudden openings and unexpected breaks",
};

const ASPECT_MEANING = {
  trine: "is flowing easily right now with",
  sextile: "is opening up a real opportunity with",
  conjunction: "is fused with and amplifying",
};

function describeWindow(w) {
  const { transitBody, aspect, natalBody } = w.best;
  const transitMeaning = PLANET_MEANING[transitBody] || transitBody;
  const natalMeaning = PLANET_MEANING[natalBody] || natalBody;
  const verb = ASPECT_MEANING[aspect] || aspect;
  return `${transitBody} (${transitMeaning}) ${verb} your natal ${natalBody} (${natalMeaning}).`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { area, profile, days } = req.body || {};
    const validAreas = Object.keys(AREA_KEY_BODIES);
    if (!area || !validAreas.includes(area)) {
      return res.status(400).json({ error: `Missing or invalid 'area'. Must be one of: ${validAreas.join(", ")}` });
    }

    const natalLongitudes = parseNatalLongitudes(profile?.natal_chart_notes || "");
    if (Object.keys(natalLongitudes).length === 0) {
      return res.status(400).json({
        error: "Not enough chart data to compute this yet. Paste your natal chart in Settings first.",
      });
    }

    const keyBodies = AREA_KEY_BODIES[area];
    const numDays = Number.isFinite(days) && days > 0 && days <= 30 ? days : 14;
    const windows = findFavorableWindows(natalLongitudes, keyBodies, new Date(), numDays);

    const result = windows.slice(0, 6).map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      orb: w.best.orb,
      transit_body: w.best.transitBody,
      aspect: w.best.aspect,
      natal_body: w.best.natalBody,
      description: describeWindow(w),
    }));

    return res.status(200).json({ area, windows: result, scanned_days: numDays });
  } catch (err) {
    console.error("favorable-windows handler error:", err);
    return res.status(500).json({ error: "Something went wrong computing favorable windows." });
  }
}
