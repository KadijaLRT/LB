// Today's real transiting placements via astronomy-engine — no external API
// or key needed.
//
// Full rebuild: the personalized vibe used to be built by string-templating
// planet names into fixed sentence shapes ("X is doing Y with your Z").
// That's why it kept feeling mechanical and repetitive no matter how many
// times the templates were patched — concatenated strings can't vary tone
// or avoid sounding like a mad-lib. Now it's written by the same
// natural-language generation the rest of the app already uses (Go Deeper,
// the coach), grounded in ONE real computed fact (the single tightest
// transit-to-natal aspect) instead of stacking multiple planet mentions
// into one sentence.

import Groq from "groq-sdk";
import { ADHD_BRIEF } from "./_adhd.js";
import { withVoice } from "./_voice.js";
import { degreeNote } from "./_degrees.js";
import { signForLongitude, currentPlacements, ELEMENT_BY_SIGN, parseNatalLongitudes, currentTransitAspects } from "./_ephemeris.js";

const MOOD_BY_ELEMENT = {
  fire: [
    "energy runs hot today — a good day to send that pitch or make the call you've been putting off. Watch impulse purchases.",
    "restless, quick-to-act energy. Good day to kick something off; a bad day to start anything that needs patience, like a long form or application.",
    "good momentum for a bold move, like posting something you've been sitting on. Easy to overcommit if you're not careful, so don't say yes to everything today.",
  ],
  earth: [
    "grounded, practical mood — a good day to finally pay that bill, do the admin task you've been avoiding, or finish something half-done.",
    "steady, low-drama energy. Good for routine tasks and follow-through — not the day to launch something brand new, more a day to maintain what's already moving.",
    "a build-something-real day — good for a money conversation or anything that needs consistency over a spark of inspiration.",
  ],
  air: [
    "heady, talkative energy — good day to write that script, send that message, or have the conversation you've been rehearsing in your head. Write ideas down, they'll move faster than you can act on them.",
    "a lot of mental motion today. Good for brainstorming or reaching out to someone, harder to sit still and actually finish a task.",
    "quick-thinking, social mood — good day for a conversation that matters. Watch for getting scattered across too many tabs at once.",
  ],
  water: [
    "feelings run close to the surface — good day for rest or checking in with someone you care about. Push a big decision to tomorrow if you can.",
    "an intuitive, sensitive mood. Good for reaching out to someone you've been thinking about, not a great day to force a logical decision under pressure.",
    "a slower, feeling-forward day — good for rest and being honest with yourself, less good for a high-pressure call or negotiation.",
  ],
};

function pickVariant(list, date) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return list[dayIndex % list.length];
}

// No-chart-data fallback stays deterministic JS — there's no real
// personalization happening in this path anyway, so an LLM call would just
// add latency/cost for no benefit. The complaint was about the templated
// PERSONALIZED text; this generic path was never the issue.
function genericVibeFallback(placements, natal, date, reason) {
  const sunSign = placements.Sun.sign;
  const moonSign = placements.Moon.sign;
  const moonElement = ELEMENT_BY_SIGN[moonSign];

  if (natal.sun && natal.sun === sunSign) {
    return `Sun in ${sunSign} — your solar return window. Good day to start something with your name on it.`;
  }
  if (natal.moon && natal.moon === moonSign) {
    return `Moon in ${moonSign} today — same as your natal Moon, feelings run close to the surface, more you than usual.`;
  }

  const moods = MOOD_BY_ELEMENT[moonElement] || [];
  const mood = pickVariant(moods, date) || "";
  // Three genuinely different situations that were previously conflated
  // into one message — a Groq outage was being misreported as a chart
  // formatting problem, which sends you chasing the wrong fix.
  const reasonText = {
    no_notes: "Add your full natal chart in Settings for a reading built from your actual placements instead of this general one.",
    unparseable: "Your chart notes are saved but couldn't be read — check the format in Settings (the live preview there shows exactly what's detected).",
    generation_failed: "Your chart read fine, but the personalized reading couldn't be generated right now — try again shortly.",
  }[reason];
  return `Moon in ${moonSign}: ${mood} (Sun's in ${sunSign} for the season. ${reasonText})`;
}

