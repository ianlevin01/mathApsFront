function toJsExpression(expr) {
  if (!expr || typeof expr !== "string") throw new Error("Expresión inválida");

  // Permitir: números, letras, espacios, operadores, paréntesis, punto, coma, guión bajo
  const ok = /^[0-9a-zA-Z\s+\-*/^().,_]*$/;
  if (!ok.test(expr)) throw new Error("Expresión inválida: " + expr);

  let s = expr.trim().replaceAll("^", "**");

  // Constantes
  s = s.replace(/\bpi\b/gi, "Math.PI");
  s = s.replace(/\be\b/g, "Math.E");

  // Funciones matemáticas
  const fns = [
    "sin","cos","tan","asin","acos","atan","atan2",
    "sinh","cosh","tanh","exp","log","log2","log10",
    "sqrt","cbrt","abs","floor","ceil","round","pow",
    "min","max","sign","hypot",
  ];

  for (const fn of fns) {
    s = s.replace(new RegExp(`\\b${fn}\\s*\\(`, "gi"), `Math.${fn}(`);
  }

  return s;
}

function compileF1(expr) {
  const js = toJsExpression(expr);
  try {
    // eslint-disable-next-line no-new-func
    return new Function("x", `"use strict"; try { return (${js}); } catch(e) { return null; }`);
  } catch (e) {
    throw new Error(`No se pudo compilar: ${expr} → ${js}: ${e.message}`);
  }
}

function compileF2(expr) {
  const js = toJsExpression(expr);
  try {
    // eslint-disable-next-line no-new-func
    return new Function("x", "y", `"use strict"; try { return (${js}); } catch(e) { return null; }`);
  } catch (e) {
    throw new Error(`No se pudo compilar: ${expr} → ${js}: ${e.message}`);
  }
}

