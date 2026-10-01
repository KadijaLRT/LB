import { parseNatalLongitudes, findFavorableWindows, moonWindowsForDay } from "./_ephemeris.js";

const AREA_KEY_BODIES = {
  career: ["Sun", "Saturn", "Mars", "Mercury", "Jupiter"],
  friendships: ["Moon", "Mercury", "Uranus", "Venus"],
  love: ["Venus", "Mars", "Moon", "Sun"],
  finance: ["Jupiter", "Saturn", "Venus", "Moon"],
  content: ["Sun", "Mercury", "Venus", "Uranus", "Jupiter"],
};

// Standard, well-established meanings — not app-specific interpretation,
// just what these planets and aspect types conventionally represent in
// Western astrology. Used to build honest plain-English sentences from
// real computed aspects — entirely template-based, no AI call, so there's
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
  Pluto: "intensity and deep change",
};

const EASY_VERB = {
  trine: "is flowing easily with",
  sextile: "is opening up a real opportunity with",
  conjunction: "is fused with and amplifying",
};

const HARD_VERB = {
  square: "is creating real friction with",
  opposition: "is pulling in a different direction from",
  conjunction: "is intensifying",
};

// Never claims an outcome. "Easy" windows describe where the day supports
// smooth, low-resistance effort. "High-energy" windows describe real
// friction or intensity — not a bad day, a day where force meets
// resistance, which can still be the right time to push through something
// that needs it. Neither is a prediction of success or failure.
function describeAspect(transitBody, aspect, natalBody, mode) {
  const transitMeaning = PLANET_MEANING[transitBody] || transitBody;
  const natalMeaning = PLANET_MEANING[natalBody] || natalBody;
  const verb = mode === "easy" ? (EASY_VERB[aspect] || aspect) : (HARD_VERB[aspect] || aspect);
  return `${transitBody} (${transitMeaning}) ${verb} your natal ${natalBody} (${natalMeaning}).`;
}

function supportLine(mode, area) {
  if (mode === "easy") {
    return `Supports: ${area} efforts that want ease, flow, or things to go smoothly — a good day to act, not just plan.`;
  }
  return `Doesn't favor ease: real friction is present. This isn't a bad day, it's a day where ${area} work will meet resistance — better for pushing through something that requires force than for things you want to go smoothly.`;
}

function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

    const dayResults = windows.slice(0, 10).map((w) => {
      const dayWindows = moonWindowsForDay(natalLongitudes, keyBodies, w.date, 30);
      return {
        date: w.date.toISOString().slice(0, 10),
        mode: w.best.mode,
        orb: w.best.orb,
        transit_body: w.best.transitBody,
        aspect: w.best.aspect,
        natal_body: w.best.natalBody,
        description: describeAspect(w.best.transitBody, w.best.aspect, w.best.natalBody, w.best.mode),
        guidance: supportLine(w.best.mode, area),
        // Hour-level resolution from the Moon's real motion that day — only
        // included when the math actually found something; never padded.
        hourly: dayWindows.map((hw) => ({
          start: fmtTime(hw.start),
          end: fmtTime(hw.end),
          mode: hw.mode,
          description: describeAspect("Moon", hw.aspect, hw.natal_body, hw.mode),
        })),
      };
    });

    return res.status(200).json({ area, windows: dayResults, scanned_days: numDays });
  } catch (err) {
    console.error("favorable-windows handler error:", err);
    return res.status(500).json({ error: "Something went wrong computing favorable windows." });
  }
}
