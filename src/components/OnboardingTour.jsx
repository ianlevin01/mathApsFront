import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import onboardingSteps from "../utils/OnboardingSteps";

const STORAGE_KEY = "mathaps_onboarding_seen_v1";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTooltipPosition(rect, placement = "bottom") {
  const tooltipWidth = 340;
  const tooltipHeight = 180;
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  if (placement === "top") {
    top = rect.top - tooltipHeight - gap;
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (top < 12) top = rect.bottom + gap;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tooltipHeight / 2;
    left = rect.left - tooltipWidth - gap;
    if (left < 12) left = rect.right + gap;
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - tooltipHeight / 2;
    left = rect.right + gap;
    if (left + tooltipWidth > vw - 12) left = rect.left - tooltipWidth - gap;
  } else {
    top = rect.bottom + gap;
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (top + tooltipHeight > vh - 12) top = rect.top - tooltipHeight - gap;
  }

  left = clamp(left, 12, vw - tooltipWidth - 12);
  top = clamp(top, 12, vh - tooltipHeight - 12);

  return { top, left, width: tooltipWidth };
}

export default function OnboardingTour({
  autoStart = true,
  forceOpen = false,
  onFinish,
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [routeReady, setRouteReady] = useState(true);

  // Estado del fade de transición entre páginas
  // "idle" | "out" | "in"
  const [fadeState, setFadeState] = useState("idle");

  const navigatingRef = useRef(false);
  const routeReadyTimer = useRef(null);

  const currentStep = onboardingSteps[stepIndex] || null;

  const progressText = useMemo(
    () => `${stepIndex + 1} / ${onboardingSteps.length}`,
    [stepIndex]
  );

  // ── Arrancar el tour ──────────────────────────────────────────────────────
  useEffect(() => {
    if (forceOpen) { setIsOpen(true); return; }
    if (!autoStart) return;
    const alreadySeen = localStorage.getItem(STORAGE_KEY);
    if (!alreadySeen) {
      const t = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [autoStart, forceOpen]);

  // ── Navegar al step con transición suave si cambia de ruta ───────────────
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Sin navegación: listo de inmediato
    if (!currentStep.navigateTo) {
      setRouteReady(true);
      return;
    }

    // Si ya estamos en la ruta destino, no hacer fade
    if (window.location.pathname === currentStep.navigateTo) {
      setRouteReady(false);
      clearTimeout(routeReadyTimer.current);
      routeReadyTimer.current = setTimeout(() => setRouteReady(true), 450);
      return () => clearTimeout(routeReadyTimer.current);
    }

    // Evitar doble ejecución
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    setRouteReady(false);
    setTargetRect(null);

    // Fase 1: fade-out (200ms)
    setFadeState("out");

    const t1 = setTimeout(() => {
      // Fase 2: navegar
      navigate(currentStep.navigateTo);

      // Fase 3: esperar que el DOM monte (450ms) y arrancar fade-in
      const t2 = setTimeout(() => {
        setFadeState("in");

        // Fase 4: terminar fade-in (280ms) y mostrar el tooltip
        const t3 = setTimeout(() => {
          setFadeState("idle");
          setRouteReady(true);
          navigatingRef.current = false;
        }, 280);

        routeReadyTimer.current = t3;
      }, 450);

      routeReadyTimer.current = t2;
    }, 200);

    routeReadyTimer.current = t1;

    return () => clearTimeout(routeReadyTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex]);

  // ── Calcular rect del elemento target ────────────────────────────────────
  useLayoutEffect(() => {
    if (!isOpen || !currentStep || !routeReady) return;

    function updateRect() {
      const el = document.querySelector(currentStep.target);
      if (!el) { setTargetRect(null); return; }
      setTargetRect(el.getBoundingClientRect());
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, currentStep, routeReady]);

  // ── Bloquear scroll del body mientras está abierto ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  // ── Si el target no existe tras esperar, saltar al siguiente ──────────────
  useEffect(() => {
    if (!isOpen || !currentStep || !routeReady) return;
    const el = document.querySelector(currentStep.target);
    if (!el) goNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep, routeReady]);

  // ── Helpers de navegación ─────────────────────────────────────────────────
  function finishTour(markSeen = true) {
    setIsOpen(false);
    setFadeState("idle");
    if (markSeen) localStorage.setItem(STORAGE_KEY, "true");
    if (typeof onFinish === "function") onFinish();
  }

  function goNext() {
    if (stepIndex >= onboardingSteps.length - 1) { finishTour(true); return; }
    let next = stepIndex + 1;
    while (next < onboardingSteps.length) {
      const step = onboardingSteps[next];
      if (step.navigateTo || document.querySelector(step.target)) {
        navigatingRef.current = false;
        setStepIndex(next);
        return;
      }
      next++;
    }
    finishTour(true);
  }

  function goPrev() {
    if (stepIndex <= 0) return;
    let prev = stepIndex - 1;
    while (prev >= 0) {
      const step = onboardingSteps[prev];
      if (step.navigateTo || document.querySelector(step.target)) {
        navigatingRef.current = false;
        setStepIndex(prev);
        return;
      }
      prev--;
    }
  }

  // ── Overlay de fade entre páginas (siempre renderiza si hay fade activo) ──
  const showFade = fadeState !== "idle";
  const fadeOpacity = fadeState === "out" ? 1 : fadeState === "in" ? 0 : 0;
  const fadeDuration = fadeState === "out" ? "200ms" : "280ms";

  const fadeEl = showFade ? createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a12",
      zIndex: 999999,
      opacity: fadeOpacity,
      transition: `opacity ${fadeDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
      pointerEvents: "all",
    }} />,
    document.body
  ) : null;

  // Si el tour no está visible (esperando ruta, etc.) solo mostrar el fade
  if (!isOpen || !currentStep || !routeReady || !targetRect) {
    return fadeEl || null;
  }

  // ── Calcular posiciones ───────────────────────────────────────────────────
  const pad = 10;
  const rect = {
    top:    Math.max(targetRect.top    - pad, 0),
    left:   Math.max(targetRect.left   - pad, 0),
    width:  targetRect.width  + pad * 2,
    height: targetRect.height + pad * 2,
    right:  targetRect.right  + pad,
    bottom: targetRect.bottom + pad,
  };

  const tooltip = getTooltipPosition(rect, currentStep.preferredPlacement);

  return createPortal(
    <>
      {/* Fade de transición (encima de todo si está activo) */}
      {showFade && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#0a0a12",
          zIndex: 999999,
          opacity: fadeOpacity,
          transition: `opacity ${fadeDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
          pointerEvents: "all",
        }} />
      )}

      {/* Overlay superior */}
      <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:rect.top, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay izquierdo */}
      <div style={{ position:"fixed", top:rect.top, left:0, width:rect.left, height:rect.height, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay derecho */}
      <div style={{ position:"fixed", top:rect.top, left:rect.left+rect.width, width:`calc(100vw - ${rect.left+rect.width}px)`, height:rect.height, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay inferior */}
      <div style={{ position:"fixed", top:rect.top+rect.height, left:0, width:"100vw", height:`calc(100vh - ${rect.top+rect.height}px)`, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />

      {/* Highlight del elemento — con transición suave entre steps */}
      <div style={{
        position: "fixed",
        top: rect.top, left: rect.left, width: rect.width, height: rect.height,
        borderRadius: "14px",
        border: "2px solid rgba(124,92,255,0.95)",
        boxShadow: "0 0 0 3px rgba(124,92,255,0.18), 0 0 30px rgba(124,92,255,0.38)",
        zIndex: 99999,
        pointerEvents: "none",
        transition: [
          "top 350ms cubic-bezier(0.34,1.2,0.64,1)",
          "left 350ms cubic-bezier(0.34,1.2,0.64,1)",
          "width 350ms cubic-bezier(0.34,1.2,0.64,1)",
          "height 350ms cubic-bezier(0.34,1.2,0.64,1)",
        ].join(", "),
      }} />

      {/* Tooltip con animación de entrada */}
      <div style={{
        position: "fixed",
        top: tooltip.top, left: tooltip.left, width: tooltip.width,
        zIndex: 100000,
        borderRadius: "18px",
        background: "linear-gradient(180deg, rgba(15,15,24,0.98) 0%, rgba(24,20,38,0.98) 100%)",
        border: "1px solid rgba(124,92,255,0.28)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
        padding: "18px 18px 16px 18px",
        color: "#f5f7ff",
        backdropFilter: "blur(10px)",
        animation: "tourTooltipIn 240ms cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <style>{`
          @keyframes tourTooltipIn {
            from { opacity: 0; transform: translateY(10px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
        `}</style>

        <div style={{ fontSize:"0.8rem", opacity:0.72, marginBottom:8, fontWeight:600, letterSpacing:"0.02em" }}>
          Tutorial inicial · {progressText}
        </div>
        <div style={{ fontSize:"1.05rem", fontWeight:700, marginBottom:8 }}>
          {currentStep.title}
        </div>
        <div style={{ fontSize:"0.94rem", lineHeight:1.45, opacity:0.92, marginBottom:16 }}>
          {currentStep.description}
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
          <button
            type="button"
            onClick={() => finishTour(true)}
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Omitir
          </button>
          <div style={{ display:"flex", gap:10 }}>
            <button
              type="button"
              onClick={goPrev}
              disabled={stepIndex === 0}
              style={{
                background: stepIndex === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                color: stepIndex === 0 ? "rgba(255,255,255,0.35)" : "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={goNext}
              style={{
                background: "linear-gradient(90deg,#7c5cff 0%,#9b7bff 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(124,92,255,0.35)",
              }}
            >
              {stepIndex === onboardingSteps.length - 1 ? "Terminar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