function safeEval1(f, x) {
  try {
    const v = f(x);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function safeEval2(f, x, y) {
  try {
    const v = f(x, y);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
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

  if (Array.isArray(ps?.functions)) {
    for (const f of ps.functions) {
      if (f && typeof f.expression === "string" && f.expression.trim()) {
        out.push({ expression: f.expression.trim(), label: f.label || "f" });
      }
    }
  }

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

export function interpretPlot(plotSpec) {
  if (!plotSpec) return { model: null, error: "" };

  try {
    const ps = plotSpec;
    const raw = String(ps.plotType ?? "").toLowerCase().trim();

    // ── Sin plotType o valores vacíos/nulos → no hay gráfico, sin error ──
    if (!raw || raw === "null" || raw === "none" || raw === "undefined") {
      return { model: null, error: "" };
    }

    const plotType =
      raw === "curve" || raw === "2d" ? "curve2d" : raw;

    const title = ps.title || "Gráfico";
    const overlays = Array.isArray(ps.overlays) ? ps.overlays : [];
    const overlayPoints = overlays
      .filter((o) => o?.type === "point" && Number.isFinite(o.x) && Number.isFinite(o.y))
      .map((p) => ({ x: p.x, y: p.y, label: p.label || "" }));

    // ── POINT ──────────────────────────────────────────────
    if (plotType === "point") {
      const pt = overlayPoints[0] || {
        x: Array.isArray(ps.xRange) ? ps.xRange[0] : 0,
        y: Array.isArray(ps.yRange) ? ps.yRange[0] : 0,
        label: "",
      };
      const { xmin, xmax, ymin, ymax } = padRange([pt.x], [pt.y], 1);
      return {
        model: {
          data: [pointTrace2D([pt])],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
            yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
          },
        },
        error: "",
      };
    }

    // ── POINTS ─────────────────────────────────────────────
    if (plotType === "points") {
      if (!overlayPoints.length)
        return { model: null, error: "No hay puntos para dibujar." };
      const xs = overlayPoints.map((p) => p.x);
      const ys = overlayPoints.map((p) => p.y);
      const { xmin, xmax, ymin, ymax } = padRange(xs, ys, 1);
      return {
        model: {
          data: [pointTrace2D(overlayPoints)],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
            yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
          },
        },
        error: "",
      };
    }

    // ── LINE ───────────────────────────────────────────────
    if (plotType === "line") {
      const line = Array.isArray(ps.line) ? ps.line : [];
      if (line.length < 2)
        return { model: null, error: "line necesita al menos 2 puntos." };
      const xs = line.map((p) => p.x);
      const ys = line.map((p) => p.y);
      if (![...xs, ...ys].every(Number.isFinite))
        return { model: null, error: "line tiene valores inválidos." };

      const allXs = overlayPoints.length ? xs.concat(overlayPoints.map((p) => p.x)) : xs;
      const allYs = overlayPoints.length ? ys.concat(overlayPoints.map((p) => p.y)) : ys;
      const { xmin, xmax, ymin, ymax } = padRange(allXs, allYs, 1);

      const lineTrace = {
        type: "scatter", mode: "lines",
        x: xs, y: ys,
        line: { width: 2 }, name: "Línea",
      };
      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

      return {
        model: {
          data: [lineTrace, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
            yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
          },
        },
        error: "",
      };
    }

    // ── RECT ───────────────────────────────────────────────
    if (plotType === "rect") {
      if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange))
        return { model: null, error: "rect necesita xRange e yRange." };
      let [xmin, xmax] = ps.xRange;
      let [ymin, ymax] = ps.yRange;
      if (![xmin, xmax, ymin, ymax].every(Number.isFinite))
        return { model: null, error: "rect tiene rangos inválidos." };
      if (xmin === xmax) { xmin -= 1; xmax += 1; }
      if (ymin === ymax) { ymin -= 1; ymax += 1; }

      const polyX = [xmin, xmax, xmax, xmin, xmin];
      const polyY = [ymin, ymin, ymax, ymax, ymin];
      const regionTrace = {
        type: "scatter", mode: "lines",
        x: polyX, y: polyY,
        fill: "toself", fillcolor: "rgba(124,92,255,0.15)",
        line: { width: 2 }, name: "Región",
      };
      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

      return {
        model: {
          data: [regionTrace, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: "x", range: [xmin - 1, xmax + 1], zeroline: false },
            yaxis: { title: "y", range: [ymin - 1, ymax + 1], zeroline: false },
          },
        },
        error: "",
      };
    }

    // ── POLYGON ────────────────────────────────────────────
    if (plotType === "polygon") {
      const poly = Array.isArray(ps.polygon) ? ps.polygon : [];
      if (poly.length < 3)
        return { model: null, error: "polygon necesita al menos 3 puntos." };
      const polyXs = poly.map((p) => p.x);
      const polyYs = poly.map((p) => p.y);
      if (![...polyXs, ...polyYs].every(Number.isFinite))
        return { model: null, error: "polygon tiene valores inválidos." };

      const closedX = [...polyXs, polyXs[0]];
      const closedY = [...polyYs, polyYs[0]];
      const regionTrace = {
        type: "scatter", mode: "lines",
        x: closedX, y: closedY,
        fill: "toself", fillcolor: "rgba(124,92,255,0.15)",
        line: { width: 2 }, name: "Región",
      };

      const xsAll = overlayPoints.length ? polyXs.concat(overlayPoints.map((p) => p.x)) : polyXs;
      const ysAll = overlayPoints.length ? polyYs.concat(overlayPoints.map((p) => p.y)) : polyYs;
      const { xmin, xmax, ymin, ymax } = padRange(xsAll, ysAll, 1);
      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

      return {
        model: {
          data: [regionTrace, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: "x", range: [xmin, xmax], zeroline: false },
            yaxis: { title: "y", range: [ymin, ymax], zeroline: false },
          },
        },
        error: "",
      };
    }

    // ── CURVE2D ────────────────────────────────────────────
    if (plotType === "curve2d") {
      if (!Array.isArray(ps.xRange) || ps.xRange.length !== 2)
        return { model: null, error: "curve2d necesita xRange." };

      let [xmin, xmax] = ps.xRange;
      if (![xmin, xmax].every(Number.isFinite))
        return { model: null, error: "xRange inválido." };
      if (xmin === xmax) { xmin -= 1; xmax += 1; }

      const grid = ensureGrid(ps.grid, "curve2d");
      const n = grid.n ?? 400;
      const xs = linspace(xmin, xmax, n);
      const funcs = getFunctionsList(ps);
      if (!funcs.length)
        return { model: null, error: "No llegó function/functions para curve2d." };

      const traces = funcs.map((fnObj) => {
        let f;
        try {
          f = compileF1(fnObj.expression);
        } catch (e) {
          console.warn("Curve compile error:", fnObj.expression, e.message);
          return null;
        }
        const ys = xs.map((x) => safeEval1(f, x));
        if (ys.every((v) => v === null)) return null;
        return {
          type: "scatter", mode: "lines",
          x: xs, y: ys,
          name: fnObj.label || "f",
        };
      }).filter(Boolean);

      if (!traces.length)
        return { model: null, error: "No se pudo evaluar ninguna función." };

      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];

      return {
        model: {
          data: [...traces, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { range: [xmin, xmax] },
            yaxis:
              Array.isArray(ps.yRange) && ps.yRange.length === 2
                ? { range: ps.yRange }
                : undefined,
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── SURFACE / CONTOUR ──────────────────────────────────
    if (plotType === "surface" || plotType === "contour") {
      if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange))
        return { model: null, error: `${plotType} necesita xRange e yRange.` };

      let [xmin, xmax] = ps.xRange;
      let [ymin, ymax] = ps.yRange;
      if (![xmin, xmax, ymin, ymax].every(Number.isFinite))
        return { model: null, error: "Rangos inválidos para surface/contour." };
      if (xmin === xmax) { xmin -= 1; xmax += 1; }
      if (ymin === ymax) { ymin -= 1; ymax += 1; }

      const grid = ensureGrid(ps.grid, plotType);
      const nx = grid.nx ?? 80;
      const ny = grid.ny ?? 80;
      const xs = linspace(xmin, xmax, nx);
      const ys = linspace(ymin, ymax, ny);
      const funcs = getFunctionsList(ps);
      if (!funcs.length)
        return { model: null, error: "No llegó function/functions para surface/contour." };

      for (const fn of funcs) {
        if (/\bz\b/i.test(fn.expression)) {
          return {
            model: null,
            error: "Para surface/contour, la expresión debe ser f(x,y) sin usar 'z' en la fórmula.",
          };
        }
      }

      const traces = funcs.map((fnObj, idx) => {
        let f;
        try {
          f = compileF2(fnObj.expression);
        } catch (e) {
          console.warn("Surface compile error:", fnObj.expression, e.message);
          return null;
        }
        const Z = ys.map((y) => xs.map((x) => safeEval2(f, x, y)));

        if (plotType === "surface") {
          return {
            type: "surface",
            x: xs, y: ys, z: Z,
            name: fnObj.label || `Superficie ${idx + 1}`,
            opacity: funcs.length > 1 ? 0.85 : 1,
            showscale: idx === 0,
          };
        }
        return {
          type: "contour",
          x: xs, y: ys, z: Z,
          name: fnObj.label || `Contorno ${idx + 1}`,
          showscale: idx === 0,
        };
      }).filter(Boolean);

      if (!traces.length)
        return { model: null, error: "No se pudo evaluar ninguna función." };

      const overlay2D =
        plotType === "contour" && overlayPoints.length
          ? [pointTrace2D(overlayPoints)]
          : [];

      const overlay3D =
        plotType === "surface" && overlayPoints.length && funcs.length
          ? (() => {
              let f0;
              try { f0 = compileF2(funcs[0].expression); } catch { return []; }
              return [{
                type: "scatter3d", mode: "markers+text",
                x: overlayPoints.map((p) => p.x),
                y: overlayPoints.map((p) => p.y),
                z: overlayPoints.map((p) => safeEval2(f0, p.x, p.y)),
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
            title, autosize: true, height: 400,
            margin: { l: 15, r: 15, b: 15, t: 55 },
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── plotType desconocido → silencioso, sin error visible ──
    console.warn(`[plotInterpreter] plotType desconocido: "${ps.plotType}"`);
    return { model: null, error: "" };

  } catch (e) {
    console.error("Error generando gráfico:", e);
    return { model: null, error: `Error generando gráfico: ${e.message}` };
  }
}
