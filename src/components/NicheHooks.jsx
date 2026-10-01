import { useState } from "react";
import { EyeOff, Loader2, RefreshCw, ChevronDown, Video } from "lucide-react";

const VISUAL_LABEL = {
  "b-roll-text-overlay": "B-roll + text overlay",
  "green-screen-breakdown": "Green-screen slide breakdown",
  "voiceover-static": "Voiceover over static/stock",
  "screen-recording": "Screen recording",
};

export default function NicheHooks({ profile }) {
  const [open, setOpen] = useState(false);
  const [focusTopic, setFocusTopic] = useState("");
  const [concepts, setConcepts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/niche-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, focusTopic: focusTopic.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setConcepts(data.concepts);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <EyeOff size={12} className="text-clay" />
          Faceless video concepts
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-line p-4 flex flex-col gap-4">
          <p className="text-xs text-muted leading-relaxed">
            Four no-camera formats (B-roll, green-screen slide breakdown, voiceover over static, or screen recording) built for
            your field, with a real hook, full script or overlay text, and why the format fits. No invented stats, no promised results.
          </p>

          <div className="flex items-center gap-2">
            <input
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="Optional: narrow to a specific topic (e.g. burnout in retail management)"
              className="flex-1 bg-transparent border-b border-line focus:border-clay outline-none text-sm py-1 placeholder:text-muted/60"
            />
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-clay text-ink font-medium disabled:opacity-40 shrink-0"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {concepts ? "Regenerate" : "Generate"}
            </button>
          </div>

          {error && <p className="text-sm text-fire">{error}</p>}

          {concepts && (
            <div className="flex flex-col gap-4">
              {concepts.map((c, i) => (
                <div key={i} className="flex flex-col gap-2 border border-line rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Video size={13} className="text-clay shrink-0" />
                    <span className="text-sm text-cream font-medium">{c.title}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-clay/15 text-clay ml-auto shrink-0">
                      {VISUAL_LABEL[c.visual_approach] || c.visual_approach}
                    </span>
                  </div>
                  <p className="text-xs text-muted italic">{c.visual_direction}</p>
                  <p className="text-sm text-cream leading-relaxed">"{c.hook}"</p>
                  <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{c.script_or_overlay}</p>
                  <p className="text-xs text-clay/90">{c.why_it_fits}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
