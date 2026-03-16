import { useState } from "react";
import { getToken } from "../auth";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMath } from "../utils/mathUtils";
import "katex/dist/katex.min.css";
import "../styles/flashcards.css";

// Componente auxiliar: renderiza texto que puede contener LaTeX inline o en bloque
function MathText({ children, className }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Evitar que ReactMarkdown envuelva en <p> dentro de elementos inline
          p: ({ children }) => <span>{children}</span>,
        }}
      >
        {normalizeMath(children ?? "")}
      </ReactMarkdown>
    </span>
  );
}

const API_BASE = "http://localhost:3000";

export default function Flashcards() {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("idle"); // idle | loading | playing | done
  const [flashcards, setFlashcards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);      // opción elegida
  const [answered, setAnswered] = useState(false);     // si ya respondió
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);          // historial de respuestas

  async function generateFlashcards() {
    setPhase("loading");
    try {
      const token = getToken() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/flashcards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error generando flashcards");
      const data = await res.json();

      setFlashcards(data.flashcards);
      setCurrent(0);
      setScore(0);
      setResults([]);
      setSelected(null);
      setAnswered(false);
      setPhase("playing");
    } catch (err) {
      console.error(err);
      setPhase("idle");
    }
  }

  // Envía al backend las flashcards que el usuario respondió correctamente
  async function saveCorrectFlashcards(correctResults, allFlashcards) {
    try {
      const token = getToken() || "";

      // Armamos el array con la info que espera el endpoint
      const correctCards = correctResults
        .filter((r) => r.isCorrect)
        .map((r) => {
          const card = allFlashcards.find((c) => c.question === r.question);
          return {
            question: r.question,
            correctId: card?.correctId ?? r.correct,
          };
        });

      // Si no hubo ninguna correcta no hace falta llamar al endpoint
      if (correctCards.length === 0) return;

      await fetch(`${API_BASE}/folder/${folderId}/flashcards/correct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flashcards: correctCards }),
      });
    } catch (err) {
      // No bloqueamos al usuario si falla el guardado
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
      // Calculamos el listado final de resultados incluyendo la pregunta actual
      const finalResults = [
        ...results,
      ];
      await saveCorrectFlashcards(finalResults, flashcards);
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
  }

  const card = flashcards[current];
  const progress = flashcards.length > 0 ? ((current) / flashcards.length) * 100 : 0;

  /* ===================== PANTALLA: IDLE ===================== */
  if (phase === "idle") {
    return (
      <div className="fc-shell">
        <div className="fc-bg-orb fc-bg-orb--1" />
        <div className="fc-bg-orb fc-bg-orb--2" />

        <button className="fc-back" onClick={() => navigate(-1)}>
          ← Volver a la carpeta
        </button>

        <div className="fc-idle-card">
          <div className="fc-idle-icon">
            <span>🧠</span>
          </div>
          <h1 className="fc-idle-title">Flashcards</h1>
          <p className="fc-idle-desc">
            Generá 5 preguntas basadas en los temas que estudiaste en esta carpeta.
            Poné a prueba lo que aprendiste.
          </p>
          <button className="fc-start-btn" onClick={generateFlashcards}>
            Generar preguntas
          </button>
        </div>
      </div>
    );
  }

  /* ===================== PANTALLA: LOADING ===================== */
  if (phase === "loading") {
    return (
      <div className="fc-shell">
        <div className="fc-bg-orb fc-bg-orb--1" />
        <div className="fc-bg-orb fc-bg-orb--2" />
        <div className="fc-loading">
          <div className="fc-spinner" />
          <p className="fc-loading-text">Generando preguntas...</p>
          <p className="fc-loading-sub">Analizando tus chats</p>
        </div>
      </div>
    );
  }

  /* ===================== PANTALLA: DONE ===================== */
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

          <h2 className="fc-done-title">
            {isGreat ? "¡Excelente!" : isOk ? "¡Bien!" : "¡Seguí practicando!"}
          </h2>

          <div className="fc-done-score">
            <span className="fc-done-num">{score}</span>
            <span className="fc-done-sep">/</span>
            <span className="fc-done-total">{flashcards.length}</span>
          </div>

          <div className="fc-done-bar-wrap">
            <div
              className={`fc-done-bar ${isGreat ? "fc-done-bar--great" : isOk ? "fc-done-bar--ok" : "fc-done-bar--bad"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="fc-done-pct">{pct}% correcto</p>

          {/* Resumen de respuestas */}
          <div className="fc-done-results">
            {results.map((r, i) => (
              <div key={i} className={`fc-done-row ${r.isCorrect ? "fc-done-row--ok" : "fc-done-row--bad"}`}>
                <span className="fc-done-row-icon">{r.isCorrect ? "✓" : "✗"}</span>
                <MathText className="fc-done-row-q">{r.question}</MathText>
              </div>
            ))}
          </div>

          <div className="fc-done-actions">
            <button className="fc-start-btn" onClick={generateFlashcards}>
              Nueva ronda
            </button>
            <button className="fc-back-btn-alt" onClick={() => navigate(-1)}>
              Volver a la carpeta
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===================== PANTALLA: PLAYING ===================== */
  return (
    <div className="fc-shell">
      <div className="fc-bg-orb fc-bg-orb--1" />
      <div className="fc-bg-orb fc-bg-orb--2" />

      {/* Header */}
      <div className="fc-header">
        <button className="fc-back" onClick={() => navigate(-1)}>← Volver</button>
        <div className="fc-counter">{current + 1} / {flashcards.length}</div>
        <div className="fc-score-badge">⭐ {score}</div>
      </div>

      {/* Barra de progreso */}
      <div className="fc-progress-track">
        <div className="fc-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Card de pregunta */}
      <div className="fc-card">
        <MathText className="fc-question">{card.question}</MathText>

        {/* Opciones */}
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
              <button
                key={opt.id}
                className={cls}
                onClick={() => handleSelect(opt.id)}
                disabled={answered}
              >
                <span className="fc-opt-letter">{opt.id}</span>
                <MathText className="fc-opt-text">{opt.text}</MathText>
                {answered && opt.id === card.correctId && (
                  <span className="fc-opt-check">✓</span>
                )}
                {answered && opt.id === selected && opt.id !== card.correctId && (
                  <span className="fc-opt-cross">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback + explicación */}
        {answered && (
          <div className={`fc-feedback ${selected === card.correctId ? "fc-feedback--correct" : "fc-feedback--wrong"}`}>
            <div className="fc-feedback-header">
              <span className="fc-feedback-icon">
                {selected === card.correctId ? "🎉" : "❌"}
              </span>
              <span className="fc-feedback-title">
                {selected === card.correctId ? "¡Correcto!" : "Incorrecto"}
              </span>
            </div>
            <MathText className="fc-feedback-explanation">{card.explanation}</MathText>
          </div>
        )}

        {/* Botón siguiente */}
        {answered && (
          <button className="fc-next-btn" onClick={handleNext}>
            {current + 1 >= flashcards.length ? "Ver resultados →" : "Siguiente →"}
          </button>
        )}
      </div>
    </div>
  );
}
