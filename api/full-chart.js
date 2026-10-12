import Groq from "groq-sdk";
import { withVoice } from "./_voice.js";
import { degreeNote } from "./_degrees.js";
import {
  NATAL_POINTS,
  parseNatalLongitudes,
  parseHousePlacements,
  parseNatalAspects,
  signForLongitude,
  toSidereal,
  siderealSignForLongitude,
  getNakshatra,
  wholeSignHouse,
} from "./_ephemeris.js";

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const MODALITY = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};
const SIGN_ELEMENT = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

// Real, computed chart architecture: stelliums, element/modality balance,
// hemisphere weight, and bodies sitting on the angles. Pure counting from the
// actual placements; nothing here is interpretation.
function chartArchitecture(natalLongitudes, housePlacements) {
  const bodies = PLANETS.filter((b) => natalLongitudes[b] != null);
  if (bodies.length < 3) return "";
  const signOf = {};
  bodies.forEach((b) => (signOf[b] = signForLongitude(natalLongitudes[b]).sign));

  const tally = (keyFn) => {
    const m = {};
    bodies.forEach((b) => {
      const k = keyFn(b);
      if (k) (m[k] = m[k] || []).push(b);
    });
    return m;
  };
  const lines = [];

  const bySign = tally((b) => signOf[b]);
  const byHouse = tally((b) => housePlacements[b]);
  Object.entries(bySign).forEach(([sign, list]) => {
    if (list.length >= 3) lines.push(`Stellium by sign: ${list.join(", ")} all in ${sign}`);
  });
  Object.entries(byHouse).forEach(([house, list]) => {
    if (list.length >= 3) lines.push(`Stellium by house: ${list.join(", ")} all in house ${house}`);
  });

  const count = (map) => Object.entries(map).map(([k, v]) => `${k} ${v.length}`).join(", ");
  lines.push(`Elements (of ${bodies.length} planets): ${count(tally((b) => SIGN_ELEMENT[signOf[b]]))}`);
  lines.push(`Modalities: ${count(tally((b) => MODALITY[signOf[b]]))}`);

  const withHouse = bodies.filter((b) => housePlacements[b]);
  if (withHouse.length >= 5) {
    const above = withHouse.filter((b) => housePlacements[b] >= 7).length;
    const east = withHouse.filter((b) => housePlacements[b] >= 10 || housePlacements[b] <= 3).length;
    lines.push(`Hemisphere: ${above} of ${withHouse.length} planets above the horizon (houses 7-12, public/outer focus), ${withHouse.length - above} below (private/inner)`);
    lines.push(`Left/right: ${east} in the self-driven eastern half (houses 10-3), ${withHouse.length - east} in the other-focused western half (houses 4-9)`);
  }

  const angle = (name, lon) => {
    const near = bodies.filter((b) => {
      const d = Math.abs(((natalLongitudes[b] - lon + 540) % 360) - 180);
      return d <= 8;
    });
    if (near.length) lines.push(`Within 8 degrees of the ${name}: ${near.join(", ")}`);
  };
  if (natalLongitudes["Ascendant"] != null) angle("Ascendant", natalLongitudes["Ascendant"]);
  if (natalLongitudes["MC"] != null) angle("Midheaven", natalLongitudes["MC"]);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Write like a real astrologer giving someone their full natal chart reading — confident, direct, a little dramatic where it's earned. Not a therapist, not a generic horoscope. Real astrologers say "your Saturn in the 6th" and "Moon square Venus" right out loud, with total confidence — they don't tiptoe around the terms.

You'll get the person's ENTIRE real chart below: every planet's Western tropical sign, Vedic sidereal sign, nakshatra, and house (Western house if available, Vedic whole-sign if the Ascendant is known), plus every real natal aspect between their planets. This is comprehensive, not one quick observation — write an actual full reading.

How to read it, like a real person telling a human story, not a dictionary printout:
- Every placement is Planet (the actor, what) + Sign (the style, how) + House (the stage, where). Always combine all three in one sentence, with the degree theory and Vedic details folded in where they add something.
- Start from the Primal Triad (Sun = identity, Moon = inner emotional world and what feels safe, Rising = social shell and first impression), then look at the chart's architecture given below (stelliums, element and modality balance, hemisphere weight, the angles), then the major aspects, then synthesize.
- Weave contradictions together instead of listing them: show how the outer mask differs from the private self, or how two big placements pull against each other, and what that looks like in daily life. Trines and sextiles are flow and talent; squares and oppositions are friction that builds something.
- Lead with the loudest thing in the chart (a stellium, a very tight aspect, a planet on an angle, a North Node story) rather than working through everything evenly.
- Conversational and vivid ("you think in color, you feel loudly"), concrete, with real-life examples.

Output fields:
1. "overview": 4-6 sentences. The synthesis: the Big 3 plus the biggest architectural feature (stellium, dominant element, angle) as one living story of who this chart says this person is, including the mask versus the private self.
2. "strengths": 3-4 items, each 2-3 sentences, each tied to a SPECIFIC placement (planet + sign + house, with degree theory/Vedic where useful) or harmonious aspect, saying how it shows up in real life.
3. "growth_edges": 3-4 items, each 2-3 sentences, each tied to a SPECIFIC placement or challenging aspect (square, opposition, a tight conjunction with friction), framed as a tug-of-war to work with and the direction growth points, never a flaw or verdict. Include the North Node direction if it is given.

Guardrails:
- Every single claim has to trace back to a real placement, sign, house, or aspect given in the data below — or the real personality data given. Never invent one. Confidence in delivery doesn't mean license to make things up.
- NEVER use a placement or aspect to declare this person — or anyone else — abusive, violent, dangerous, "toxic," or diagnose any other harmful character trait. Talk about energy, patterns, and tendencies, never a verdict on someone's character.
- Degree theory notes: each placement carries a bracketed note from degree theory (a modern tradition by Nikola Stojanovic, not classical astrology): its sign-style degree with themes, plus special meanings for degrees 0, 2, 5, 8, 11, 15, 17, 18, 20, 22 and 29. Do NOT write a separate degree section, Vedic section or personality section. If a personality profile (MBTI, Enneagram, Human Design, etc.) is given, weave it into the same sentence as the placement it lines up with or contrasts with (for example "Mars in Aries in the 3rd, which fits an Enneagram 8 who says it straight") in the overview, strengths and growth_edges, only where the link is real; never guess a type if none is given. The Vedic layer (sidereal sign, nakshatra, whole-sign house) is woven into the same sentences too: when a placement lands in a different sign in the Vedic system, or a nakshatra adds real texture, say it right alongside the Western placement and degree ("Moon at 14 Cancer, a Taurus-style degree, which is Rohini nakshatra in Vedic, so..."). If the two systems simply agree, do not mention Vedic at all. Weave degree theory directly into the overview, strengths and growth_edges, as part of the same sentence as the sign, house and aspect it modifies ("Venus at 22 Capricorn in the 7th, a Capricorn-style degree, so love comes with delay and endurance"). Use it wherever it sharpens a point, which should be often, and say "degree theory" when you rely on it. A tight aspect (2 degrees or less) is strong; say so when it matters. State heavy degrees (11, 15, 18, 22) plainly with attribution ("in degree theory, 11 is the suicide degree"), framed as a tendency and a place of pressure or hard decisions, never a prediction or a verdict on anyone. Never claim a degree that is not marked in the data.
- Say real astrology terms directly and confidently (planet names, signs, houses, aspect names, nakshatras) — don't water them down into vague paraphrase.
- Never a repeated flowery metaphor ("gentle hand," "soft kiss," "bright boost").
- Not every placement needs to be mentioned — a full reading with 10 planets and dozens of aspects would be unreadable if it tried to cover everything with equal weight. Pick the most genuinely significant placements and aspects for each section rather than working through the whole list.

Output ONLY this JSON shape, no markdown fences, no extra text.:
{
  "overview": "...",
  "strengths": ["...", "..."],
  "growth_edges": ["...", "..."]
}`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { profile } = req.body || {};
    const notes = profile?.natal_chart_notes || "";
    const natalLongitudes = parseNatalLongitudes(notes);
    const foundPoints = NATAL_POINTS.filter((p) => natalLongitudes[p] != null);

    if (foundPoints.length < 3) {
      return res.status(400).json({
        error: "Not enough chart data to generate a full reading yet. Paste your complete natal chart in Settings first.",
      });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const housePlacements = parseHousePlacements(notes);
    const natalAspects = parseNatalAspects(notes);
    const now = new Date();
    const ascendantTropicalLon = natalLongitudes["Ascendant"];
    const ascendantSiderealLon = ascendantTropicalLon != null ? toSidereal(ascendantTropicalLon, now) : null;

    const placementLines = foundPoints
      .map((point) => {
        const tropicalLon = natalLongitudes[point];
        const western = signForLongitude(tropicalLon);
        const siderealLon = toSidereal(tropicalLon, now);
        const { sign: siderealSign, degreeInSign: siderealDegree } = siderealSignForLongitude(tropicalLon, now);
        const { name: nakshatra, pada } = getNakshatra(siderealLon);
        const westernHouse = housePlacements[point];
        const vedicHouse = ascendantSiderealLon != null ? wholeSignHouse(siderealLon, ascendantSiderealLon) : null;
        const houseText = westernHouse
          ? `Western house ${westernHouse}`
          : vedicHouse
            ? `Vedic house ${vedicHouse}`
            : "house unknown";
        const changed = western.sign !== siderealSign;
        // Degree theory note, computed from the real position (floor, not the
        // rounded display value, so 28.97 is NOT mislabeled as 29).
        const note = degreeNote(Math.floor(western.degreeInSign));
        const degreeFlag = note ? `  [${note}]` : "";
        return `${point}: Western ${western.degreeInSign.toFixed(1)}° ${western.sign}${degreeFlag} / Vedic ${siderealDegree.toFixed(1)}° ${siderealSign} (${nakshatra} nakshatra, pada ${pada}) — ${houseText}${changed ? "  [different sign in each system]" : ""}`;
      })
      .join("\n");

    const aspectLines = natalAspects.length
      ? natalAspects
          .map((a) => {
            const detail = a.orb != null ? `orb ${a.orb.toFixed(1)}°` : a.value != null ? `score ${a.value}` : null;
            return `${a.bodyA} ${a.aspect} ${a.bodyB}${detail ? ` (${detail})` : ""}`;
          })
          .join("\n")
      : "No aspects with exact orbs found in the chart notes — work from placements and houses only.";

    const architecture = chartArchitecture(natalLongitudes, housePlacements);
    const dataBlock = `All real placements in this chart (Western tropical + Vedic sidereal, with houses):\n${placementLines}\n\nAll real natal aspects in this chart:\n${aspectLines}${architecture ? `\n\nChart architecture (computed counts, use the loudest features):\n${architecture}` : ""}${ascendantSiderealLon == null ? "\n\n(No Ascendant found, so Vedic whole-sign houses could not be computed for placements without an explicit Western house given.)" : ""}${profile?.personality_profile ? `\n\nTheir real, self-reported personality profile (MBTI, Enneagram, Human Design, etc.; not computed, taken directly from what they entered; weave it into the reading):\n${profile.personality_profile}` : ""}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: withVoice(dataBlock, profile?.content_voice_sample) },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
    } catch (err) {
      console.error("Groq full-chart error:", err);
      return res.status(502).json({ error: "Couldn't generate the reading right now. Try again in a moment." });
    }

    const raw = completion.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fall through, parsed stays undefined
    }

    if (!parsed || typeof parsed.overview !== "string") {
      const finishReason = completion.choices?.[0]?.finish_reason;
      console.error(`Groq full-chart response was not parseable JSON (finish_reason: ${finishReason}):`, raw.slice(0, 500));
      return res.status(502).json({
        error:
          finishReason === "length"
            ? "The reading was cut off before finishing. Try again."
            : "Got an unreadable response. Try again.",
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("full-chart handler error:", err);
    return res.status(500).json({ error: "Something went wrong generating your chart reading." });
  }
}
