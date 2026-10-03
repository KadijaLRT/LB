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

// Concrete, real-world action examples per area — what an "easy" day
// actually looks like to DO something about, not just a mood description.
// Picked to be ordinary, low-stakes, recognizable actions (send the email,
// post the video, have the conversation) rather than vague astrology
// language, so the guidance reads like advice from a person, not a
// horoscope. One example per mode per area, kept short and literal.
const REAL_WORLD_EXAMPLES = {
  career: {
    easy: "like sending that pitch, asking for the raise, or submitting the application you've been sitting on",
    "high-energy": "like pushing through a hard conversation with a boss or client, or grinding through a deadline — doable, just not effortless",
  },
  content: {
    easy: "like filming or posting the video you've been putting off, or sending that first cold outreach message",
    "high-energy": "like publishing something opinionated or a hot take — it'll land, but expect more pushback or debate than usual",
  },
  friendships: {
    easy: "like reaching out to reconnect, making plans, or having an easy, warm conversation",
    "high-energy": "like addressing tension with a friend directly — the conversation will be real, not smooth",
  },
  love: {
    easy: "like having an open conversation, planning a date, or being vulnerable with a partner",
    "high-energy": "like bringing up something you've been avoiding — it'll clear the air, but expect some friction first",
  },
  finance: {
    easy: "like negotiating a bill, asking for a better rate, or making a planned purchase",
    "high-energy": "like having a hard budget conversation or pushing through a financial decision you've been putting off",
  },
};

function realWorldExample(mode, area) {
  return REAL_WORLD_EXAMPLES[area]?.[mode] || (mode === "easy" ? "like taking action on something that's been easy to put off" : "like pushing through something that needs real effort today");
}

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

// Plain-language summary leads with what the day actually feels like to
// act on, using a concrete real-world example first, with the astrology
// explanation folded in afterward as the "why" rather than the headline.
function supportLine(mode, area) {
  const example = realWorldExample(mode, area);
  if (mode === "easy") {
    return `In plain terms: today's a good day to act, not just plan — ${example}. Things should go more smoothly than usual.`;
  }
  return `In plain terms: today's got real friction in it — ${example}. It's not a bad day, just one where things take more push than usual.`;
}

function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Local-date formatting (YYYY-MM-DD), deliberately NOT toISOString().slice(0,10)
// — toISOString() converts to UTC first, which can shift the displayed date
// by a day depending on the server's timezone and what time of day the
// request runs. w.date from findFavorableWindows is already anchored to
// local midnight, so reading its local y/m/d parts directly keeps the date
// the scan actually means, not a UTC-shifted neighbor of it.
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
        date: fmtDate(w.date),
        mode: w.best.mode,
        orb: w.best.orb,
        transit_body: w.best.transitBody,
        aspect: w.best.aspect,
        natal_body: w.best.natalBody,
        // guidance is the plain-language, real-world-example line — shown
        // first/by default. description is the underlying astrology
        // detail — shown only if the person taps to see "why."
        guidance: supportLine(w.best.mode, area),
        description: describeAspect(w.best.transitBody, w.best.aspect, w.best.natalBody, w.best.mode),
        // Hour-level resolution from the Moon's real motion that day — only
        // included when the math actually found something; never padded.
        hourly: dayWindows.map((hw) => ({
          start: fmtTime(hw.start),
          end: fmtTime(hw.end),
          mode: hw.mode,
          guidance: realWorldExample(hw.mode, area),
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
