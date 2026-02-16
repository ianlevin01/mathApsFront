import { useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { getToken } from "./auth";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const API_URL = "https://mathapsapi.duckdns.org/math/";

/* ===================== HELPERS ===================== */
function normalizeMath(text) {
  if (!text) return "";

  let s = String(text);

  // 1) Unificar saltos de línea
  s = s.replace(/\r\n/g, "\n");

  // 2) Si viene con \( \) o \[ \], convertir a $ / $$
  s = s.replace(/\\\[(.*?)\\\]/gs, (_, m) => `$$${m}$$`);
  s = s.replace(/\\\((.*?)\\\)/gs, (_, m) => `$${m}$`);

  // 3) Caso “triple backticks” con latex: lo convierte a bloque
  s = s.replace(/```latex\s*([\s\S]*?)```/g, (_, m) => `$$\n${m}\n$$`);

  return s;
}
function toJsExpression(expr) {
  if (!expr || typeof expr !== "string") throw new Error("Expresión inválida");

  // demo-sanitize (básico)
  const ok = /^[0-9a-zA-Z\s+\-*/^().,_]*$/;
  if (!ok.test(expr)) throw new Error("Expresión inválida");

  let s = expr.trim().replaceAll("^", "**");
  s = s.replace(/\bpi\b/gi, "Math.PI");
  s = s.replace(/\be\b/g, "Math.E");

  const fns = [
    "sin","cos","tan","asin","acos","atan",
    "sinh","cosh","tanh","exp","log","sqrt",
    "abs","floor","ceil","round","pow","min","max",
  ];

  for (const fn of fns) {
    s = s.replace(new RegExp(`\\b${fn}\\s*\\(`, "gi"), `Math.${fn}(`);
  }

  return s;
}

function compileF1(expr) {
  // eslint-disable-next-line no-new-func
  return new Function("x", `return (${toJsExpression(expr)});`);
}

function compileF2(expr) {
  // eslint-disable-next-line no-new-func
  return new Function("x", "y", `return (${toJsExpression(expr)});`);
}

function linspace(a, b, n) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  if (n < 2) return [a, b];
  return Array.from({ length: n }, (_, i) => a + (i * (b - a)) / (n - 1));
}

function ensureGrid(grid, plotType) {
  const fallback = plotType === "curve2d" ? { n: 400 } : { nx: 80, ny: 80 };
  return { ...fallback, ...(grid || {}) };
}

function getFunctionsList(ps) {
  const out = [];

  // formato: functions: [{expression,label}]
  if (Array.isArray(ps?.functions)) {
    for (const f of ps.functions) {
      if (f && typeof f.expression === "string" && f.expression.trim()) {
        out.push({ expression: f.expression.trim(), label: f.label || "f" });
      }
    }
  }

  // formato: function: "..."
  if (typeof ps?.function === "string" && ps.function.trim()) {
    out.push({ expression: ps.function.trim(), label: ps.label || "f" });
  }

  return out;
}

function padRange(xs, ys, pad = 1) {
  const xmin = Math.min(...xs) - pad;
  const xmax = Math.max(...xs) + pad;
  const ymin = Math.min(...ys) - pad;
  const ymax = Math.max(...ys) + pad;
  return { xmin, xmax, ymin, ymax };
}

function pointTrace2D(points) {
  return {
    type: "scatter",
    mode: "markers+text",
    x: points.map((p) => p.x),
    y: points.map((p) => p.y),
    text: points.map((p) => p.label || ""),
    textposition: "top center",
    marker: { size: 10 },
    name: "Puntos",
  };
}

/* ===================== COMPONENTE ===================== */

