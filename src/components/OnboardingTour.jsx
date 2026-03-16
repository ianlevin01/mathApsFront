import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import onboardingSteps from "../utils/OnboardingSteps";

const STORAGE_KEY = "mathaps_onboarding_seen_v1";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTooltipPosition(rect, placement = "bottom") {
  const tooltipWidth = 340;
  const tooltipHeight = 170;
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
    // bottom (default)
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
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const currentStep = onboardingSteps[stepIndex] || null;

  const progressText = useMemo(
    () => `${stepIndex + 1} / ${onboardingSteps.length}`,
    [stepIndex]
  );

  // ── Arrancar el tour ──────────────────────────────────────────────────────
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    if (!autoStart) return;

    const alreadySeen = localStorage.getItem(STORAGE_KEY);
    if (!alreadySeen) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, forceOpen]);

  // ── Calcular rect del elemento target ────────────────────────────────────
  useLayoutEffect(() => {
    if (!isOpen || !currentStep) return;

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
  }, [isOpen, currentStep]);

  // ── Bloquear scroll del body mientras está abierto ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  // ── Si el target no existe, saltar al siguiente ───────────────────────────
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (!el) goNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep]);

  // ── Helpers de navegación ─────────────────────────────────────────────────
  function finishTour(markSeen = true) {
    setIsOpen(false);
    if (markSeen) localStorage.setItem(STORAGE_KEY, "true");
    if (typeof onFinish === "function") onFinish();
  }

  function goNext() {
    if (stepIndex >= onboardingSteps.length - 1) { finishTour(true); return; }
    let next = stepIndex + 1;
    while (next < onboardingSteps.length) {
      if (document.querySelector(onboardingSteps[next].target)) {
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
      if (document.querySelector(onboardingSteps[prev].target)) {
        setStepIndex(prev);
        return;
      }
      prev--;
    }
  }

  if (!isOpen || !currentStep || !targetRect) return null;

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

  // ── Portal: se monta en document.body, fuera de cualquier stacking context
  return createPortal(
    <>
      {/* Overlay superior */}
      <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:rect.top, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay izquierdo */}
      <div style={{ position:"fixed", top:rect.top, left:0, width:rect.left, height:rect.height, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay derecho */}
      <div style={{ position:"fixed", top:rect.top, left:rect.left+rect.width, width:`calc(100vw - ${rect.left+rect.width}px)`, height:rect.height, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />
      {/* Overlay inferior */}
      <div style={{ position:"fixed", top:rect.top+rect.height, left:0, width:"100vw", height:`calc(100vh - ${rect.top+rect.height}px)`, background:"rgba(0,0,0,0.68)", zIndex:99998, pointerEvents:"auto" }} />

      {/* Highlight del elemento */}
      <div style={{
        position:"fixed",
        top:rect.top, left:rect.left, width:rect.width, height:rect.height,
        borderRadius:"14px",
        border:"2px solid rgba(124,92,255,0.95)",
        boxShadow:"0 0 0 3px rgba(124,92,255,0.18), 0 0 30px rgba(124,92,255,0.38)",
        zIndex:99999,
        pointerEvents:"none",
        transition:"all 0.2s ease",
      }} />

      {/* Tooltip */}
      <div style={{
        position:"fixed",
        top:tooltip.top, left:tooltip.left, width:tooltip.width,
        zIndex:100000,
        borderRadius:"18px",
        background:"linear-gradient(180deg, rgba(15,15,24,0.98) 0%, rgba(24,20,38,0.98) 100%)",
        border:"1px solid rgba(124,92,255,0.28)",
        boxShadow:"0 18px 50px rgba(0,0,0,0.45)",
        padding:"18px 18px 16px 18px",
        color:"#f5f7ff",
        backdropFilter:"blur(10px)",
      }}>
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
            style={{ background:"transparent", color:"rgba(255,255,255,0.72)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 14px", cursor:"pointer", fontWeight:600 }}
          >
            Omitir
          </button>
          <div style={{ display:"flex", gap:10 }}>
            <button
              type="button"
              onClick={goPrev}
              disabled={stepIndex === 0}
              style={{ background: stepIndex===0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)", color: stepIndex===0 ? "rgba(255,255,255,0.35)" : "#fff", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 14px", cursor: stepIndex===0 ? "not-allowed" : "pointer", fontWeight:600 }}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={goNext}
              style={{ background:"linear-gradient(90deg,#7c5cff 0%,#9b7bff 100%)", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", cursor:"pointer", fontWeight:700, boxShadow:"0 10px 24px rgba(124,92,255,0.35)" }}
            >
              {stepIndex === onboardingSteps.length - 1 ? "Terminar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body  // ← montado directamente en body, fuera de cualquier stacking context
  );
}