const VIBE_SYSTEM_PROMPT = `You write a single short "today's astrological vibe" line for someone, grounded in ONE real computed fact about their chart. Not a full reading — a quick, warm, natural-sounding line, like a friend texting "hey, heads up" energy.

Hard rules:
- ONE to two short sentences MAX. Under 35 words total.
- Ground it in the ONE real fact given (a degree theory note attached to it is part of that fact) — don't invent anything, don't add other planets or aspects not mentioned.
- Do NOT mechanically state raw positions as a checklist ("Sun is in X, Moon is in Y") — that's exactly the repetitive, mad-lib-sounding pattern to avoid. Weave the real fact into one natural, flowing thought instead.
- Plain everyday language, no astrology jargon left unexplained — no bare "orb," "transiting," "natal," "applying," "separating."
- Vary your sentence structure and word choice naturally — don't default to the same "X is [verb]-ing your Y" shape every time, write it the way a person actually would.
- Warm, direct, a little personality — not clinical, not fortune-teller vague.
- Lead with or include a concrete, ordinary real-world example of what this is good or bad for today — a specific recognizable action (send that email, have the hard conversation, don't start the big project today), not an abstract mood word. "Good for admin" is weaker than "good day to finally deal with that overdue bill." Someone should be able to read the line and know exactly one thing they could go do, not just how the day feels.

Output ONLY the line itself. No quotes, no preamble, no explanation.`;

// Why the vibe said the same thing for a week: it grounded the line in the
// single tightest aspect across ALL ten bodies. Slow planets (Jupiter through
// Pluto) hold the same aspect to a natal point for weeks, so they won the
// "tightest" slot every day and the input fact never changed. A DAILY vibe
// must be grounded in fast movers only (Moon changes aspect every few hours,
// Sun/Mercury/Venus/Mars every few days), plus the Moon's current sign.
const FAST_BODIES = ["Moon", "Sun", "Mercury", "Venus", "Mars"];

// Degree theory note for the natal planet being touched, so the daily line
// is shaped by her actual degrees too (floor of the real degree).
function degreeSentence(natalLongitudes, body) {
  if (natalLongitudes[body] == null) return "";
  const w = signForLongitude(natalLongitudes[body]);
  const note = degreeNote(Math.floor(w.degreeInSign));
  return note ? ` Degree theory on that natal ${body} (${w.degreeInSign.toFixed(1)}° ${w.sign}): ${note}. Fold it in only if it fits naturally, as a tendency.` : "";
}

function personalitySentence(personality) {
  const t = typeof personality === "string" ? personality.trim().slice(0, 300) : "";
  return t ? ` Their self-reported personality profile: ${t}. Fold it into the same thought only if it genuinely lines up with the fact above.` : "";
}

