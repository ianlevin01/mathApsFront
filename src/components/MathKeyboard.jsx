import { useState, useRef, useEffect } from "react";

// ── Símbolos por categoría ──────────────────────────────────────────────────
const CATEGORIES = [
  {
    label: "Popular",
    symbols: [
      { display: "x²",  insert: "x^2" },
      { display: "√",   insert: "√" },
      { display: "π",   insert: "π" },
      { display: "∞",   insert: "∞" },
      { display: "±",   insert: "±" },
      { display: "≠",   insert: "≠" },
      { display: "≤",   insert: "≤" },
      { display: "≥",   insert: "≥" },
      { display: "×",   insert: "×" },
      { display: "÷",   insert: "÷" },
      { display: "∑",   insert: "∑" },
      { display: "∫",   insert: "∫" },
      { display: "θ",   insert: "θ" },
      { display: "α",   insert: "α" },
      { display: "β",   insert: "β" },
      { display: "Δ",   insert: "Δ" },
    ],
  },
  {
    label: "Álgebra",
    symbols: [
      { display: "xⁿ",  insert: "x^n" },
      { display: "x₁",  insert: "x₁" },
      { display: "x₂",  insert: "x₂" },
      { display: "|x|", insert: "|x|" },
      { display: "∝",   insert: "∝" },
      { display: "≈",   insert: "≈" },
      { display: "≡",   insert: "≡" },
      { display: "∈",   insert: "∈" },
      { display: "∉",   insert: "∉" },
      { display: "⊂",   insert: "⊂" },
      { display: "∪",   insert: "∪" },
      { display: "∩",   insert: "∩" },
      { display: "∅",   insert: "∅" },
      { display: "ℝ",   insert: "ℝ" },
      { display: "ℤ",   insert: "ℤ" },
      { display: "ℕ",   insert: "ℕ" },
    ],
  },
  {
    label: "Cálculo",
    symbols: [
      { display: "∂",   insert: "∂" },
      { display: "∇",   insert: "∇" },
      { display: "lim", insert: "lim" },
      { display: "d/dx",insert: "d/dx" },
      { display: "∫∫",  insert: "∫∫" },
      { display: "∮",   insert: "∮" },
      { display: "→∞",  insert: "→∞" },
      { display: "eˣ",  insert: "e^x" },
      { display: "ln",  insert: "ln" },
      { display: "log", insert: "log" },
      { display: "sin", insert: "sin" },
      { display: "cos", insert: "cos" },
      { display: "tan", insert: "tan" },
      { display: "⁻¹",  insert: "^(-1)" },
      { display: "!",   insert: "!" },
      { display: "nCk", insert: "C(n,k)" },
    ],
  },
  {
    label: "Griegos",
    symbols: [
      { display: "α", insert: "α" },
      { display: "β", insert: "β" },
      { display: "γ", insert: "γ" },
      { display: "δ", insert: "δ" },
      { display: "ε", insert: "ε" },
      { display: "ζ", insert: "ζ" },
      { display: "η", insert: "η" },
      { display: "θ", insert: "θ" },
      { display: "λ", insert: "λ" },
      { display: "μ", insert: "μ" },
      { display: "ξ", insert: "ξ" },
      { display: "ρ", insert: "ρ" },
      { display: "σ", insert: "σ" },
      { display: "φ", insert: "φ" },
      { display: "ψ", insert: "ψ" },
      { display: "ω", insert: "ω" },
    ],
  },
];

