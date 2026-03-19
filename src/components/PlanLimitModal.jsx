import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

const LIMIT_COPY = {
  messages: {
    icon: "💬",
    title: "Límite de mensajes alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste tus mensajes diarios del plan Free. Mejorá tu plan para seguir resolviendo problemas sin límites."
        : "Agotaste tus mensajes diarios. Mejorar al plan Pro te da hasta 150 mensajes por día.",
    perks: ["Más mensajes diarios", "Acceso a modelos avanzados", "Sin interrupciones"],
  },
  images: {
    icon: "📷",
    title: "Límite de imágenes alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste el límite de imágenes del plan Free. Mejorá tu plan para seguir adjuntando fotos."
        : "Agotaste el límite de imágenes de hoy. El plan Pro incluye hasta 40 imágenes por día.",
    perks: ["Más imágenes por día", "Análisis de ejercicios con foto", "Sin límites diarios"],
  },
  flashcards: {
    icon: "🧠",
    title: "Límite de ejercicios alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste los ejercicios diarios del plan Free. Mejorá tu plan para seguir practicando."
        : "Agotaste los ejercicios de hoy. El plan Pro incluye hasta 40 ejercicios por día.",
    perks: ["Más flashcards por día", "Acceso ilimitado a la práctica", "Progreso sin cortes"],
  },
  devquestions: {
    icon: "✍️",
    title: "Límite de ejercicios alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Agotaste los ejercicios diarios del plan Free. Mejorá tu plan para seguir practicando."
        : "Agotaste los ejercicios de hoy. El plan Pro incluye hasta 40 ejercicios por día.",
    perks: ["Más preguntas por día", "Corrección ilimitada con IA", "Feedback detallado"],
  },
  folders: {
    icon: "📁",
    title: "Límite de carpetas alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Tu plan Free permite hasta 3 carpetas. Mejorá tu plan para organizar mejor tus estudios."
        : "Tu plan Plus permite hasta 6 carpetas. Mejorar a Pro te da carpetas ilimitadas.",
    perks: ["Carpetas ilimitadas", "Más archivos por carpeta", "Organización sin límites"],
  },
  files: {
    icon: "📎",
    title: "Límite de archivos alcanzado",
    desc: (plan) =>
      plan === "free"
        ? "Alcanzaste el límite de archivos por carpeta de tu plan. Mejorá tu plan para subir más."
        : "Alcanzaste el límite de archivos por carpeta. El plan Pro permite hasta 10 archivos.",
    perks: ["Más archivos por carpeta", "PDFs de mayor tamaño", "Acceso prioritario"],
  },
};

const PLAN_NEXT = {
  free: { label: "Plus o Pro", price: "desde $5.99/mes" },
  plus: { label: "Pro",        price: "$14.99/mes" },
  pro:  { label: null,         price: null },
};

