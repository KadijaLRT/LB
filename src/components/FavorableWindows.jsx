import { useEffect, useState } from "react";
import { TrendingUp, Info } from "lucide-react";

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
        if (!r.ok) throw new Error(data.error || "Couldn't compute favorable windows.");
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
        Real favorable windows — next 2 weeks
      </span>

      <div className="flex items-start gap-2 text-xs text-muted italic">
        <Info size={13} className="shrink-0 mt-0.5" />
        Real computed transits to your chart — trine/sextile aspects and Jupiter/Venus conjunctions, the classical
        "easy" aspects — not a guarantee, just when your chart's own math is genuinely most supportive.
      </div>

      {windows.length === 0 && (
        <p className="text-sm text-muted italic">Nothing especially tight in the next two weeks for this area — an ordinary stretch, not a bad one.</p>
      )}

      {windows.length > 0 && (
        <div className="flex flex-col gap-2">
          {windows.map((w, i) => (
            <div key={i} className="flex flex-col gap-0.5 pb-2 border-b border-line last:border-0 last:pb-0">
              <span className="text-sm text-cream">
                {new Date(w.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="text-xs text-muted leading-relaxed">{w.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
