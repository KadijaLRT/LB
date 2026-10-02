import { useState } from "react";
import { Calculator, Workflow, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

function RateCard({ data }) {
  if (!data) return null;
  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-cream">{data.service_summary}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-line rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted">Starting range</span>
          <span className="text-lg text-cream font-medium">
            {fmt(data.starting_range.low)}–{fmt(data.starting_range.high)}
            <span className="text-xs text-muted ml-1">{data.starting_range.unit}</span>
          </span>
          <p className="text-xs text-muted leading-relaxed">{data.starting_range.reasoning}</p>
        </div>
        <div className="border border-line rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted">Growth range</span>
          <span className="text-lg text-cream font-medium">
            {fmt(data.growth_range.low)}–{fmt(data.growth_range.high)}
            <span className="text-xs text-muted ml-1">{data.growth_range.unit}</span>
          </span>
          <p className="text-xs text-muted leading-relaxed">{data.growth_range.reasoning}</p>
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-clay">What moves you up</span>
        <ul className="mt-1 flex flex-col gap-1">
          {data.what_moves_you_up.map((m, i) => (
            <li key={i} className="text-sm text-cream/90">• {m}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 text-xs text-fire/90">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          {data.risks.map((r, i) => (
            <span key={i}>{r}</span>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted italic">{data.caveat}</p>
    </div>
  );
}

function FunnelCard({ data }) {
  if (!data) return null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {data.funnel_diagram.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full border border-line text-cream">{step}</span>
            {i < data.funnel_diagram.length - 1 && <span className="text-muted">→</span>}
          </div>
        ))}
      </div>

      <div className="border border-line rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-clay">Free lead magnet</span>
        <p className="text-sm text-cream font-medium">{data.lead_magnet.title}</p>
        <ul className="flex flex-col gap-0.5">
          {data.lead_magnet.outline.map((o, i) => (
            <li key={i} className="text-xs text-muted">• {o}</li>
          ))}
        </ul>
        <p className="text-xs text-muted/80 italic">{data.lead_magnet.delivery_note}</p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wide text-clay">Automated email sequence</span>
        {data.email_sequence.map((e, i) => (
          <div key={i} className="border border-line rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cream font-medium">{e.step}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">{e.timing}</span>
            </div>
            <p className="text-xs text-muted italic">{e.purpose}</p>
            <p className="text-xs text-cream/90 whitespace-pre-wrap leading-relaxed mt-1">{e.draft}</p>
          </div>
        ))}
      </div>

      <div className="border border-line rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-clay">The offer itself</span>
        <p className="text-sm text-cream">{data.offer_structure.format}</p>
        <ul className="flex flex-col gap-0.5">
          {data.offer_structure.steps.map((s, i) => (
            <li key={i} className="text-xs text-muted">• {s}</li>
          ))}
        </ul>
        <p className="text-xs text-muted/80 italic">{data.offer_structure.pricing_note}</p>
      </div>
    </div>
  );
}

export default function ConsultingBuilder({ profile }) {
  const [serviceType, setServiceType] = useState("Asynchronous operational/workflow audit");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [niche, setNiche] = useState("");

  const [rates, setRates] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [error, setError] = useState("");

  async function getRates() {
    setLoadingRates(true);
    setError("");
    try {
      const res = await fetch("/api/consulting-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, experienceLevel: experienceLevel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setRates(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoadingRates(false);
    }
  }

  async function getFunnel() {
    setLoadingFunnel(true);
    setError("");
    try {
      const res = await fetch("/api/consulting-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "funnel", niche: niche || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setFunnel(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoadingFunnel(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-line rounded-2xl p-4 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-clay flex items-center gap-1.5">
          <Calculator size={12} />
          Rate guidance
        </span>
        <p className="text-xs text-muted leading-relaxed">
          Real ranges based on service type and experience, framed as starting points, never a promised income.
        </p>
        <input
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          placeholder="What are you offering?"
          className="bg-transparent border-b border-line focus:border-clay outline-none text-sm py-1 placeholder:text-muted/60"
        />
        <input
          value={experienceLevel}
          onChange={(e) => setExperienceLevel(e.target.value)}
          placeholder="Optional: your experience level"
          className="bg-transparent border-b border-line focus:border-clay outline-none text-sm py-1 placeholder:text-muted/60"
        />
        <button
          type="button"
          onClick={getRates}
          disabled={loadingRates || !serviceType.trim()}
          className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-clay text-ink font-medium disabled:opacity-40"
        >
          {loadingRates ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {rates ? "Recalculate" : "Get rate guidance"}
        </button>
        <RateCard data={rates} />
      </div>

      <div className="border border-line rounded-2xl p-4 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-clay flex items-center gap-1.5">
          <Workflow size={12} />
          Funnel structure
        </span>
        <p className="text-xs text-muted leading-relaxed">
          Lead magnet, automated email sequence, and asynchronous offer mechanics. No fabricated numbers, no fake sources.
        </p>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Optional: your niche (defaults to organizational psychology / workplace consulting)"
          className="bg-transparent border-b border-line focus:border-clay outline-none text-sm py-1 placeholder:text-muted/60"
        />
        <button
          type="button"
          onClick={getFunnel}
          disabled={loadingFunnel}
          className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-clay text-ink font-medium disabled:opacity-40"
        >
          {loadingFunnel ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {funnel ? "Regenerate" : "Build funnel"}
        </button>
        <FunnelCard data={funnel} />
      </div>

      {error && <p className="text-sm text-fire">{error}</p>}
    </div>
  );
}