export default function PlanLimitModal({ type, plan = "free", onClose }) {
  const navigate = useNavigate();
  const copy = LIMIT_COPY[type] || LIMIT_COPY.messages;
  const next = PLAN_NEXT[plan] || PLAN_NEXT.free;

  return createPortal(
    <>
      <style>{`
        .plm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.70);
          backdrop-filter: blur(12px);
          animation: plmFadeIn 200ms ease;
        }

        @keyframes plmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .plm-modal {
          position: relative;
          width: min(440px, 100%);
          background: linear-gradient(160deg, rgba(22, 20, 36, 0.98), rgba(14, 12, 22, 0.99));
          border: 1px solid rgba(124, 92, 255, 0.25);
          border-radius: 24px;
          padding: 36px 32px 28px;
          box-shadow:
            0 0 0 1px rgba(124, 92, 255, 0.08),
            0 32px 80px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(124, 92, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          animation: plmSlideUp 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        @keyframes plmSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Orbe de fondo decorativo */
        .plm-modal__orb {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 92, 255, 0.18), transparent 70%);
          filter: blur(40px);
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .plm-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 150ms ease;
          z-index: 1;
        }

        .plm-close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .plm-icon-wrap {
          position: relative;
          z-index: 1;
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(80, 40, 220, 0.15));
          border: 1px solid rgba(124, 92, 255, 0.30);
          display: grid;
          place-items: center;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(124, 92, 255, 0.2);
          animation: plmIconPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both;
        }

        @keyframes plmIconPop {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .plm-title {
          position: relative;
          z-index: 1;
          font-size: 20px;
          font-weight: 900;
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .plm-desc {
          position: relative;
          z-index: 1;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.60);
          line-height: 1.6;
          margin: 0;
          max-width: 340px;
        }

        /* Perks */
        .plm-perks {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 14px 16px;
        }

        .plm-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 500;
          text-align: left;
        }

        .plm-perk__dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: grid;
          place-items: center;
          font-size: 10px;
          flex-shrink: 0;
          color: #fff;
          font-weight: 900;
        }

        /* Upgrade box */
        .plm-upgrade-box {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(135deg, rgba(124, 92, 255, 0.15), rgba(80, 40, 220, 0.10));
          border: 1px solid rgba(124, 92, 255, 0.30);
          border-radius: 14px;
          padding: 14px 16px;
          overflow: hidden;
        }

        .plm-upgrade-box__glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(124, 92, 255, 0.08), transparent);
          pointer-events: none;
        }

        .plm-upgrade-box__left {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 1;
        }

        .plm-upgrade-box__bolt {
          font-size: 22px;
          filter: drop-shadow(0 0 8px rgba(124, 92, 255, 0.6));
        }

        .plm-upgrade-box__info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          text-align: left;
        }

        .plm-upgrade-box__plan {
          font-size: 14px;
          font-weight: 800;
          color: #fff;
        }

        .plm-upgrade-box__price {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.50);
          font-weight: 500;
        }

        .plm-upgrade-box__arrow {
          font-size: 18px;
          color: rgba(124, 92, 255, 0.8);
          z-index: 1;
        }

        /* Divider */
        .plm-divider {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 1px;
          background: rgba(255, 255, 255, 0.07);
        }

        /* Actions */
        .plm-actions {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .plm-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 180ms ease;
          font-family: inherit;
          letter-spacing: 0.1px;
        }

        .plm-btn--primary {
          background: linear-gradient(135deg, #7c5cff, #5a3ee0);
          color: #fff;
          box-shadow: 0 6px 20px rgba(124, 92, 255, 0.35);
        }

        .plm-btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(124, 92, 255, 0.50);
          filter: brightness(1.08);
        }

        .plm-btn--primary:active { transform: scale(0.97); }

        .plm-btn--ghost {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .plm-btn--ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.75);
        }

        @media (max-width: 480px) {
          .plm-modal { padding: 28px 20px 22px; }
          .plm-title { font-size: 18px; }
        }
      `}</style>

      <div className="plm-overlay" onClick={onClose}>
        <div className="plm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="plm-modal__orb" />

          <button className="plm-close" onClick={onClose}>✕</button>

          <div className="plm-icon-wrap">{copy.icon}</div>

          <h2 className="plm-title">{copy.title}</h2>
          <p className="plm-desc">{copy.desc(plan)}</p>

          {copy.perks && next.label && (
            <div className="plm-perks">
              {copy.perks.map((perk) => (
                <div key={perk} className="plm-perk">
                  <div className="plm-perk__dot">✓</div>
                  {perk}
                </div>
              ))}
            </div>
          )}

          {next.label && (
            <div className="plm-upgrade-box">
              <div className="plm-upgrade-box__glow" />
              <div className="plm-upgrade-box__left">
                <span className="plm-upgrade-box__bolt">⚡</span>
                <div className="plm-upgrade-box__info">
                  <span className="plm-upgrade-box__plan">Plan {next.label}</span>
                  <span className="plm-upgrade-box__price">{next.price}</span>
                </div>
              </div>
              <span className="plm-upgrade-box__arrow">→</span>
            </div>
          )}

          <div className="plm-divider" />

          <div className="plm-actions">
            {next.label && (
              <button
                className="plm-btn plm-btn--primary"
                onClick={() => { onClose(); navigate("/plans"); }}
              >
                ⚡ Ver planes y mejorar
              </button>
            )}
            <button className="plm-btn plm-btn--ghost" onClick={onClose}>
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
