// Shared voice-matching block, used by EVERY AI endpoint so the person's
// Settings voice sample shapes the wording everywhere in the app, not just in
// the content engine. The leading underscore keeps this out of Vercel's
// serverless function count (same convention as _ephemeris.js).
//
// Placed LAST in the final user message (right next to the actual task) by
// callers, because a sample buried in a long system prompt or a context
// list gets treated as just another fact. Capped so a huge paste cannot
// crowd out the real task.

const MAX_SAMPLE_CHARS = 4000;

export function hasVoiceSample(sample) {
  return typeof sample === "string" && sample.trim().length > 0;
}

export function buildVoiceBlock(sample) {
  if (!hasVoiceSample(sample)) return "";
  const text = sample.trim();
  const clipped = text.length > MAX_SAMPLE_CHARS ? text.slice(-MAX_SAMPLE_CHARS) : text;
  return [
    "=== HOW THIS PERSON ACTUALLY WRITES (their real posts and texts) ===",
    clipped,
    "=== END OF THEIR WRITING ===",
    "VOICE RULE, applies to every sentence you write for them: write the way this exact person writes. Copy, from the writing above: sentence length, punctuation and capitalization habits, contractions, slang and filler words, how blunt or soft they are, and whether and how they use emoji. Use their phrasing style, not a cleaned-up or more polished one. If your draft sounds smoother, more formal, more motivational or more like an assistant than the sample, roughen it back to their level. Facts, numbers, required output structure (such as JSON) and the other rules above still win; the voice only changes the wording.",
  ].join("\n");
}

// Appends the voice block to a string, with a blank line between, or returns
// the string untouched when there is no sample.
export function withVoice(text, sample) {
  const block = buildVoiceBlock(sample);
  return block ? `${text}\n\n${block}` : text;
}
