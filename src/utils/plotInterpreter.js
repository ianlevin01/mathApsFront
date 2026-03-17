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

    // ── PARAMETRIC ─────────────────────────────────────────
    // plotSpec: { plotType:"parametric", xExpr:"cos(t)", yExpr:"sin(t)", tRange:[0,6.28], label:"..." }
    // También soporta múltiples curvas: curves:[{xExpr,yExpr,label}]
    if (plotType === "parametric") {
      const tRange = Array.isArray(ps.tRange) && ps.tRange.length === 2 ? ps.tRange : [0, 2 * Math.PI];
      const [tmin, tmax] = tRange;
      if (![tmin, tmax].every(Number.isFinite))
        return { model: null, error: "tRange inválido para parametric." };

      const n = ps.grid?.n ?? 500;
      const ts = linspace(tmin, tmax, n);

      // Soportar array de curvas o una sola
      const curves = Array.isArray(ps.curves)
        ? ps.curves
        : [{ xExpr: ps.xExpr, yExpr: ps.yExpr, label: ps.label || "C" }];

      if (!curves.length || !curves[0]?.xExpr || !curves[0]?.yExpr)
        return { model: null, error: "parametric necesita xExpr e yExpr." };

      const traces = curves.map((c, idx) => {
        let fx, fy;
        try {
          const jsX = toJsExpression(c.xExpr);
          const jsY = toJsExpression(c.yExpr);
          // eslint-disable-next-line no-new-func
          fx = new Function("t", `"use strict"; try { return (${jsX}); } catch(e) { return null; }`);
          // eslint-disable-next-line no-new-func
          fy = new Function("t", `"use strict"; try { return (${jsY}); } catch(e) { return null; }`);
        } catch (e) {
          console.warn("Parametric compile error:", e.message);
          return null;
        }
        const xs = ts.map(t => { const v = fx(t); return Number.isFinite(v) ? v : null; });
        const ys = ts.map(t => { const v = fy(t); return Number.isFinite(v) ? v : null; });
        return {
          type: "scatter", mode: "lines",
          x: xs, y: ys,
          name: c.label || `C${idx + 1}`,
        };
      }).filter(Boolean);

      if (!traces.length)
        return { model: null, error: "No se pudo evaluar la curva paramétrica." };

      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];
      return {
        model: {
          data: [...traces, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { zeroline: true, zerolinecolor: "rgba(255,255,255,0.2)" },
            yaxis: { zeroline: true, zerolinecolor: "rgba(255,255,255,0.2)", scaleanchor: "x", scaleratio: 1 },
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── IMPLICIT ───────────────────────────────────────────
    // Curvas implícitas F(x,y) = 0 usando contour con nivel 0
    // plotSpec: { plotType:"implicit", expression:"x^2 + y^2 - 1", xRange:[-2,2], yRange:[-2,2] }
    if (plotType === "implicit") {
      if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange))
        return { model: null, error: "implicit necesita xRange e yRange." };

      let [xmin, xmax] = ps.xRange;
      let [ymin, ymax] = ps.yRange;
      if (![xmin, xmax, ymin, ymax].every(Number.isFinite))
        return { model: null, error: "Rangos inválidos para implicit." };

      const funcs = getFunctionsList(ps);
      if (!funcs.length)
        return { model: null, error: "implicit necesita expression/function." };

      const nx = ps.grid?.nx ?? 100;
      const ny = ps.grid?.ny ?? 100;
      const xs = linspace(xmin, xmax, nx);
      const ys = linspace(ymin, ymax, ny);

      const traces = funcs.map((fnObj, idx) => {
        let f;
        try { f = compileF2(fnObj.expression); } catch (e) {
          console.warn("Implicit compile error:", e.message);
          return null;
        }
        const Z = ys.map(y => xs.map(x => safeEval2(f, x, y)));
        return {
          type: "contour",
          x: xs, y: ys, z: Z,
          contours: { coloring: "none", showlabels: false, start: 0, end: 0, size: 0.001 },
          line: { color: idx === 0 ? "#7c5cff" : "#f97316", width: 2 },
          showscale: false,
          name: fnObj.label || `F${idx + 1}(x,y)=0`,
        };
      }).filter(Boolean);

      if (!traces.length)
        return { model: null, error: "No se pudo evaluar la curva implícita." };

      const ptsTrace = overlayPoints.length ? [pointTrace2D(overlayPoints)] : [];
      return {
        model: {
          data: [...traces, ...ptsTrace],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { range: [xmin, xmax] },
            yaxis: { range: [ymin, ymax] },
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── VECTORFIELD ────────────────────────────────────────
    // Campo vectorial 2D: flechas en cada punto (x,y) con dirección (dx,dy)
    // plotSpec: { plotType:"vectorfield", dxExpr:"y", dyExpr:"-x", xRange:[-3,3], yRange:[-3,3] }
    if (plotType === "vectorfield") {
      if (!Array.isArray(ps.xRange) || !Array.isArray(ps.yRange))
        return { model: null, error: "vectorfield necesita xRange e yRange." };
      if (!ps.dxExpr || !ps.dyExpr)
        return { model: null, error: "vectorfield necesita dxExpr y dyExpr." };

      let [xmin, xmax] = ps.xRange;
      let [ymin, ymax] = ps.yRange;
      if (![xmin, xmax, ymin, ymax].every(Number.isFinite))
        return { model: null, error: "Rangos inválidos para vectorfield." };

      let fdx, fdy;
      try {
        fdx = compileF2(ps.dxExpr);
        fdy = compileF2(ps.dyExpr);
      } catch (e) {
        return { model: null, error: `Error compilando vectorfield: ${e.message}` };
      }

      const steps = ps.grid?.steps ?? 15;
      const xs = linspace(xmin, xmax, steps);
      const ys = linspace(ymin, ymax, steps);

      const px = [], py = [], u = [], v = [];
      for (const x of xs) {
        for (const y of ys) {
          const dx = safeEval2(fdx, x, y);
          const dy = safeEval2(fdy, x, y);
          if (dx !== null && dy !== null) {
            // Normalizar para que todas las flechas sean del mismo tamaño
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const scale = (xmax - xmin) / steps / mag * 0.45;
            px.push(x); py.push(y);
            u.push(dx * scale); v.push(dy * scale);
          }
        }
      }

      // Plotly no tiene quiver nativo, usamos annotations o scatter con flechas
      // Usamos líneas individuales: cada flecha = segmento + punta
      const arrowX = [], arrowY = [];
      for (let i = 0; i < px.length; i++) {
        arrowX.push(px[i], px[i] + u[i], null);
        arrowY.push(py[i], py[i] + v[i], null);
      }

      return {
        model: {
          data: [{
            type: "scatter", mode: "lines",
            x: arrowX, y: arrowY,
            line: { color: "#7c5cff", width: 1.5 },
            hoverinfo: "none",
            name: "Campo vectorial",
          }],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { range: [xmin, xmax] },
            yaxis: { range: [ymin, ymax], scaleanchor: "x", scaleratio: 1 },
          },
        },
        error: "",
      };
    }

    // ── BAR ────────────────────────────────────────────────
    // plotSpec: { plotType:"bar", categories:["A","B","C"], values:[10,20,15], label:"..." }
    // O múltiples series: series:[{name,values}]
    if (plotType === "bar") {
      const categories = Array.isArray(ps.categories) ? ps.categories : [];
      if (!categories.length)
        return { model: null, error: "bar necesita categories." };

      const series = Array.isArray(ps.series)
        ? ps.series
        : [{ name: ps.label || "Datos", values: ps.values }];

      if (!series.length || !Array.isArray(series[0]?.values))
        return { model: null, error: "bar necesita values." };

      const traces = series.map((s) => ({
        type: "bar",
        x: categories,
        y: s.values,
        name: s.name || "Datos",
      }));

      return {
        model: {
          data: traces,
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            barmode: ps.barmode || "group",
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── HISTOGRAM ──────────────────────────────────────────
    // plotSpec: { plotType:"histogram", values:[1,2,3,...], label:"...", nbins:20 }
    if (plotType === "histogram") {
      const values = Array.isArray(ps.values) ? ps.values : [];
      if (!values.length)
        return { model: null, error: "histogram necesita values." };

      return {
        model: {
          data: [{
            type: "histogram",
            x: values,
            nbinsx: ps.nbins ?? 20,
            name: ps.label || "Frecuencia",
            marker: { color: "rgba(124,92,255,0.7)", line: { color: "#7c5cff", width: 1 } },
          }],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { title: ps.xLabel || "Valor" },
            yaxis: { title: ps.yLabel || "Frecuencia" },
          },
        },
        error: "",
      };
    }

    // ── PIE ────────────────────────────────────────────────
    // plotSpec: { plotType:"pie", labels:["A","B","C"], values:[30,50,20] }
    if (plotType === "pie") {
      const labels = Array.isArray(ps.labels) ? ps.labels : [];
      const values = Array.isArray(ps.values) ? ps.values : [];
      if (!labels.length || !values.length)
        return { model: null, error: "pie necesita labels y values." };

      return {
        model: {
          data: [{
            type: "pie",
            labels,
            values,
            hole: ps.donut ? 0.4 : 0,
            textinfo: "label+percent",
            marker: {
              colors: [
                "#7c5cff","#f97316","#22c55e","#3b82f6",
                "#ec4899","#14b8a6","#ef4444","#eab308",
              ],
            },
          }],
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 15, r: 15, b: 15, t: 55 },
            legend: { orientation: "h" },
          },
        },
        error: "",
      };
    }

    // ── SCATTER ────────────────────────────────────────────
    // Nube de puntos con datos crudos x/y
    // plotSpec: { plotType:"scatter", x:[1,2,3], y:[4,5,6], label:"..." }
    if (plotType === "scatter") {
      const xs = Array.isArray(ps.x) ? ps.x : [];
      const ys = Array.isArray(ps.y) ? ps.y : [];
      if (!xs.length || !ys.length)
        return { model: null, error: "scatter necesita x e y." };

      const series = Array.isArray(ps.series)
        ? ps.series
        : [{ x: xs, y: ys, name: ps.label || "Datos" }];

      const traces = series.map((s) => ({
        type: "scatter",
        mode: ps.mode || "markers",
        x: s.x,
        y: s.y,
        name: s.name || "Datos",
        marker: { size: 8 },
      }));

      const allX = series.flatMap(s => s.x).filter(Number.isFinite);
      const allY = series.flatMap(s => s.y).filter(Number.isFinite);
      const { xmin, xmax, ymin, ymax } = padRange(allX, allY, 1);

      return {
        model: {
          data: traces,
          layout: {
            title, autosize: true, height: 400,
            margin: { l: 55, r: 15, b: 55, t: 55 },
            xaxis: { range: [xmin, xmax], title: ps.xLabel || "x" },
            yaxis: { range: [ymin, ymax], title: ps.yLabel || "y" },
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