export default function Calculator() {
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [answerText, setAnswerText] = useState("");
  const [plotSpec, setPlotSpec] = useState(null);

  const fileInputRef = useRef(null);

  /* ===== PEGAR IMÁGENES ===== */
  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFound = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFound = true;
          setImageFile(file);
        }
      }
    }

    // Solo bloquea el paste si capturamos imagen
    if (imageFound) e.preventDefault();
  }

  /* ===== SUBMIT ===== */
  async function handleSolve() {
    setIsLoading(true);
    setErrorMsg("");
    setAnswerText("");
    setPlotSpec(null);

    try {
      const token = getToken?.() || "";
      const formData = new FormData();

      // OJO: tu backend dijo "solo texto", pero esto igual lo mandamos en form-data.
      // Si tu backend quiere JSON puro, ahí sí hay que cambiar el backend o el client.
      formData.append("problem", problemText);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch(API_URL, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      setAnswerText(data?.answerText || "");
      setPlotSpec(data?.plotSpec || null);
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  /* ===================== PLOT INTERPRETER (FULL) ===================== */

  const plotResult = useMemo(() => {
    if (!plotSpec) return { model: null, error: "" };

    try {
      const ps = plotSpec;
      const raw = String(ps.plotType || "").toLowerCase().trim();

      // Normalizaciones típicas
      const plotType =
        raw === "curve" ? "curve2d" :
        raw === "2d" ? "curve2d" :
        raw;

      const title = ps.title || "Gráfico";

      const overlays = Array.isArray(ps.overlays) ? ps.overlays : [];
      const overlayPoints = overlays
        .filter((o) => o?.type === "point" && Number.isFinite(o.x) && Number.isFinite(o.y))
        .map((p) => ({ x: p.x, y: p.y, label: p.label || "" }));

      // ---------- POINT ----------
      if (plotType === "point") {
        const pt =
          overlayPoints[0] ||
          ({
            x: Array.isArray(ps.xRange) ? ps.xRange[0] : 0,
            y: Array.isArray(ps.yRange) ? ps.yRange[0] : 0,
            label: "",
          });

        const { xmin, xmax, ymin, ymax } = padRange([pt.x], [pt.y], 1);

        return {
          model: {
            data: [pointTrace2D([pt])],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
              yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
            },
          },
          error: "",
        };
      }

      // ---------- POINTS ----------
      if (plotType === "points") {
        if (!overlayPoints.length) return { model: null, error: "No hay puntos para dibujar." };

        const xs = overlayPoints.map((p) => p.x);
        const ys = overlayPoints.map((p) => p.y);
        const { xmin, xmax, ymin, ymax } = padRange(xs, ys, 1);

        return {
          model: {
            data: [pointTrace2D(overlayPoints)],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
              yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
            },
          },
          error: "",
        };
      }

      // ---------- LINE (ps.line = [{x,y},...]) ----------
      if (plotType === "line") {
        const line = Array.isArray(ps.line) ? ps.line : [];
        if (line.length < 2) return { model: null, error: "line necesita al menos 2 puntos." };

        const xs = line.map((p) => p.x);
        const ys = line.map((p) => p.y);
        if (![...xs, ...ys].every(Number.isFinite)) return { model: null, error: "line tiene valores inválidos." };

        const { xmin, xmax, ymin, ymax } = padRange(
          overlayPoints.length ? xs.concat(overlayPoints.map(p => p.x)) : xs,
          overlayPoints.length ? ys.concat(overlayPoints.map(p => p.y)) : ys,
          1
        );

        const lineTrace = {
          type: "scatter",
          mode: "lines",
          x: xs,
          y: ys,
          line: { width: 2 },
          name: "Línea",
        };

        const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

        return {
          model: {
            data: [lineTrace, ...ptsTrace],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
              yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
            },
          },
          error: "",
        };
      }

      // ---------- RECT (xRange/yRange) ----------
      if (plotType === "rect") {
        if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange)) {
          return { model: null, error: "rect necesita xRange e yRange." };
        }

        let [xmin, xmax] = ps.xRange;
        let [ymin, ymax] = ps.yRange;
        if (![xmin, xmax, ymin, ymax].every(Number.isFinite)) {
          return { model: null, error: "rect tiene rangos inválidos." };
        }

        if (xmin === xmax) { xmin -= 1; xmax += 1; }
        if (ymin === ymax) { ymin -= 1; ymax += 1; }

        const polyX = [xmin, xmax, xmax, xmin, xmin];
        const polyY = [ymin, ymin, ymax, ymax, ymin];

        const regionTrace = {
          type: "scatter",
          mode: "lines",
          x: polyX,
          y: polyY,
          fill: "toself",
          fillcolor: "rgba(124,92,255,0.15)",
          line: { width: 2 },
          name: "Región",
        };

        const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

        return {
          model: {
            data: [regionTrace, ...ptsTrace],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { title: "x", range: [xmin - 1, xmax + 1], zeroline: false },
              yaxis: { title: "y", range: [ymin - 1, ymax + 1], zeroline: false },
            },
          },
          error: "",
        };
      }

      // ---------- POLYGON (ps.polygon = [{x,y},...]) ----------
      if (plotType === "polygon") {
        const poly = Array.isArray(ps.polygon) ? ps.polygon : [];
        if (poly.length < 3) return { model: null, error: "polygon necesita al menos 3 puntos." };

        const polyXs = poly.map((p) => p.x);
        const polyYs = poly.map((p) => p.y);
        if (![...polyXs, ...polyYs].every(Number.isFinite)) {
          return { model: null, error: "polygon tiene valores inválidos." };
        }

        const closedX = [...polyXs, polyXs[0]];
        const closedY = [...polyYs, polyYs[0]];

        const regionTrace = {
          type: "scatter",
          mode: "lines",
          x: closedX,
          y: closedY,
          fill: "toself",
          fillcolor: "rgba(124,92,255,0.15)",
          line: { width: 2 },
          name: "Región",
        };

        const xsAll = overlayPoints.length ? polyXs.concat(overlayPoints.map(p => p.x)) : polyXs;
        const ysAll = overlayPoints.length ? polyYs.concat(overlayPoints.map(p => p.y)) : polyYs;
        const { xmin, xmax, ymin, ymax } = padRange(xsAll, ysAll, 1);

        const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

        return {
          model: {
            data: [regionTrace, ...ptsTrace],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
              yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
            },
          },
          error: "",
        };
      }

      // ---------- CURVE2D (1 o muchas funciones y=f(x)) ----------
      if (plotType === "curve2d") {
        if (!Array.isArray(ps.xRange) || ps.xRange.length !== 2) {
          return { model: null, error: "curve2d necesita xRange." };
        }

        let [xmin, xmax] = ps.xRange;
        if (![xmin, xmax].every(Number.isFinite)) return { model: null, error: "xRange inválido." };
        if (xmin === xmax) { xmin -= 1; xmax += 1; }

        const grid = ensureGrid(ps.grid, "curve2d");
        const n = grid.n ?? 400;
        const xs = linspace(xmin, xmax, n);

        const funcs = getFunctionsList(ps);
        if (!funcs.length) return { model: null, error: "No llegó function/functions para curve2d." };

        const traces = funcs.map((fnObj) => {
          let f;
          try {
            f = compileF1(fnObj.expression);
          } catch (e) {
            console.error("Curve compile error:", fnObj.expression, e.message);
            return null;
          }

          const ys = xs.map((x) => {
            const v = f(x);
            return Number.isFinite(v) ? v : null;
          });

          return {
            type: "scatter",
            mode: "lines",
            x: xs,
            y: ys,
            name: fnObj.label || "f",
          };
        }).filter(Boolean);

        const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

        return {
          model: {
            data: [...traces, ...ptsTrace],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 55, r: 15, b: 55, t: 55 },
              xaxis: { range: [xmin, xmax] },
              yaxis: Array.isArray(ps.yRange) && ps.yRange.length === 2 ? { range: ps.yRange } : undefined,
              legend: { orientation: "h" },
            },
          },
          error: "",
        };
      }

      // ---------- SURFACE / CONTOUR (1 o muchas funciones z=f(x,y)) ----------
      if (plotType === "surface" || plotType === "contour") {
        if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange)) {
          return { model: null, error: `${plotType} necesita xRange e yRange.` };
        }

        let [xmin, xmax] = ps.xRange;
        let [ymin, ymax] = ps.yRange;
        if (![xmin, xmax, ymin, ymax].every(Number.isFinite)) {
          return { model: null, error: "Rangos inválidos para surface/contour." };
        }

        if (xmin === xmax) { xmin -= 1; xmax += 1; }
        if (ymin === ymax) { ymin -= 1; ymax += 1; }

        const grid = ensureGrid(ps.grid, plotType);
        const nx = grid.nx ?? 80;
        const ny = grid.ny ?? 80;

        const xs = linspace(xmin, xmax, nx);
        const ys = linspace(ymin, ymax, ny);

        const funcs = getFunctionsList(ps);
        if (!funcs.length) return { model: null, error: "No llegó function/functions para surface/contour." };

        // Este renderer asume z=f(x,y). Si la expresión trae 'z', no sirve.
        for (const fn of funcs) {
          if (/\bz\b/i.test(fn.expression)) {
            return {
              model: null,
              error: "Para surface/contour, la expresión debe ser z=f(x,y) (sin usar 'z' en la fórmula).",
            };
          }
        }

        const traces = funcs.map((fnObj, idx) => {
          let f;
          try {
            f = compileF2(fnObj.expression);
          } catch (e) {
            console.error("Surface compile error:", fnObj.expression, e.message);
            return null;
          }

          const Z = ys.map((y) =>
            xs.map((x) => {
              const v = f(x, y);
              return Number.isFinite(v) ? v : null;
            })
          );

          if (plotType === "surface") {
            return {
              type: "surface",
              x: xs,
              y: ys,
              z: Z,
              name: fnObj.label || `Superficie ${idx + 1}`,
              opacity: funcs.length > 1 ? 0.85 : 1,
              showscale: idx === 0,
            };
          }

          return {
            type: "contour",
            x: xs,
            y: ys,
            z: Z,
            name: fnObj.label || `Contorno ${idx + 1}`,
            showscale: idx === 0,
          };
        }).filter(Boolean);

        // overlays: 2D (contour)
        const overlay2D =
          plotType === "contour" && overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

        // overlays: 3D (surface) usando la primera función para z de cada punto
        const overlay3D =
          plotType === "surface" && overlayPoints.length && funcs.length
            ? (() => {
                let f0;
                try { f0 = compileF2(funcs[0].expression); } catch { return []; }
                return [{
                  type: "scatter3d",
                  mode: "markers+text",
                  x: overlayPoints.map((p) => p.x),
                  y: overlayPoints.map((p) => p.y),
                  z: overlayPoints.map((p) => {
                    const v = f0(p.x, p.y);
                    return Number.isFinite(v) ? v : null;
                  }),
                  text: overlayPoints.map((p) => p.label || ""),
                  textposition: "top center",
                  marker: { size: 5 },
                  name: "Puntos",
                }];
              })()
            : [];

        return {
          model: {
            data: [...traces, ...overlay2D, ...overlay3D],
            layout: {
              title,
              autosize: true,
              height: 520,
              margin: { l: 15, r: 15, b: 15, t: 55 },
              legend: { orientation: "h" },
            },
          },
          error: "",
        };
      }

      // Si no matchea nada:
      return { model: null, error: `plotType no soportado: "${ps.plotType}"` };
    } catch (e) {
      console.error("Error generando gráfico:", e);
      return { model: null, error: "No se pudo generar el gráfico." };
    }
  }, [plotSpec]);

  const plotModel = plotResult.model;
  const plotError = plotResult.error;

  /* ===================== UI ===================== */

  return (
    <div className="calc">
      <h1>Math Web</h1>

      <textarea
        value={problemText}
        onChange={(e) => setProblemText(e.target.value)}
        onPaste={handlePaste}
        rows={4}
        placeholder="Escribí el problema o pegá una imagen (Ctrl+V)"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
      />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          📎 Adjuntar
        </button>

        <button onClick={handleSolve} disabled={isLoading}>
          {isLoading ? "Procesando..." : "Enviar"}
        </button>

        {imageFile && (
          <span style={{ fontSize: "0.85rem", opacity: 0.85, display: "flex", gap: 8, alignItems: "center" }}>
            Imagen adjunta
            <button type="button" onClick={() => setImageFile(null)}>
              ✕
            </button>
          </span>
        )}
      </div>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      {plotError && <p style={{ color: "orange" }}>{plotError}</p>}

      {answerText && (
        <div className="calc-answer-wrap">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {normalizeMath(answerText)}
          </ReactMarkdown>
        </div>
      )}

      {plotModel && (
        <Plot
          data={plotModel.data}
          layout={plotModel.layout}
          useResizeHandler
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