// ── Componente principal ────────────────────────────────────────────────────
export default function MathKeyboard({ textareaRef, onInsert }) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState(0);
  const [flash, setFlash]   = useState(null);
  const popupRef            = useRef(null);
  const btnRef              = useRef(null);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const insertSymbol = (sym) => {
    setFlash(sym.insert);
    setTimeout(() => setFlash(null), 600);

    if (onInsert) {
      onInsert(sym.insert);
      return;
    }

    // Fallback: insertar directo en el textarea ref
    const ta = textareaRef?.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end   = ta.selectionEnd   ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after  = ta.value.slice(end);
    const newVal = before + sym.insert + after;

    // dispara onChange de React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    ).set;
    nativeInputValueSetter.call(ta, newVal);
    ta.dispatchEvent(new Event("input", { bubbles: true }));

    // reposicionar cursor
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + sym.insert.length;
    });
  };

  return (
    <>
      {/* Estilos inline para no depender de un archivo CSS externo */}
      <style>{`
        .mk-wrap { position: relative; display: inline-flex; }

        /* ── Botón trigger ── */
        .mk-trigger {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 5px 8px;
          border-radius: 8px;
          transition: all 150ms ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .mk-trigger:hover,
        .mk-trigger.active {
          background: rgba(124,92,255,0.12);
          color: rgba(255,255,255,0.85);
        }
        .mk-trigger svg { flex-shrink: 0; }

        /* ── Popup ── */
        .mk-popup {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          width: 320px;
          background: linear-gradient(180deg, rgba(22,22,32,0.99), rgba(13,13,18,0.99));
          border: 1px solid rgba(124,92,255,0.3);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,92,255,0.08);
          z-index: 9999;
          overflow: hidden;
          animation: mkPopIn 180ms cubic-bezier(0.34,1.4,0.64,1);
          transform-origin: bottom left;
        }
        @keyframes mkPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }

        /* ── Header + tabs ── */
        .mk-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px 0;
        }
        .mk-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: rgba(124,92,255,0.8);
          text-transform: uppercase;
        }
        .mk-close {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          display: grid; place-items: center;
          font-size: 11px;
          transition: all 140ms ease;
        }
        .mk-close:hover { background: rgba(255,70,70,0.2); color: #fff; border-color: rgba(255,70,70,0.4); }

        .mk-tabs {
          display: flex;
          gap: 2px;
          padding: 8px 10px 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .mk-tabs::-webkit-scrollbar { display: none; }
        .mk-tab {
          padding: 5px 11px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          border: none;
          background: transparent;
          font-family: inherit;
          white-space: nowrap;
          transition: all 140ms ease;
          flex-shrink: 0;
        }
        .mk-tab:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.05); }
        .mk-tab.active {
          background: rgba(124,92,255,0.18);
          color: rgba(180,150,255,0.95);
          border: 1px solid rgba(124,92,255,0.3);
        }

        /* ── Grid de símbolos ── */
        .mk-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          padding: 10px;
          max-height: 220px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(124,92,255,0.3) transparent;
        }
        .mk-grid::-webkit-scrollbar { width: 3px; }
        .mk-grid::-webkit-scrollbar-thumb { background: rgba(124,92,255,0.35); border-radius: 999px; }

        .mk-sym {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          color: rgba(255,255,255,0.85);
          font-size: 15px;
          font-family: 'Georgia', 'Times New Roman', serif;
          cursor: pointer;
          padding: 9px 4px;
          text-align: center;
          transition: all 130ms ease;
          user-select: none;
          line-height: 1;
        }
        .mk-sym:hover {
          background: rgba(124,92,255,0.18);
          border-color: rgba(124,92,255,0.4);
          color: #fff;
          transform: scale(1.08);
          box-shadow: 0 3px 10px rgba(124,92,255,0.25);
        }
        .mk-sym:active { transform: scale(0.95); }
        .mk-sym.flashed {
          background: rgba(124,92,255,0.35);
          border-color: rgba(124,92,255,0.7);
          color: #fff;
        }

        /* ── Footer hint ── */
        .mk-footer {
          padding: 7px 12px 10px;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          border-top: 1px solid rgba(255,255,255,0.05);
          text-align: center;
          letter-spacing: 0.02em;
        }

        /* Mobile: anclar al centro en pantallas pequeñas */
        @media (max-width: 480px) {
          .mk-popup {
            left: 50%;
            transform-origin: bottom center;
            translate: -50% 0;
            width: 94vw;
          }
          @keyframes mkPopIn {
            from { opacity: 0; transform: scale(0.92) translateY(8px); translate: -50% 0; }
            to   { opacity: 1; transform: scale(1)    translateY(0);   translate: -50% 0; }
          }
        }
      `}</style>

      <div className="mk-wrap">
        {/* Botón trigger — mismo estilo que .btn-toolbar */}
        <button
          ref={btnRef}
          className={`mk-trigger${open ? " active" : ""}`}
          onClick={() => setOpen((v) => !v)}
          title="Teclado matemático"
          type="button"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h10M4 17h7"/>
            <path d="M19 12l-3 5h6l-3-5z"/>
          </svg>
          Σ Símbolos
        </button>

        {/* Popup */}
        {open && (
          <div className="mk-popup" ref={popupRef}>
            <div className="mk-header">
              <span className="mk-title">Teclado matemático</span>
              <button className="mk-close" onClick={() => setOpen(false)} type="button">✕</button>
            </div>

            <div className="mk-tabs">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  className={`mk-tab${tab === i ? " active" : ""}`}
                  onClick={() => setTab(i)}
                  type="button"
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="mk-grid">
              {CATEGORIES[tab].symbols.map((sym) => (
                <button
                  key={sym.insert}
                  className={`mk-sym${flash === sym.insert ? " flashed" : ""}`}
                  onClick={() => insertSymbol(sym)}
                  type="button"
                  title={sym.insert}
                >
                  {sym.display}
                </button>
              ))}
            </div>

            <div className="mk-footer">
              Tocá un símbolo para insertarlo en el input
            </div>
          </div>
        )}
      </div>
    </>
  );
}
