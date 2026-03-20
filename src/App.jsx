import { useState, useEffect, useCallback } from "react";

const QUESTIONS = [
  {
    id: "spirit",
    prompt: "My spirit right now feels...",
    options: ["heavy", "restless", "weary", "searching", "afraid", "numb"],
  },
  {
    id: "mind",
    prompt: "My mind has been...",
    options: ["racing", "doubtful", "foggy", "bitter", "overwhelmed", "wandering"],
  },
  {
    id: "heart",
    prompt: "Deep down, I'm longing for...",
    options: ["peace", "purpose", "forgiveness", "strength", "love", "hope"],
  },
  {
    id: "faith",
    prompt: "My faith lately has felt...",
    options: ["distant", "tested", "dormant", "shaken", "growing", "uncertain"],
  },
  {
    id: "need",
    prompt: "What I need most from God is...",
    options: ["comfort", "clarity", "renewal", "courage", "grace", "presence"],
  },
];

const SERIF = "'EB Garamond', Georgia, serif";
const STORAGE_KEY = "flesh-is-weak-journal";

const loadFont = () => {
  if (!document.querySelector("#eb-garamond-link")) {
    const link = document.createElement("link");
    link.id = "eb-garamond-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap";
    document.head.appendChild(link);
  }
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function persistEntry(entry) {
  const entries = loadEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return [...entries];
}

function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const key = d.toLocaleString("default", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(isoA, isoB) {
  const a = new Date(isoA), b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function useTypewriter(text, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return { displayed, done };
}

function CopyButton({ getText, accent, fgMuted, chipBorder, SERIF }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        background: "none",
        border: `0.5px solid ${copied ? accent : chipBorder}`,
        borderRadius: "14px",
        padding: "3px 10px",
        cursor: "pointer",
        fontFamily: SERIF,
        fontSize: "0.7rem",
        color: copied ? accent : fgMuted,
        letterSpacing: "0.04em",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);

  const [entries, setEntries] = useState(loadEntries);
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const RESULT_STEP = QUESTIONS.length;

  useEffect(() => { loadFont(); }, []);

  const bg = dark ? "#0d0c0a" : "#faf8f4";
  const fg = dark ? "#e8e2d6" : "#1a1714";
  const fgMuted = dark ? "#7a7167" : "#9a8f82";
  const cardBg = dark ? "#151310" : "#ffffff";
  const cardBorder = dark ? "#2a2520" : "#e8e2d6";
  const accent = dark ? "#c9a96e" : "#8b6914";
  const chipBg = dark ? "#1e1b17" : "#f3efe8";
  const chipBgSel = dark ? "#3a2f1a" : "#f0e6d0";
  const chipBorder = dark ? "#3a3028" : "#d4c9b0";
  const chipBorderSel = dark ? "#c9a96e" : "#8b6914";
  const prayerBg = dark ? "#110e0b" : "#fdf9f2";

  const current = QUESTIONS[step];

  const todayEntry = entries.find(e => isSameDay(e.date, new Date().toISOString()));

  const go = useCallback((dir, optionValue) => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      if (dir === 1 && optionValue) {
        const newAnswers = { ...answers, [current.id]: optionValue };
        setAnswers(newAnswers);
        if (step < QUESTIONS.length - 1) {
          setStep(step + 1);
          setSelected(null);
        } else {
          fetchResult(newAnswers);
        }
      } else if (dir === -1 && step > 0) {
        setStep(step - 1);
        setSelected(null);
      }
      setAnimating(false);
    }, 260);
  }, [animating, answers, current, step]);

  // Keyboard navigation
  useEffect(() => {
    if (view !== "quiz" || step >= RESULT_STEP) return;
    const handler = (e) => {
      if (e.key === "Enter" && selected) { e.preventDefault(); go(1, selected); }
      if (e.key === "ArrowLeft" && step > 0) go(-1);
      const num = parseInt(e.key);
      if (num >= 1 && num <= current.options.length) setSelected(current.options[num - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, step, selected, current, go]);

  const fetchResult = async (ans) => {
    setStep(RESULT_STEP);
    setLoading(true);
    setResult(null);
    setError(null);
    setNote("");
    setNoteSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const id = Date.now().toString();
    setCurrentEntryId(id);

    const books = ["Genesis", "Exodus", "Deuteronomy", "Joshua", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Hosea", "Joel", "Jonah", "Micah", "Habakkuk", "Zephaniah", "Zechariah", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "1 Timothy", "2 Timothy", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "Revelation"];
    const seed = Math.floor(Math.random() * 100000);
    const suggestedBook = books[Math.floor(Math.random() * books.length)];

    const prompt = `A person is seeking spiritual guidance with this emotional profile:
- Spirit feels: "${ans.spirit}"
- Mind has been: "${ans.mind}"
- Longing for: "${ans.heart}"
- Faith has felt: "${ans.faith}"
- Needs most from God: "${ans.need}"

Randomization seed: ${seed}. Use this to ensure a fresh, unique selection every time.
Strongly consider drawing the verse from this book (or a thematically nearby one): ${suggestedBook}.
Avoid overused verses like John 3:16, Romans 8:28, Philippians 4:13, Jeremiah 29:11, or Psalm 23 unless they are genuinely the most fitting. Explore the full breadth of Scripture — the Psalms of lament, the prophets, the epistles, the Gospels, wisdom literature.

Draw from the wisdom of theologians: John Piper, Tim Keller, Billy Graham, C.S. Lewis, Oswald Chambers, A.W. Tozer, Charles Spurgeon, D.L. Moody.

Respond with ONLY valid JSON (no markdown, no backticks, no extra text) in this exact format:
{
  "reference": "Book Chapter:Verse",
  "verse": "The exact verse text (ESV or KJV preferred)",
  "theologian": "Full Name",
  "theologianQuote": "A real or deeply representative quote from this theologian that speaks to this person's state (max 28 words)",
  "prayer": "First poetic prayer sentence. | Second poetic prayer sentence. | Third poetic prayer sentence closing with hope or surrender."
}

The prayer must: be in first person, feel cadenced and literary, speak directly to their emotional state, and close with surrender or hope. Separate the three sentences with ' | '.`;

    try {
      const res = await fetch("/api/verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      parsed.prayerLines = parsed.prayer.split("|").map(s => s.trim()).filter(Boolean);
      setResult(parsed);

      const entry = { id, date: new Date().toISOString(), answers: ans, result: parsed, note: "" };
      setEntries(persistEntry(entry));
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveNote = () => {
    if (!currentEntryId) return;
    const updated = entries.map(e => e.id === currentEntryId ? { ...e, note } : e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
    setNoteSaved(true);
  };

  const updateJournalNote = (entryId, newNote) => {
    const updated = entries.map(e => e.id === entryId ? { ...e, note: newNote } : e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
  };

  const deleteEntry = (id) => {
    const updated = entries.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
    if (expandedId === id) setExpandedId(null);
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setSelected(null);
    setResult(null);
    setError(null);
    setNote("");
    setNoteSaved(false);
    setCurrentEntryId(null);
  };

  const { displayed: verseText, done: verseDone } = useTypewriter(result?.verse || "", 20);
  const { displayed: quoteText, done: quoteDone } = useTypewriter(verseDone ? (result?.theologianQuote || "") : "", 18);
  const { displayed: prayer1, done: p1Done } = useTypewriter(quoteDone ? (result?.prayerLines?.[0] || "") : "", 22);
  const { displayed: prayer2, done: p2Done } = useTypewriter(p1Done ? (result?.prayerLines?.[1] || "") : "", 22);
  const { displayed: prayer3, done: p3Done } = useTypewriter(p2Done ? (result?.prayerLines?.[2] || "") : "", 22);

  const progress = step < RESULT_STEP ? (step / QUESTIONS.length) * 100 : 100;

  const btnStyle = (active) => ({
    background: "none",
    border: `0.5px solid ${active ? accent : chipBorder}`,
    borderRadius: "20px",
    padding: "6px 14px",
    cursor: "pointer",
    color: active ? accent : fgMuted,
    fontSize: "0.8rem",
    fontFamily: SERIF,
    letterSpacing: "0.04em",
    transition: "border-color 0.2s, color 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      color: fg,
      fontFamily: SERIF,
      transition: "background 0.4s, color 0.4s",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        textarea:focus { outline: none; }
        textarea::placeholder { opacity: 0.5; }
      `}</style>

      {/* Grain overlay — dark mode only */}
      {dark && (
        <div style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 999,
          opacity: 0.038,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
      )}

      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.25rem 1.5rem",
        borderBottom: `0.5px solid ${cardBorder}`,
      }}>
        <div onClick={() => setView("quiz")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <svg width="34" height="24" viewBox="0 0 36 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.85 }}>
            <polyline points="2,24 10,6 18,17" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="10,6 18,17 26,4 34,24" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="2" y1="24" x2="34" y2="24" stroke={accent} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
          </svg>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.02em", color: fg, lineHeight: 1.2 }}>
              quiet place
            </div>
            <div style={{ fontSize: "0.78rem", color: fgMuted, marginTop: "1px" }}>
              Matthew 26:41
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setView(view === "journal" ? "quiz" : "journal")}
            style={btnStyle(view === "journal")}
          >
            journal {entries.length > 0 ? `(${entries.length})` : ""}
          </button>
          <button onClick={() => setDark(!dark)} style={btnStyle(false)}>
            {dark ? "light" : "dark"}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {view === "quiz" && (
        <div style={{ height: "1px", background: cardBorder }}>
          <div style={{
            height: "1px",
            background: accent,
            width: `${progress}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
      )}

      {/* Journal View */}
      {view === "journal" && (
        <main style={{
          flex: 1,
          padding: "2.5rem 2rem",
          maxWidth: "640px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: "5rem" }}>
              <div style={{ fontSize: "1.1rem", color: fgMuted, marginBottom: "0.5rem" }}>
                Your journal is empty.
              </div>
              <div style={{ fontSize: "0.88rem", color: fgMuted, opacity: 0.6 }}>
                Complete a reflection to begin.
              </div>
            </div>
          ) : (
            Object.entries(groupByMonth(entries)).map(([month, monthEntries]) => (
              <div key={month} style={{ marginBottom: "2.5rem" }}>
                <div style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 500,
                  marginBottom: "1rem",
                }}>
                  {month}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {monthEntries.map(entry => {
                    const isOpen = expandedId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        style={{
                          background: cardBg,
                          border: `0.5px solid ${isOpen ? accent + "66" : cardBorder}`,
                          borderRadius: "14px",
                          overflow: "hidden",
                          transition: "border-color 0.2s",
                        }}
                      >
                        {/* Entry header */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "1.1rem 1.5rem",
                        }}>
                          <button
                            onClick={() => setExpandedId(isOpen ? null : entry.id)}
                            style={{
                              flex: 1,
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: SERIF,
                              textAlign: "left",
                            }}
                          >
                            <div style={{ fontSize: "0.9rem", color: fg, marginBottom: "4px" }}>
                              {formatDate(entry.date)}
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Object.values(entry.answers).map((a, i) => (
                                <span key={i} style={{
                                  background: chipBg,
                                  border: `0.5px solid ${chipBorder}`,
                                  borderRadius: "20px",
                                  padding: "2px 10px",
                                  fontSize: "0.72rem",
                                  color: fgMuted,
                                }}>
                                  {a}
                                </span>
                              ))}
                            </div>
                          </button>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "1rem", flexShrink: 0 }}>
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this entry?")) deleteEntry(entry.id);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: fgMuted,
                                opacity: 0.5,
                                fontSize: "0.85rem",
                                padding: "4px",
                                fontFamily: SERIF,
                                transition: "opacity 0.2s",
                              }}
                              onMouseEnter={e => e.target.style.opacity = 1}
                              onMouseLeave={e => e.target.style.opacity = 0.5}
                            >
                              ✕
                            </button>
                            <span style={{ color: fgMuted, fontSize: "0.85rem" }}>
                              {isOpen ? "↑" : "↓"}
                            </span>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isOpen && (
                          <div style={{ padding: "0 1.5rem 1.5rem", animation: "fadeIn 0.3s ease" }}>
                            <div style={{ height: "0.5px", background: cardBorder, marginBottom: "1.25rem" }} />

                            <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: accent, textTransform: "uppercase", fontWeight: 500, marginBottom: "0.75rem" }}>
                              {entry.result.reference}
                            </div>

                            <div style={{ fontSize: "1.25rem", lineHeight: 1.7, color: fg, marginBottom: "1rem" }}>
                              "{entry.result.verse}"
                            </div>

                            <div style={{ borderLeft: `2px solid ${accent}33`, paddingLeft: "1rem", marginBottom: "1rem" }}>
                              <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.4rem" }}>
                                {entry.result.theologian}
                              </div>
                              <div style={{ fontSize: "0.95rem", lineHeight: 1.6, color: fgMuted }}>
                                "{entry.result.theologianQuote}"
                              </div>
                            </div>

                            <div style={{ background: prayerBg, border: `0.5px solid ${cardBorder}`, borderRadius: "10px", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
                              <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.65rem" }}>
                                A prayer for you
                              </div>
                              <div style={{ fontSize: "1rem", lineHeight: 1.85, color: fg }}>
                                {entry.result.prayerLines.join(" ")}
                              </div>
                            </div>

                            <JournalNoteEditor
                              entry={entry}
                              dark={dark}
                              fg={fg}
                              fgMuted={fgMuted}
                              cardBorder={cardBorder}
                              accent={accent}
                              chipBorder={chipBorder}
                              SERIF={SERIF}
                              onSave={(newNote) => updateJournalNote(entry.id, newNote)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </main>
      )}

      {/* Quiz View */}
      {view === "quiz" && (
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.25rem",
          maxWidth: "600px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}>

          {/* Question Cards */}
          {step < RESULT_STEP && (
            <div style={{
              width: "100%",
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${direction * 24}px)` : "translateX(0)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}>

              {/* Greeting + intro — step 0 only */}
              {step === 0 && (
                <div style={{ textAlign: "center", marginBottom: "1.75rem", animation: "fadeIn 0.5s ease" }}>
                  <div style={{ fontSize: "0.75rem", color: fgMuted, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                    {new Date().toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: "1.1rem", color: fgMuted, marginBottom: "0.3rem" }}>
                    {getGreeting()}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: fgMuted, opacity: 0.6, letterSpacing: "0.04em" }}>
                    Take a moment. Be honest.
                  </div>
                  {todayEntry && (
                    <div style={{ marginTop: "0.85rem", fontSize: "0.8rem", color: fgMuted, opacity: 0.7 }}>
                      You've already reflected today —{" "}
                      <button
                        onClick={() => { setView("journal"); setExpandedId(todayEntry.id); }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: SERIF,
                          fontSize: "0.8rem",
                          color: accent,
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        }}
                      >
                        view entry →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step dots */}
              <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "2rem" }}>
                {QUESTIONS.map((_, i) => (
                  <div key={i} style={{
                    width: i === step ? "20px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    background: i === step ? accent : i < step ? accent + "66" : chipBorder,
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>

              {/* Card */}
              <div style={{
                background: cardBg,
                border: `0.5px solid ${cardBorder}`,
                borderRadius: "16px",
                padding: "2.5rem 2.25rem 2.25rem",
                boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
              }}>
                <p style={{
                  fontSize: "1.7rem",
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: fg,
                  textAlign: "center",
                  margin: "0 0 1.75rem 0",
                }}>
                  {current.prompt}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {current.options.map((opt) => {
                    const isSel = selected === opt;
                    const isLast = step === QUESTIONS.length - 1;
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          setSelected(opt);
                          if (!isLast) setTimeout(() => go(1, opt), 300);
                        }}
                        style={{
                          background: isSel ? chipBgSel : chipBg,
                          border: `0.5px solid ${isSel ? chipBorderSel : chipBorder}`,
                          borderRadius: "10px",
                          padding: "16px 8px",
                          cursor: "pointer",
                          fontFamily: SERIF,
                          fontSize: "1rem",
                          color: isSel ? accent : fg,
                          transition: "all 0.18s ease",
                          textAlign: "center",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nav */}
              <div style={{
                display: "flex",
                justifyContent: step === QUESTIONS.length - 1 ? "space-between" : "flex-start",
                alignItems: "center",
                marginTop: "1.5rem",
              }}>
                <button
                  onClick={() => step > 0 && go(-1)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: step > 0 ? "pointer" : "default",
                    color: step > 0 ? fgMuted : "transparent",
                    fontFamily: SERIF,
                    fontSize: "0.9rem",
                    padding: "8px 0",
                    letterSpacing: "0.04em",
                    transition: "color 0.2s",
                  }}
                >
                  ← back
                </button>

                {step === QUESTIONS.length - 1 && (
                  <button
                    onClick={() => selected && go(1, selected)}
                    style={{
                      background: selected ? accent : "transparent",
                      border: `0.5px solid ${selected ? accent : chipBorder}`,
                      borderRadius: "24px",
                      padding: "10px 28px",
                      cursor: selected ? "pointer" : "default",
                      fontFamily: SERIF,
                      fontSize: "0.95rem",
                      color: selected ? (dark ? "#0d0c0a" : "#fff") : fgMuted,
                      letterSpacing: "0.04em",
                      transition: "all 0.2s ease",
                    }}
                  >
                    reveal
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {step === RESULT_STEP && (
            <div style={{ width: "100%", textAlign: "center" }}>
              {loading && (
                <div style={{ color: fgMuted, fontSize: "1.1rem" }}>
                  <span style={{ animation: "pulse 2s infinite", display: "inline-block" }}>
                    Searching the Word...
                  </span>
                </div>
              )}

              {error && (
                <div>
                  <div style={{ color: "#b94040", fontSize: "1rem", marginBottom: "1rem" }}>{error}</div>
                  <button onClick={() => fetchResult(answers)} style={{
                    background: "none", border: `0.5px solid ${chipBorder}`,
                    borderRadius: "24px", padding: "10px 22px", cursor: "pointer",
                    fontFamily: SERIF, fontSize: "0.9rem", color: fgMuted,
                  }}>try again</button>
                </div>
              )}

              {result && (
                <div style={{ animation: "fadeIn 0.6s ease" }}>

                  {/* Reference */}
                  <div style={{
                    fontSize: "0.78rem",
                    letterSpacing: "0.14em",
                    color: accent,
                    textTransform: "uppercase",
                    marginBottom: "1.25rem",
                    fontWeight: 500,
                  }}>
                    {result.reference}
                  </div>

                  {/* Verse */}
                  <div style={{
                    background: cardBg,
                    border: `0.5px solid ${cardBorder}`,
                    borderRadius: "16px",
                    padding: "2.25rem",
                    marginBottom: "1rem",
                    boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                    textAlign: "left",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ fontSize: "1.6rem", lineHeight: 1.7, color: fg, fontWeight: 400, minHeight: "56px", flex: 1 }}>
                        "{verseText}{!verseDone && <span style={{ animation: "blink 1s step-end infinite" }}>|</span>}{verseDone && `"`}
                      </div>
                      {verseDone && (
                        <CopyButton
                          getText={() => `${result.reference}\n"${result.verse}"`}
                          accent={accent}
                          fgMuted={fgMuted}
                          chipBorder={chipBorder}
                          SERIF={SERIF}
                        />
                      )}
                    </div>
                  </div>

                  {/* Theologian quote */}
                  {quoteText && (
                    <div style={{
                      background: cardBg,
                      border: `0.5px solid ${cardBorder}`,
                      borderRadius: "16px",
                      padding: "1.5rem 2rem",
                      marginBottom: "1rem",
                      textAlign: "left",
                      boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, marginBottom: "0.65rem", fontWeight: 500 }}>
                        {result.theologian}
                      </div>
                      <div style={{ fontSize: "1.05rem", lineHeight: 1.65, color: fgMuted }}>
                        "{quoteText}{!quoteDone && <span style={{ animation: "blink 1s step-end infinite" }}>|</span>}{quoteDone && `"`}
                      </div>
                    </div>
                  )}

                  {/* Prayer */}
                  {prayer1 && (
                    <div style={{
                      background: prayerBg,
                      border: `0.5px solid ${cardBorder}`,
                      borderRadius: "16px",
                      padding: "2.25rem",
                      marginBottom: "1rem",
                      textAlign: "left",
                      boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 500 }}>
                          A prayer for you
                        </div>
                        {p3Done && (
                          <CopyButton
                            getText={() => result.prayerLines.join(" ")}
                            accent={accent}
                            fgMuted={fgMuted}
                            chipBorder={chipBorder}
                            SERIF={SERIF}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: "1.3rem", lineHeight: 1.9, color: fg }}>
                        {prayer1}{!p1Done && <span style={{ animation: "blink 1s step-end infinite" }}>|</span>}
                        {prayer2 && (
                          <span>
                            {" "}{prayer2}{!p2Done && <span style={{ animation: "blink 1s step-end infinite" }}>|</span>}
                          </span>
                        )}
                        {prayer3 && <span> {prayer3}</span>}
                      </div>
                    </div>
                  )}

                  {/* Reflection note */}
                  {p3Done && (
                    <div style={{
                      background: cardBg,
                      border: `0.5px solid ${cardBorder}`,
                      borderRadius: "16px",
                      padding: "1.75rem 2rem",
                      marginBottom: "1rem",
                      textAlign: "left",
                      animation: "fadeIn 0.5s ease",
                      boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.85rem" }}>
                        Your reflection
                      </div>
                      <textarea
                        value={note}
                        onChange={e => { setNote(e.target.value); setNoteSaved(false); }}
                        placeholder="Write a thought, a prayer of your own, or whatever is on your heart..."
                        rows={4}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: `0.5px solid ${chipBorder}`,
                          borderRadius: "10px",
                          padding: "0.85rem 1rem",
                          fontFamily: SERIF,
                          fontSize: "1rem",
                          color: fg,
                          lineHeight: 1.65,
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.65rem" }}>
                        <button
                          onClick={saveNote}
                          disabled={!note.trim()}
                          style={{
                            background: note.trim() ? accent : "transparent",
                            border: `0.5px solid ${note.trim() ? accent : chipBorder}`,
                            borderRadius: "20px",
                            padding: "6px 18px",
                            cursor: note.trim() ? "pointer" : "default",
                            fontFamily: SERIF,
                            fontSize: "0.82rem",
                            color: note.trim() ? (dark ? "#0d0c0a" : "#fff") : fgMuted,
                            letterSpacing: "0.04em",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {noteSaved ? "saved ✓" : "save note"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Answer chips */}
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: "1.75rem",
                    marginTop: "0.5rem",
                  }}>
                    {Object.values(answers).map((a, i) => (
                      <span key={i} style={{
                        background: chipBg,
                        border: `0.5px solid ${chipBorder}`,
                        borderRadius: "20px",
                        padding: "4px 12px",
                        fontSize: "0.78rem",
                        color: fgMuted,
                      }}>
                        {a}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                      onClick={() => fetchResult(answers)}
                      style={{
                        background: "none",
                        border: `0.5px solid ${chipBorder}`,
                        borderRadius: "24px",
                        padding: "10px 22px",
                        cursor: "pointer",
                        fontFamily: SERIF,
                        fontSize: "0.9rem",
                        color: fgMuted,
                        letterSpacing: "0.04em",
                        transition: "border-color 0.2s",
                      }}
                    >
                      ↺ another
                    </button>
                    <button
                      onClick={reset}
                      style={{
                        background: accent,
                        border: "none",
                        borderRadius: "24px",
                        padding: "10px 22px",
                        cursor: "pointer",
                        fontFamily: SERIF,
                        fontSize: "0.9rem",
                        color: dark ? "#0d0c0a" : "#fff",
                        letterSpacing: "0.04em",
                      }}
                    >
                      start over
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function JournalNoteEditor({ entry, dark, fg, fgMuted, cardBorder, accent, chipBorder, SERIF, onSave }) {
  const [note, setNote] = useState(entry.note || "");
  const [saved, setSaved] = useState(!!entry.note);

  const handleSave = () => {
    onSave(note);
    setSaved(true);
  };

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 500, marginBottom: "0.6rem" }}>
        Reflection
      </div>
      <textarea
        value={note}
        onChange={e => { setNote(e.target.value); setSaved(false); }}
        placeholder="Add a note or reflection..."
        rows={3}
        style={{
          width: "100%",
          background: "transparent",
          border: `0.5px solid ${chipBorder}`,
          borderRadius: "8px",
          padding: "0.75rem 0.9rem",
          fontFamily: SERIF,
          fontSize: "0.95rem",
          color: fg,
          lineHeight: 1.65,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <button
          onClick={handleSave}
          disabled={!note.trim()}
          style={{
            background: "none",
            border: `0.5px solid ${note.trim() ? accent : chipBorder}`,
            borderRadius: "20px",
            padding: "5px 16px",
            cursor: note.trim() ? "pointer" : "default",
            fontFamily: SERIF,
            fontSize: "0.78rem",
            color: note.trim() ? accent : fgMuted,
            letterSpacing: "0.04em",
            transition: "all 0.2s ease",
          }}
        >
          {saved ? "saved ✓" : "save"}
        </button>
      </div>
    </div>
  );
}
