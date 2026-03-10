export function normalizeMath(text) {
  if (!text) return "";
  let s = String(text);

  // 1) Unificar saltos de línea
  s = s.replace(/\r\n/g, "\n");

  // 2) Fix: cuando el JSON del backend tiene \frac con un solo backslash,
  //    el browser lo parsea y \f se convierte en form feed (char 0x0C).
  //    Lo restauramos antes de cualquier otro procesamiento.
  // eslint-disable-next-line no-control-regex
  s = s.replace(/\x0C([a-zA-Z])/g, (_, c) => `\\f${c}`);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/\x0B([a-zA-Z])/g, (_, c) => `\\v${c}`);
  // eslint-disable-next-line no-control-regex
  s = s.replace(/\x09([a-zA-Z])/g, (_, c) => `\\t${c}`); // \t antes de letra (raro pero posible)

  // 3) \[...\] → $$ ... $$ en líneas propias
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`);

  // 4) \(...\) → $...$ inline
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);

  // 5) Triple backticks latex
  s = s.replace(/```latex\s*([\s\S]*?)```/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`);

  // 6) Normalizar bloques $$ que NO están solos en su línea.
  //    Ej: "$$ H = \begin{pmatrix}...\end{pmatrix} $$"
  //    Los separa para que rehype-katex los trate como display math.
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => {
    const inner = m.trim();
    // Si ya está en líneas propias lo dejamos
    if (m.startsWith("\n") && m.endsWith("\n")) return `$$${m}$$`;
    return `\n$$\n${inner}\n$$\n`;
  });

  return s;
}