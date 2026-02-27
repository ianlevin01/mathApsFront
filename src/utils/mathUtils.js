export function normalizeMath(text) {
  if (!text) return "";
  let s = String(text);

  // 1) Unificar saltos de línea
  s = s.replace(/\r\n/g, "\n");

  // 2) \[...\] → $$ ... $$ en líneas propias
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`);

  // 3) \(...\) → $...$ inline
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);

  // 4) Triple backticks latex
  s = s.replace(/```latex\s*([\s\S]*?)```/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`);

  // 5) Normalizar bloques $$ que NO están solos en su línea.
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
