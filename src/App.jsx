import { useState, useEffect } from "react";

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

const loadFont = () => {
  if (!document.querySelector("#eb-garamond-link")) {
    const link = document.createElement("link");
    link.id = "eb-garamond-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap";
    document.head.appendChild(link);
  }
};

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

export default function App() {
  const [dark, setDark] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);

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

  const go = (dir, optionValue) => {
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
  };

  const fetchResult = async (ans) => {
    setStep(RESULT_STEP);
    setLoading(true);
    setResult(null);
    setError(null);

    const prompt = `A person is seeking spiritual guidance with this emotional profile:
- Spirit feels: "${ans.spirit}"
- Mind has been: "${ans.mind}"
- Longing for: "${ans.heart}"
- Faith has felt: "${ans.faith}"
- Needs most from God: "${ans.need}"

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
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setSelected(null);
    setResult(null);
    setError(null);
  };

  const { displayed: verseText, done: verseDone } = useTypewriter(result?.verse || "", 20);
  const { displayed: quoteText, done: quoteDone } = useTypewriter(verseDone ? (result?.theologianQuote || "") : "", 18);
  const { displayed: prayer1, done: p1Done } = useTypewriter(quoteDone ? (result?.prayerLines?.[0] || "") : "", 22);
  const { displayed: prayer2, done: p2Done } = useTypewriter(p1Done ? (result?.prayerLines?.[1] || "") : "", 22);
  const { displayed: prayer3 } = useTypewriter(p2Done ? (result?.prayerLines?.[2] || "") : "", 22);

  const progress = step < RESULT_STEP ? (step / QUESTIONS.length) * 100 : 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      color: fg,
      fontFamily: SERIF,
      transition: "background 0.4s, color 0.4s",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.5rem 2rem",
        borderBottom: `0.5px solid ${cardBorder}`,
      }}>
        <div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "0.02em", color: fg }}>
            The Flesh is Weak
          </div>
          <div style={{ fontSize: "0.78rem", color: fgMuted, marginTop: "1px", fontStyle: "italic" }}>
            Matthew 26:41
          </div>
        </div>
        <button
          onClick={() => setDark(!dark)}
          style={{
            background: "none",
            border: `0.5px solid ${chipBorder}`,
            borderRadius: "20px",
            padding: "6px 14px",
            cursor: "pointer",
            color: fgMuted,
            fontSize: "0.8rem",
            fontFamily: SERIF,
            letterSpacing: "0.04em",
            transition: "border-color 0.2s",
          }}
        >
          {dark ? "light" : "dark"}
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height: "1px", background: cardBorder }}>
        <div style={{
          height: "1px",
          background: accent,
          width: `${progress}%`,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        maxWidth: "540px",
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
              padding: "2.5rem 2rem 2rem",
              boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
            }}>
              <p style={{
                fontSize: "1.45rem",
                fontWeight: 400,
                lineHeight: 1.4,
                color: fg,
                marginBottom: "1.75rem",
                fontStyle: "italic",
                textAlign: "center",
                margin: "0 0 1.75rem 0",
              }}>
                {current.prompt}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {current.options.map((opt) => {
                  const isSel = selected === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelected(opt)}
                      style={{
                        background: isSel ? chipBgSel : chipBg,
                        border: `0.5px solid ${isSel ? chipBorderSel : chipBorder}`,
                        borderRadius: "10px",
                        padding: "12px 8px",
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
              justifyContent: "space-between",
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
                {step === QUESTIONS.length - 1 ? "reveal" : "continue →"}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === RESULT_STEP && (
          <div style={{ width: "100%", textAlign: "center" }}>
            {loading && (
              <div style={{ color: fgMuted, fontStyle: "italic", fontSize: "1.1rem" }}>
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
                  padding: "2rem",
                  marginBottom: "1rem",
                  boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                  textAlign: "left",
                }}>
                  <div style={{
                    fontSize: "1.38rem",
                    lineHeight: 1.7,
                    fontStyle: "italic",
                    color: fg,
                    fontWeight: 400,
                    minHeight: "56px",
                  }}>
                    "{verseText}{!verseDone && <span style={{ animation: "blink 1s step-end infinite" }}>|</span>}{verseDone && `"`}
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
                    <div style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: accent,
                      marginBottom: "0.65rem",
                      fontWeight: 500,
                    }}>
                      {result.theologian}
                    </div>
                    <div style={{
                      fontSize: "1.05rem",
                      lineHeight: 1.65,
                      color: fgMuted,
                      fontStyle: "italic",
                    }}>
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
                    padding: "2rem",
                    marginBottom: "1.5rem",
                    textAlign: "left",
                    boxShadow: dark ? "none" : "0 2px 24px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: accent,
                      marginBottom: "1rem",
                      fontWeight: 500,
                    }}>
                      A prayer for you
                    </div>
                    <div style={{ fontSize: "1.12rem", lineHeight: 1.9, color: fg, fontStyle: "italic" }}>
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

                {/* Answer chips */}
                <div style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: "1.75rem",
                }}>
                  {Object.values(answers).map((a, i) => (
                    <span key={i} style={{
                      background: chipBg,
                      border: `0.5px solid ${chipBorder}`,
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontSize: "0.78rem",
                      color: fgMuted,
                      fontStyle: "italic",
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
    </div>
  );
}
