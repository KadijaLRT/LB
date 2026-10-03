import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Info, Clock, ChevronDown } from "lucide-react";

// Collapsed by default to a single line: date badge + guidance. Everything
// else (the best hourly window, the astrology detail) lives behind one
// "Why?" toggle so the whole 2-week list reads as a compact stack of
// one-liners instead of a stack of multi-paragraph cards.
function DayCard({ w }) {
  const [open, setOpen] = useState(false);
  const isEasy = w.mode === "easy";
  const hourly = w.hourly?.[0]; // moonWindowsForDay now returns at most one, the tightest

  return (
    <button
      type="button"
      onClick={() => setOpen((s) => !s)}
      className="flex flex-col gap-1 py-1.5 border-b border-line last:border-0 last:pb-0 text-left w-full"
    >
      <div className="flex items-center gap-2">
        {isEasy ? (
          <TrendingUp size={12} className="text-sage shrink-0" />
        ) : (
          <TrendingDown size={12} className="text-fire shrink-0" />
        )}
        <span className="text-xs text-cream w-[64px] shrink-0">
          {new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <p className="text-xs text-cream/80 leading-snug truncate flex-1">{w.guidance}</p>
        <ChevronDown size={11} className={`shrink-0 text-muted/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="flex flex-col gap-1.5 pl-5 pt-1">
          <p className="text-xs text-cream/90 leading-relaxed">{w.guidance}</p>
          {hourly && (
            <div className="flex items-start gap-1.5 text-xs text-muted">
              <Clock size={11} className="shrink-0 mt-0.5" />
              <span>
                <span className="text-cream">{hourly.start}–{hourly.end}</span>: best window today
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 pl-1 border-l-2 border-line/60">
            <span className="text-[11px] text-muted leading-relaxed pl-2">{w.description}</span>
            {hourly && (
              <span className="text-[11px] text-muted/80 leading-relaxed pl-2">
                {hourly.start}–{hourly.end}: {hourly.description}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

export default function FavorableWindows({ profile, area }) {
  const [windows, setWindows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.natal_chart_notes?.trim() || !area) {
      setWindows(null);
      return;
    }
    let cancelled = false;
    setError("");
    fetch("/api/favorable-windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area, profile }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Couldn't compute this.");
        return data;
      })
      .then((data) => {
        if (!cancelled) setWindows(data.windows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.natal_chart_notes, area]);

  if (!profile?.natal_chart_notes?.trim()) return null;
  if (error) return <p className="text-xs text-fire">{error}</p>;
  if (!windows) return null;

  return (
    <div className="border border-line rounded-2xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-clay flex items-center gap-1.5">
          <TrendingUp size={12} />
          Good days to act
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted/60" title="Weather for your energy, not a guarantee.">
          <Info size={11} />
        </span>
      </div>

      {windows.length === 0 && (
        <p className="text-xs text-muted italic py-1">Nothing especially tight in the next two weeks, an ordinary stretch.</p>
      )}

      {windows.length > 0 && (
        <div className="flex flex-col">
          {windows.map((w, i) => (
            <DayCard key={i} w={w} />
          ))}
        </div>
      )}
    </div>
  );
}
