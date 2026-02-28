import { useState } from "react";
import { getToken } from "../auth";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "../styles/devquestions.css";

const API_BASE = "https://api.mathaps.online";

// Limpia y normaliza LaTeX antes de renderizar
function cleanLatex(text) {
  if (!text) return "";
  let t = text;

  // Reemplaza \[ ... \] por $$ ... $$
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);

  // Reemplaza \( ... \) por $ ... $
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);

  // Si hay \begin{...} suelto (no envuelto en $$ o $), lo envuelve en $$
  t = t.replace(/((?<!\$)\s*)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})/g, (match, pre, latex) => {
    // Si ya está dentro de $$ no lo toca
    return `${pre}$$${latex}$$`;
  });

  return t;
}

// Render math-aware text
function MathText({ children, className }) {
  const processed = cleanLatex(children ?? "");
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

// Score ring visual
function ScoreRing({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;
  const color =
    score >= 8 ? "#22c55e" : score >= 5 ? "#f97316" : "#ef4444";

  return (
    <div className="score-ring-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="score-ring-label">
        <span className="score-ring-num" style={{ color }}>{score}</span>
        <span className="score-ring-denom">/10</span>
      </div>
    </div>
  );
}

export default function DevQuestions() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("idle"); // idle | loading | answering | correcting | result | done
  const [question, setQuestion] = useState(null);       // { question, context }
  const [answer, setAnswer] = useState("");
  const [correction, setCorrection] = useState(null);   // { score, feedback, modelAnswer }
  const [sessionResults, setSessionResults] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState("");

  const MAX_QUESTIONS = 5;

  async function fetchQuestion() {
    setPhase("loading");
    setError("");
    setAnswer("");
    setCorrection(null);
    try {
      const token = getToken() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/dev-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ previousQuestions: sessionResults.map((r) => r.question) }),
      });
      if (!res.ok) throw new Error("Error generando pregunta");
      const data = await res.json();
      setQuestion(data);
      setQuestionCount((c) => c + 1);
      setPhase("answering");
    } catch (err) {
      console.error(err);
      setError("No se pudo generar la pregunta. Intentá de nuevo.");
      setPhase("idle");
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setPhase("correcting");
    setError("");
    try {
      const token = getToken() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/dev-questions/correct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question.question,
          context: question.context,
          answer,
        }),
      });
      if (!res.ok) throw new Error("Error corrigiendo respuesta");
      const data = await res.json(); // { score, feedback, modelAnswer }
      setCorrection(data);
      setSessionResults((prev) => [
        ...prev,
        { question: question.question, score: data.score, answer },
      ]);
      setPhase("result");
    } catch (err) {
      console.error(err);
      setError("No se pudo obtener la corrección. Intentá de nuevo.");
      setPhase("answering");
    }
  }

  function handleNext() {
    if (questionCount >= MAX_QUESTIONS) {
      setPhase("done");
    } else {
      fetchQuestion();
    }
  }

  function handleRestart() {
    setPhase("idle");
    setQuestion(null);
    setAnswer("");
    setCorrection(null);
    setSessionResults([]);
    setQuestionCount(0);
    setError("");
  }

  const avgScore =
    sessionResults.length > 0
      ? Math.round(
          (sessionResults.reduce((s, r) => s + r.score, 0) / sessionResults.length) * 10
        ) / 10
      : 0;

  /* ===================== IDLE ===================== */
  if (phase === "idle") {
    return (
      <div className="dq-shell">
        <div className="dq-bg-orb dq-bg-orb--1" />
        <div className="dq-bg-orb dq-bg-orb--2" />

        <button className="dq-back" onClick={() => navigate(-1)}>
          ← Volver a la carpeta
        </button>

        <div className="dq-idle-card">
          <div className="dq-idle-icon">✍️</div>
          <h1 className="dq-idle-title">Preguntas a Desarrollo</h1>
          <p className="dq-idle-desc">
            Respondé preguntas abiertas basadas en lo que estudiaste.
            La IA corregirá tu respuesta y te dará un puntaje del 1 al 10.
          </p>
          <div className="dq-idle-meta">
            <span className="dq-meta-chip">✅ {MAX_QUESTIONS} preguntas</span>
            <span className="dq-meta-chip">🤖 Corrección con IA</span>
            <span className="dq-meta-chip">📊 Puntaje 1-10</span>
          </div>
          {error && <p className="dq-error">{error}</p>}
          <button className="dq-start-btn" onClick={fetchQuestion}>
            Comenzar
          </button>
        </div>
      </div>
    );
  }

  /* ===================== LOADING ===================== */
  if (phase === "loading") {
    return (
      <div className="dq-shell">
        <div className="dq-bg-orb dq-bg-orb--1" />
        <div className="dq-bg-orb dq-bg-orb--2" />
        <div className="dq-loading">
          <div className="dq-spinner" />
          <p className="dq-loading-text">Generando pregunta...</p>
          <p className="dq-loading-sub">Analizando tus chats</p>
        </div>
      </div>
    );
  }

  /* ===================== CORRECTING ===================== */
  if (phase === "correcting") {
    return (
      <div className="dq-shell">
        <div className="dq-bg-orb dq-bg-orb--1" />
        <div className="dq-bg-orb dq-bg-orb--2" />
        <div className="dq-loading">
          <div className="dq-spinner dq-spinner--green" />
          <p className="dq-loading-text">Corrigiendo tu respuesta...</p>
          <p className="dq-loading-sub">La IA está evaluando tu desarrollo</p>
        </div>
      </div>
    );
  }

  /* ===================== DONE ===================== */
  if (phase === "done") {
    const isGreat = avgScore >= 8;
    const isOk = avgScore >= 5;

    return (
      <div className="dq-shell">
        <div className="dq-bg-orb dq-bg-orb--1" />
        <div className="dq-bg-orb dq-bg-orb--2" />

        <div className="dq-done-card">
          <div className={`dq-done-emoji ${isGreat ? "dq-done-emoji--great" : isOk ? "dq-done-emoji--ok" : "dq-done-emoji--bad"}`}>
            {isGreat ? "🏆" : isOk ? "👍" : "💪"}
          </div>
          <h2 className="dq-done-title">
            {isGreat ? "¡Excelente dominio!" : isOk ? "¡Buen trabajo!" : "¡Seguí practicando!"}
          </h2>

          <ScoreRing score={avgScore} />
          <p className="dq-done-sub">Promedio de {sessionResults.length} preguntas</p>

          <div className="dq-done-results">
            {sessionResults.map((r, i) => {
              const isGood = r.score >= 8;
              const isMid = r.score >= 5;
              return (
                <div
                  key={i}
                  className={`dq-done-row ${isGood ? "dq-done-row--great" : isMid ? "dq-done-row--ok" : "dq-done-row--bad"}`}
                >
                  <span className="dq-done-row-score">{r.score}/10</span>
                  <span className="dq-done-row-q">{r.question}</span>
                </div>
              );
            })}
          </div>

          <div className="dq-done-actions">
            <button className="dq-start-btn" onClick={handleRestart}>
              Nueva sesión
            </button>
            <button className="dq-back-alt" onClick={() => navigate(-1)}>
              Volver a la carpeta
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===================== ANSWERING / RESULT ===================== */
  return (
    <div className="dq-shell">
      <div className="dq-bg-orb dq-bg-orb--1" />
      <div className="dq-bg-orb dq-bg-orb--2" />

      {/* Header */}
      <div className="dq-header">
        <button className="dq-back" onClick={() => navigate(-1)}>← Volver</button>
        <div className="dq-counter">{questionCount} / {MAX_QUESTIONS}</div>
        <div className="dq-score-badge">
          {sessionResults.length > 0
            ? `⭐ ${(sessionResults.reduce((s, r) => s + r.score, 0) / sessionResults.length).toFixed(1)}`
            : "⭐ —"}
        </div>
      </div>

      {/* Progress bar */}
      <div className="dq-progress-track">
        <div
          className="dq-progress-fill"
          style={{ width: `${((questionCount - 1) / MAX_QUESTIONS) * 100}%` }}
        />
      </div>

      {/* Main card */}
      <div className="dq-card">
        {/* Question */}
        <div className="dq-question-box">
          <span className="dq-question-label">Pregunta {questionCount}</span>
          <MathText className="dq-question-text">{question?.question}</MathText>
        </div>

        {/* Context hint */}
        {question?.context && phase === "answering" && (
          <details className="dq-context">
            <summary className="dq-context-summary">💡 Ver contexto</summary>
            <MathText className="dq-context-body">{question.context}</MathText>
          </details>
        )}

        {/* Answer textarea - only when answering */}
        {phase === "answering" && (
          <div className="dq-answer-wrap">
            <label className="dq-answer-label">Tu respuesta</label>
            <textarea
              className="dq-answer-textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escribí tu respuesta detallada acá..."
              rows={6}
              autoFocus
            />
            {error && <p className="dq-error">{error}</p>}
            <button
              className="dq-submit-btn"
              onClick={submitAnswer}
              disabled={!answer.trim()}
            >
              Enviar respuesta →
            </button>
          </div>
        )}

        {/* Correction result */}
        {phase === "result" && correction && (
          <div className="dq-result">
            {/* Score */}
            <div className="dq-result-score-row">
              <ScoreRing score={correction.score} />
              <div className="dq-result-verdict">
                <span className={`dq-verdict-badge ${
                  correction.score >= 8 ? "dq-verdict--great"
                  : correction.score >= 5 ? "dq-verdict--ok"
                  : "dq-verdict--bad"
                }`}>
                  {correction.score >= 8 ? "🎉 Excelente" : correction.score >= 5 ? "👍 Bien" : "📖 Revisar"}
                </span>
              </div>
            </div>

            {/* Your answer */}
            <div className="dq-result-section">
              <span className="dq-result-section-label">Tu respuesta</span>
              <div className="dq-result-answer">{answer}</div>
            </div>

            {/* Feedback */}
            <div className="dq-result-section">
              <span className="dq-result-section-label">Corrección de la IA</span>
              <MathText className="dq-result-feedback">{correction.feedback}</MathText>
            </div>

            {/* Model answer */}
            {correction.modelAnswer && (
              <div className="dq-result-section">
                <span className="dq-result-section-label">Respuesta modelo</span>
                <MathText className="dq-result-model-answer">{correction.modelAnswer}</MathText>
              </div>
            )}

            {/* Next button */}
            <button className="dq-next-btn" onClick={handleNext}>
              {questionCount >= MAX_QUESTIONS ? "Ver resultados finales →" : "Siguiente pregunta →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
