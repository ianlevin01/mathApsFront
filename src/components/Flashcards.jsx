import { useState, useEffect, useRef } from "react";
import { getToken } from "../auth";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMath } from "../utils/mathUtils";
import PlanLimitModal from "./PlanLimitModal";
import "katex/dist/katex.min.css";
import "../styles/flashcards.css";
import "../styles/ai_loading_1.css";

function MathText({ children, className }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <span>{children}</span> }}
      >
        {normalizeMath(children ?? "")}
      </ReactMarkdown>
    </span>
  );
}

const PHRASES = {
  generating: [
    "Analizando tus chats...",
    "Identificando los conceptos clave...",
    "Consultando tus archivos de estudio...",
    "Procesando el material de la carpeta...",
    "Construyendo preguntas desafiantes...",
    "Seleccionando los temas más importantes...",
    "Revisando tus resoluciones previas...",
    "Generando opciones de respuesta...",
    "Preparando las flashcards...",
    "Casi listo...",
  ],
};

// onDone: callback que el padre llama cuando la request terminó
function LoadingBar({ phrases, icon = "🧠", accentColor = "rgba(124,92,255,0.9)", done = false }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(8);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  // Rotar frases
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 350);
    }, 2200);
    return () => clearInterval(intervalRef.current);
  }, [phrases]);

  // Avanzar barra: hasta 85% sola, llega al 100% cuando done=true
  useEffect(() => {
    if (done) {
      setProgress(100);
      return;
    }
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        const step = p < 40 ? 3 : p < 65 ? 1.5 : 0.5;
        return Math.min(p + step, 85);
      });
    }, 180);
    return () => clearInterval(progressRef.current);
  }, [done]);

  return (
    <div className="ai-loading-wrap">
      <div className="ai-loading-icon">{icon}</div>
      <div className="ai-loading-bar-row">
        <div className="ai-loading-bar-bg">
          <div
            className="ai-loading-bar-fill"
            style={{
              width: `${progress}%`,
              transition: done ? "width 400ms ease" : "width 180ms ease",
              background: accentColor,
            }}
          />
          <div className="ai-loading-bar-shimmer" />
        </div>
        <span className="ai-loading-bar-pct">{Math.round(progress)}%</span>
      </div>
      <p
        className="ai-loading-phrase"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 350ms ease" }}
      >
        {done ? "¡Listo!" : phrases[phraseIdx]}
      </p>
    </div>
  );
}

const API_BASE = "http://localhost:3000";

