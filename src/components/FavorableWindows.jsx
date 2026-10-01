import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Info, Clock } from "lucide-react";

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
    <div className="border border-line rounded-2xl p-4 flex flex-col gap-3">
      <span className="text-xs uppercase tracking-[0.2em] text-clay flex items-center gap-1.5">
        <TrendingUp size={12} />
        Real chart timing — next 2 weeks
      </span>

      <div className="flex items-start gap-2 text-xs text-muted italic">
        <Info size={13} className="shrink-0 mt-0.5" />
        Real computed transits to your chart. This describes energy, not outcomes: "easy" days support things going
        smoothly, "high-energy" days carry real friction, not a bad sign, just a day where force meets resistance.
        Nothing here predicts success or failure of a specific action.
      </div>

      {windows.length === 0 && (
        <p className="text-sm text-muted italic">Nothing especially tight in the next two weeks for this area, an ordinary stretch, not a bad one.</p>
      )}

      {windows.length > 0 && (
        <div className="flex flex-col gap-3">
          {windows.map((w, i) => (
            <div key={i} className="flex flex-col gap-1.5 pb-3 border-b border-line last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                {w.mode === "easy" ? (
                  <TrendingUp size={13} className="text-sage shrink-0" />
                ) : (
                  <TrendingDown size={13} className="text-fire shrink-0" />
                )}
                <span className="text-sm text-cream">
                  {new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${w.mode === "easy" ? "bg-sage/15 text-sage" : "bg-fire/15 text-fire"}`}>
                  {w.mode === "easy" ? "Easy" : "High-energy"}
                </span>
              </div>
              <span className="text-xs text-muted leading-relaxed">{w.description}</span>
              <span className="text-xs text-cream/80 leading-relaxed">{w.guidance}</span>

              {w.hourly?.length > 0 && (
                <div className="mt-1 flex flex-col gap-1 pl-1 border-l-2 border-line/60">
                  {w.hourly.map((h, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs text-muted pl-2">
                      <Clock size={11} className="shrink-0 mt-0.5" />
                      <span>
                        <span className="text-cream">{h.start}–{h.end}</span>: {h.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
