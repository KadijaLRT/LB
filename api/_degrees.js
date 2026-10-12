// Degree theory notes for natal placements. Source of the degree-to-sign
// themes: degree theory by Nikola Stojanovic, as written up in a post by
// hotpinkvelveteen on Tumblr ("Degrees in Astrology"), and cross-checked
// against the degree theory page at lunarxluci.com (Astrology with Luci), which
// lists the same degree-to-sign pattern. This is a modern
// interpretive tradition, NOT classical astrology, so everything built from
// it is labeled "degree theory" and framed as tendency, never as fact or
// prediction.
//
// A degree number is the whole degree inside the sign (0 to 29), the same
// convention the post uses: 0 is the very start of the sign.

// Degrees 1-29 cycle through the 12 signs in order (1 Aries, 2 Taurus, ...
// 12 Pisces, 13 Aries again, ...), which matches the post's lists exactly
// (for example Leo is 5, 17, 29; Virgo is 6, 18).
const SIGN_THEMES = [
  { sign: "Aries", themes: "being first, bravery, hard work, injuries, sports, the head, red" },
  { sign: "Taurus", themes: "money, food, possessions, growth, the throat, singing, nature" },
  { sign: "Gemini", themes: "communication, siblings and neighbors, media, documents, transportation" },
  { sign: "Cancer", themes: "mother figures, family, home and homeland, tears, public opinion" },
  { sign: "Leo", themes: "being seen, ego, a father figure, children, romance, top quality" },
  { sign: "Virgo", themes: "work, routine, health, service, detail" },
  { sign: "Libra", themes: "marriage and partnership, law and justice, beauty, art, politeness, indecision" },
  { sign: "Scorpio", themes: "sex, transformation, investigation, other people's money, intensity" },
  { sign: "Sagittarius", themes: "travel, foreign places, university, religion, philosophy, publishing" },
  { sign: "Capricorn", themes: "age, endurance, hardship, delay, tradition, vintage things" },
  { sign: "Aquarius", themes: "innovation, technology, the future, fast pace, sudden separation" },
  { sign: "Pisces", themes: "dreams, illusion, the hidden, escape, medication, the sea" },
];

// Special degrees, with the source's own meanings. The heavy ones (11, 15,
// 18, 22) are kept as the source states them, attributed to degree theory
// and framed as tendencies ("the stars impel, they do not compel", as the
// source itself says), never as predictions. This is a personal app for its
// owner, who asked for these to be included.
const SPECIAL = {
  2: "associated in degree theory with power, greatness or recognition",
  5: "associated in degree theory with magnetism and brief or minor fame",
  8: "a powerful degree in degree theory, associated with large transformation",
  17: "a Leo degree that degree theory associates with recognition in the area it touches",
  20: "a powerful degree in degree theory, associated with large transformation",
  11: "the suicide degree in degree theory; the source frames it as a tendency, not a fate",
  15: "the assassination degree in degree theory; the source frames it as a tendency, not a fate",
  18: "the bad fortune and health issues degree in degree theory",
  22: "the kill-or-be-killed degree in degree theory; the source's author reads it as where very hard decisions have to be made, or witnessing death",
};

// Returns a short note for a whole degree 0-29, or "" when there is none.
export function degreeNote(wholeDeg) {
  if (!Number.isInteger(wholeDeg) || wholeDeg < 0 || wholeDeg > 29) return "";

  const parts = [];
  if (wholeDeg === 0) {
    parts.push("0th degree: the very first degree of the sign, which degree theory reads as embodying the sign's pure energy for this planet");
  } else {
    const { sign, themes } = SIGN_THEMES[(wholeDeg - 1) % 12];
    const article = /^[AEIOU]/.test(sign) ? "an" : "a";
    parts.push(`degree ${wholeDeg}: ${article} ${sign}-style degree in degree theory (themes: ${themes})`);
  }
  if (wholeDeg === 29) {
    parts.push("29th degree: the anaretic degree, the last before the next sign, traditionally read as urgency and a sense of completing that sign's lessons");
  }
  if (SPECIAL[wholeDeg]) parts.push(SPECIAL[wholeDeg]);

  return parts.join("; ");
}