export default function Flashcards() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("idle");
  const [flashcards, setFlashcards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);
  const [loadingDone, setLoadingDone] = useState(false);

  const [showLimit, setShowLimit] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

  useEffect(() => {
    async function fetchPlan() {
      try {
        const token = getToken() || "";
        const res = await fetch(`${API_BASE}/auth/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserPlan(data?.plan || "free");
        }
      } catch { /* silencioso */ }
    }
    fetchPlan();
  }, []);

  async function generateFlashcards() {
    setPhase("loading");
    setLoadingDone(false);
    try {
      const token = getToken() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/flashcards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (
          res.status === 403 ||
          res.status === 429 ||
          errData.error === "EXERCISES_LIMIT_REACHED" ||
          errData.error === "LIMIT_REACHED"
        ) {
          setShowLimit(true);
          setPhase("idle");
          return;
        }
        throw new Error("Error generando flashcards");
      }

      const data = await res.json();
      // Marcar done para que la barra llegue al 100%, luego transicionar
      setLoadingDone(true);
      setTimeout(() => {
        setFlashcards(data.flashcards);
        setCurrent(0);
        setScore(0);
        setResults([]);
        setSelected(null);
        setAnswered(false);
        setPhase("playing");
      }, 500);
    } catch (err) {
      console.error(err);
      setPhase("idle");
    }
  }

  async function saveCorrectFlashcards(correctResults, allFlashcards) {
    try {
      const token = getToken() || "";
      const correctCards = correctResults
        .filter((r) => r.isCorrect)
        .map((r) => {
          const card = allFlashcards.find((c) => c.question === r.question);
          return { question: r.question, correctId: card?.correctId ?? r.correct };
        });
      if (correctCards.length === 0) return;
      await fetch(`${API_BASE}/folder/${folderId}/flashcards/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ flashcards: correctCards }),
      });
    } catch (err) {
      console.error("Error guardando flashcards correctas:", err);
    }
  }

  function handleSelect(optionId) {
    if (answered) return;
    const card = flashcards[current];
    const isCorrect = optionId === card.correctId;
    setSelected(optionId);
    setAnswered(true);
    if (isCorrect) setScore((s) => s + 1);
    setResults((prev) => [
      ...prev,
      { question: card.question, isCorrect, selected: optionId, correct: card.correctId },
    ]);
  }

  async function handleNext() {
    if (current + 1 >= flashcards.length) {
      await saveCorrectFlashcards(results, flashcards);
      setPhase("done");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function handleRestart() {
    setPhase("idle");
    setFlashcards([]);
    setCurrent(0);
    setScore(0);
    setResults([]);
    setSelected(null);
    setAnswered(false);
    setLoadingDone(false);
  }

  const card = flashcards[current];
  const progress = flashcards.length > 0 ? (current / flashcards.length) * 100 : 0;

  /* ── IDLE ── */
  if (phase === "idle") {
    return (
      <div className="fc-shell">
        {showLimit && <PlanLimitModal type="flashcards" plan={userPlan} onClose={() => setShowLimit(false)} />}
        <div className="fc-bg-orb fc-bg-orb--1" />
        <div className="fc-bg-orb fc-bg-orb--2" />
        <button className="fc-back" onClick={() => navigate(-1)}>← Volver a la carpeta</button>
        <div className="fc-idle-card">
          <div className="fc-idle-icon"><span>🧠</span></div>
          <h1 className="fc-idle-title">Flashcards</h1>
          <p className="fc-idle-desc">
            Generá 5 preguntas basadas en los temas que estudiaste en esta carpeta.
            Poné a prueba lo que aprendiste.
          </p>
          <button className="fc-start-btn" onClick={generateFlashcards}>Generar preguntas</button>
        </div>
      </div>
    );
  }

  /* ── LOADING ── */
  if (phase === "loading") {
    return (
      <div className="fc-shell">
        <div className="fc-bg-orb fc-bg-orb--1" />
        <div className="fc-bg-orb fc-bg-orb--2" />
        <div className="fc-loading">
          <LoadingBar
            phrases={PHRASES.generating}
            icon="🧠"
            accentColor="rgba(124,92,255,0.9)"
            done={loadingDone}
          />
        </div>
      </div>
    );
  }

  /* ── DONE ── */
  if (phase === "done") {
    const pct = Math.round((score / flashcards.length) * 100);
    const isGreat = pct >= 80;
    const isOk = pct >= 50;
    return (
      <div className="fc-shell">
        <div className="fc-bg-orb fc-bg-orb--1" />
        <div className="fc-bg-orb fc-bg-orb--2" />
        <div className="fc-done-card">
          <div className={`fc-done-emoji ${isGreat ? "fc-done-emoji--great" : isOk ? "fc-done-emoji--ok" : "fc-done-emoji--bad"}`}>
            {isGreat ? "🏆" : isOk ? "👍" : "💪"}
          </div>
          <h2 className="fc-done-title">{isGreat ? "¡Excelente!" : isOk ? "¡Bien!" : "¡Seguí practicando!"}</h2>
          <div className="fc-done-score">
            <span className="fc-done-num">{score}</span>
            <span className="fc-done-sep">/</span>
            <span className="fc-done-total">{flashcards.length}</span>
          </div>
          <div className="fc-done-bar-wrap">
            <div className={`fc-done-bar ${isGreat ? "fc-done-bar--great" : isOk ? "fc-done-bar--ok" : "fc-done-bar--bad"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="fc-done-pct">{pct}% correcto</p>
          <div className="fc-done-results">
            {results.map((r, i) => (
              <div key={i} className={`fc-done-row ${r.isCorrect ? "fc-done-row--ok" : "fc-done-row--bad"}`}>
                <span className="fc-done-row-icon">{r.isCorrect ? "✓" : "✗"}</span>
                <MathText className="fc-done-row-q">{r.question}</MathText>
              </div>
            ))}
          </div>
          <div className="fc-done-actions">
            <button className="fc-start-btn" onClick={generateFlashcards}>Nueva ronda</button>
            <button className="fc-back-btn-alt" onClick={() => navigate(-1)}>Volver a la carpeta</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PLAYING ── */
  return (
    <div className="fc-shell">
      {showLimit && <PlanLimitModal type="flashcards" plan={userPlan} onClose={() => setShowLimit(false)} />}
      <div className="fc-bg-orb fc-bg-orb--1" />
      <div className="fc-bg-orb fc-bg-orb--2" />
      <div className="fc-header">
        <button className="fc-back" onClick={() => navigate(-1)}>← Volver</button>
        <div className="fc-counter">{current + 1} / {flashcards.length}</div>
        <div className="fc-score-badge">⭐ {score}</div>
      </div>
      <div className="fc-progress-track">
        <div className="fc-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="fc-card">
        <MathText className="fc-question">{card.question}</MathText>
        <div className="fc-options">
          {card.options.map((opt) => {
            let cls = "fc-option";
            if (answered) {
              if (opt.id === card.correctId) cls += " fc-option--correct";
              else if (opt.id === selected) cls += " fc-option--wrong";
              else cls += " fc-option--dim";
            } else if (selected === opt.id) {
              cls += " fc-option--selected";
            }
            return (
              <button key={opt.id} className={cls} onClick={() => handleSelect(opt.id)} disabled={answered}>
                <span className="fc-opt-letter">{opt.id}</span>
                <MathText className="fc-opt-text">{opt.text}</MathText>
                {answered && opt.id === card.correctId && <span className="fc-opt-check">✓</span>}
                {answered && opt.id === selected && opt.id !== card.correctId && <span className="fc-opt-cross">✗</span>}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`fc-feedback ${selected === card.correctId ? "fc-feedback--correct" : "fc-feedback--wrong"}`}>
            <div className="fc-feedback-header">
              <span className="fc-feedback-icon">{selected === card.correctId ? "🎉" : "❌"}</span>
              <span className="fc-feedback-title">{selected === card.correctId ? "¡Correcto!" : "Incorrecto"}</span>
            </div>
            <MathText className="fc-feedback-explanation">{card.explanation}</MathText>
          </div>
        )}
        {answered && (
          <button className="fc-next-btn" onClick={handleNext}>
            {current + 1 >= flashcards.length ? "Ver resultados →" : "Siguiente →"}
          </button>
        )}
      </div>
    </div>
  );
}
