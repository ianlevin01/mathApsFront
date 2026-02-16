export function normalizeMath(text) {
  if (!text) return "";
  let s = String(text);
  
  // 1) Unificar saltos de línea
  s = s.replace(/\r\n/g, "\n");
  
  // 2) Si viene con \( \) o \[ \], convertir a $ / $$
  s = s.replace(/\\\[(.*?)\\\]/gs, (_, m) => `$$${m}$$`);
  s = s.replace(/\\\((.*?)\\\)/gs, (_, m) => `$${m}$`);
  
  // 3) Caso "triple backticks" con latex: lo convierte a bloque
  s = s.replace(/```latex\s*([\s\S]*?)```/g, (_, m) => `$$\n${m}\n$$`);
  
  return s;
}
