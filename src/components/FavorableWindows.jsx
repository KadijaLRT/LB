import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, ChevronDown } from "lucide-react";
import { localDateString } from "../lib/date.js";

// Presentation: days are grouped by type (easy vs push-through) so the
// plain-language "what it's good for" line appears ONCE per group instead of
// being repeated on every day. Each day is a small chip; tapping a chip shows
// that day's best time window and the chart detail underneath.

function parseDay(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function chipLabel(dateStr, today) {
  if (dateStr === today) return "Today";
  const d = parseDay(dateStr);
  return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${d.getDate()}`;
}

function shortLabel(dateStr, today) {
  if (dateStr === today) return "Today";
  return parseDay(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function longLabel(dateStr, today) {
  const text = parseDay(dateStr).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return dateStr === today ? `Today, ${text}` : text;
}

const GROUPS = [
  {
    mode: "easy",
    title: "Easy days",
    prefix: "Smooth for things",
    Icon: TrendingUp,
    iconClass: "text-sage",
    chipActive: "bg-sage/20 border-sage text-sage",
  },
  {
    mode: "high-energy",
    title: "Push-through days",
    prefix: "Takes more effort for things",
    Icon: TrendingDown,
    iconClass: "text-fire",
    chipActive: "bg-fire/20 border-fire text-fire",
  },
];

function DayDetail({ w, today }) {
  const [showWhy, setShowWhy] = useState(false);
  const best = w.hourly?.[0];

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-line/30 p-3">
      <span className="text-sm text-cream">{longLabel(w.date, today)}</span>

      {best ? (
        <div className="flex items-center gap-1.5 text-sm text-cream">
          <Clock size={13} className="text-clay shrink-0" />
          Best window: {best.start} to {best.end}
        </div>
      ) : (
        <p className="text-xs text-muted">No standout hour, the whole day carries this energy.</p>
      )}

      <button
        type="button"
        onClick={() => setShowWhy((s) => !s)}
        className="flex items-center gap-1 text-[11px] text-muted/80 hover:text-muted self-start"
      >
        <ChevronDown size={11} className={`transition-transform ${showWhy ? "rotate-180" : ""}`} />
        {showWhy ? "Hide the chart detail" : "Why? (chart detail)"}
      </button>

      {showWhy && (
        <div className="flex flex-col gap-1 border-l-2 border-line/80 pl-2">
          <span className="text-[11px] text-muted leading-relaxed">{w.description}</span>
          {best && <span className="text-[11px] text-muted/80 leading-relaxed">{best.description}</span>}
        </div>
      )}
    </div>
  );
}

export default function FavorableWindows({ profile, area }) {
  const [windows, setWindows] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const today = localDateString();

  useEffect(() => {
    setSelected(null);
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
        if (!cancelled) setWindows(Array.isArray(data.windows) ? data.windows : []);
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

  // Windows arrive in date order; the first one is the next upcoming day.
  const next = windows[0];
  const selectedWindow = windows.find((w) => w.date === selected) || null;

  return (
    <div className="border border-line rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5"
      >
        <span className="text-xs uppercase tracking-[0.2em] text-clay flex items-center gap-1.5 shrink-0">
          <TrendingUp size={12} />
          Good days to act
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted min-w-0">
          {next && <span className="truncate">Next: {shortLabel(next.date, today)}</span>}
          <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-3 py-3 flex flex-col gap-4">
          {windows.length === 0 && (
            <p className="text-xs text-muted italic">Nothing especially tight in the next two weeks, an ordinary stretch.</p>
          )}

          {GROUPS.map(({ mode, title, prefix, Icon, iconClass, chipActive }) => {
            const days = windows.filter((w) => w.mode === mode);
            if (days.length === 0) return null;
            return (
              <div key={mode} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm text-cream">
                  <Icon size={13} className={iconClass} />
                  {title}
                </div>
                {days[0].example && (
                  <p className="text-xs text-muted leading-relaxed">
                    {prefix} {days[0].example}.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {days.map((w) => {
                    const active = selected === w.date;
                    return (
                      <button
                        key={w.date}
                        type="button"
                        onClick={() => setSelected(active ? null : w.date)}
                        aria-pressed={active}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          active ? chipActive : "border-line text-cream/80 hover:border-clay"
                        }`}
                      >
                        {chipLabel(w.date, today)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {selectedWindow && <DayDetail w={selectedWindow} today={today} />}

          {windows.length > 0 && <p className="text-[11px] text-muted/70 italic">An energy forecast, not a guarantee.</p>}
        </div>
      )}
    </div>
  );
}