async function generatePersonalVibe(natalLongitudes, placements, now, voiceSample, personality) {
  // Short lookahead (6h): the 3-day lookahead made the Moon's applying or
  // separating trend meaningless, since it travels ~39 degrees in 3 days.
  const aspects = currentTransitAspects(natalLongitudes, now, 0.25).filter((a) => FAST_BODIES.includes(a.transitBody));

  // Prefer a close Moon aspect (the most day-specific signal), otherwise the
  // tightest fast-body aspect.
  const moonAspect = aspects.find((a) => a.transitBody === "Moon" && a.orb <= 3);
  const chosen = moonAspect || aspects[0] || null;

  const moonSign = placements.Moon.sign;
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  let factLine;
  if (chosen) {
    const isBuilding = chosen.trend.startsWith("applying");
    factLine = `Date: ${dateLabel}. Transiting ${chosen.transitBody} is making a real ${chosen.aspect} to this person's natal ${chosen.natalBody} (${
      isBuilding ? "building toward exact" : "already past its peak, easing off"
    }). The Moon is currently in ${moonSign}.${degreeSentence(natalLongitudes, chosen.natalBody)}${personalitySentence(personality)}`;
  } else {
    // No close fast-body aspect: still ground it in something that changes,
    // the Moon's sign, rather than returning one fixed sentence every day.
    factLine = `Date: ${dateLabel}. Nothing is tightly aligned with this person's chart right now. The Moon is currently in ${moonSign} (${ELEMENT_BY_SIGN[moonSign]} element), so the day's mood comes from that.${personalitySentence(personality)}`;
  }

  if (!process.env.GROQ_API_KEY) {
    // No key configured — fail up to the caller's generic fallback rather
    // than crash; this keeps the endpoint usable even mid-setup.
    return null;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // The model spends part of max_tokens on hidden reasoning, and the longer
  // fact line (degree theory + personality) made it use more, so a 150 cap
  // could leave the visible line empty. Generous cap, plus one retry on the
  // plain fact line if the first attempt comes back empty.
  async function attempt(fact) {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "low",
      messages: [
        { role: "system", content: `${VIBE_SYSTEM_PROMPT}\n\n${ADHD_BRIEF}` },
        { role: "user", content: withVoice(fact, voiceSample) },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });
    let text = completion.choices?.[0]?.message?.content?.trim() || "";
    if (text && completion.choices?.[0]?.finish_reason === "length") {
      const end = Math.max(text.lastIndexOf("."), text.lastIndexOf("!"), text.lastIndexOf("?"));
      if (end > -1) text = text.slice(0, end + 1);
    }
    return text;
  }

  let line = "";
  try {
    line = await attempt(factLine);
  } catch (err) {
    console.error("Vibe attempt 1 failed:", err?.message || err);
  }
  if (!line) {
    const plain = factLine.split(" Degree theory on")[0].split(" Their self-reported")[0];
    line = await attempt(plain);
  }
  if (!line) return null;
  return line;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Never let a CDN or browser reuse yesterday's line.
    res.setHeader("Cache-Control", "no-store, max-age=0");

    const { sun, moon, rising, natal_chart_notes, for_date, voice_sample, personality_profile } = req.body || {};
    const natal = { sun: sun || undefined, moon: moon || undefined, rising: rising || undefined };

    // Pinned to noon UTC of the given date when for_date is sent (stable
    // daily snapshot — used by Blueprint's AstroSnapshot); falls through to
    // the live moment when omitted (used by Action Center's live banner).
    const now = for_date ? new Date(`${for_date}T12:00:00Z`) : new Date();
    const placements = currentPlacements(now);
    const element = ELEMENT_BY_SIGN[placements.Sun.sign];

    let vibe = null;
    let personalized = false;
    let failureReason = "no_notes";
    const natalLongitudes = parseNatalLongitudes(natal_chart_notes || "");
    const hasNotes = !!(natal_chart_notes && natal_chart_notes.trim());

    if (Object.keys(natalLongitudes).length > 0) {
      try {
        vibe = await generatePersonalVibe(natalLongitudes, placements, now, voice_sample, personality_profile);
        if (vibe) personalized = true;
        else failureReason = "generation_failed";
      } catch (err) {
        console.error("Vibe generation failed, falling back:", err?.message || err);
        vibe = null;
        failureReason = "generation_failed";
      }
    } else if (hasNotes) {
      failureReason = "unparseable";
    }

    if (!vibe) {
      vibe = genericVibeFallback(placements, natal, now, failureReason);
    }

    return res.status(200).json({
      sun: placements.Sun.sign,
      moon: placements.Moon.sign,
      element,
      vibe,
      personalized,
      placements,
      source: "ephemeris",
    });
  } catch (err) {
    console.error("Transits endpoint crashed:", err);
    return res.status(500).json({ error: `Couldn't compute today's transits: ${err.message || "unknown error"}` });
  }
}
