import { useEffect, useRef, useState } from "react";
import { Compass, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { listScripts } from "../lib/db.js";

// Strategist, not a Q&A box: always open, multi-turn, and aware of what has
// already been made and posted, so advice builds on the real body of work.
const PROMPTS = [
  { label: "What should I post today?", text: "What should I post today? Pick one idea and one platform and tell me why." },
  { label: "Plan my week", text: "Plan my posting week. Keep it small enough that I will actually do it." },
  { label: "Find my content pillars", text: "Help me figure out my 3 content pillars based on what I've made so far and what I'm trying to build." },
  { label: "Audit my content", text: "Look at what I've made and posted so far. What patterns do you see, what's missing, and what should I make next?" },
  { label: "Path to monetizing", text: "Lay out my path from where I am now to making money from my content. What do I build first, what do I post to support it, and how will I know it's working?" },
  { label: "Fix my hook", text: "I'm going to paste a hook or draft. Tell me what's weak and fix it." },
];

const MAX_TURNS_SENT = 12;

function toContextItem(row) {
  const posted = row?.posted_at && typeof row.posted_at === "object" ? Object.keys(row.posted_at) : [];
  return {
    topic: row?.raw_brain_dump || row?.short_form_script || "",
    status: row?.status || "draft",
    posted_on: posted,
    created: row?.created_at || "",
  };
}

export default function ContentCoach({ profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState([]);
  const endRef = useRef(null);
  const requestId = useRef(0);

  // Pull recent saved content once so the strategist can reference it. Failure
  // is non-fatal: the strategist still works, it just has less to go on.
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    listScripts(profile.id, 12)
      .then((rows) => {
        if (!cancelled) setRecent(rows.map(toContextItem).filter((r) => r.topic));
      })
      .catch((err) => console.error("Couldn't load recent content for strategist:", err));
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");
    const myRequest = ++requestId.current;

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "strategist",
          profile,
          recentContent: recent,
          messages: next.slice(-MAX_TURNS_SENT),
        }),
      });
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(res.ok ? "Unreadable response from server." : `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || `Strategist request failed (${res.status})`);
      if (!data.reply) throw new Error("Got an empty response back.");
      // Ignore a reply that arrives after the user hit "start over".
      if (myRequest !== requestId.current) return;
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      if (myRequest !== requestId.current) return;
      setError(err.message || "Something went wrong.");
      // Put the unsent message back so nothing typed is lost.
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }

  function reset() {
    requestId.current++;
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  }

  return (
    <div className="border border-line rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <Compass size={12} className="text-clay" />
          Social media strategist
        </span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-cream"
          >
            <RotateCcw size={11} />
            Start over
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <>
          <p className="text-sm text-cream/80 leading-relaxed">
            {recent.length > 0
              ? `I can see your last ${recent.length} saved piece${recent.length === 1 ? "" : "s"}. Ask me what to post, plan a week, or paste a draft and I'll fix it.`
              : "Ask me what to post, plan a week, or paste a draft and I'll fix it. Save some content and I'll start spotting patterns in it."}
          </p>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={loading}
                onClick={() => send(p.text)}
                className="text-xs px-2.5 py-1 rounded-full border border-line text-muted hover:text-cream hover:border-clay transition-colors disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="self-end max-w-[85%] text-sm text-cream bg-line/60 rounded-2xl px-3 py-2 whitespace-pre-wrap">
                {m.content}
              </p>
            ) : (
              <p key={i} className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap border-l-2 border-clay pl-3">
                {m.content}
              </p>
            )
          )}
          {loading && (
            <div className="border-l-2 border-clay pl-3 space-y-2">
              <div className="h-3 w-4/5 bg-line rounded animate-pulse" />
              <div className="h-3 w-3/5 bg-line rounded animate-pulse" />
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && <p className="text-sm text-fire">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={messages.length ? "Reply, or paste a draft" : "Ask, plan, or paste a draft"}
          className="flex-1 bg-transparent border border-line rounded-xl p-2 text-sm text-cream placeholder:text-muted/60 outline-none focus:border-clay resize-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="w-8 h-8 rounded-full bg-clay text-ink flex items-center justify-center disabled:opacity-30 shrink-0 mb-1"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        </button>
      </form>
    </div>
  );
}
