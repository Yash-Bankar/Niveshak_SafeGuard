/**
 * The backend LLM sometimes wraps quiz text in LaTeX math markup, e.g.
 * "$\\leq$ 1%", "$> $1$\\%$", "$10\\%$". We render plain text (no math
 * library, no injected markup), so this converts the common markup to
 * readable Unicode and strips the delimiters. Latin digits/letters pass
 * through unchanged; anything we don't recognise loses only its backslash.
 */

const SYMBOLS: Record<string, string> = {
  leq: "≤",
  leqslant: "≤",
  le: "≤",
  geq: "≥",
  geqslant: "≥",
  ge: "≥",
  lt: "<",
  gt: ">",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  approxeq: "≈",
  equiv: "≡",
  sim: "∼",
  times: "×",
  cdot: "·",
  dot: "·",
  pm: "±",
  mp: "∓",
  div: "÷",
  ast: "∗",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  infty: "∞",
  percent: "%",
  degree: "°",
  circ: "°",
  sqrt: "√",
  sum: "∑",
  prod: "∏",
  int: "∫",
  pi: "π",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  sigma: "σ",
  phi: "φ",
  omega: "ω",
};

const IGNORED = new Set([
  "left",
  "right",
  "big",
  "Big",
  "bigg",
  "Bigg",
  "displaystyle",
  "textstyle",
  "scriptstyle",
  "limits",
  "nolimits",
  "mathrel",
  "mathbin",
  "mathord",
  "mathopen",
  "mathclose",
  "mathpunct",
  "mathop",
]);

export function cleanMathText(input: string): string {
  if (input.indexOf("\\") === -1 && input.indexOf("$") === -1) {
    return input;
  }

  let text = input;

  // Formatting wrappers → keep only their inner text.
  text = text.replace(
    /\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|operatorname)\s*\{([^{}]*)\}/g,
    "$1"
  );
  // \frac{a}{b} → a/b
  text = text.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2");
  // \sqrt{x} → √(x)
  text = text.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  // Escaped literal characters: \% \& \# \_ \{ \} \$
  text = text.replace(/\\([%&#_{}$])/g, "$1");
  // Spacing commands → a single space.
  text = text.replace(
    /\\(?:,|;|:|!|quad|qquad|thinspace|enspace|medspace|thickspace)\b/g,
    " "
  );
  // Remaining \command → symbol (or drop it, or strip the backslash).
  text = text.replace(/\\([a-zA-Z]+)/g, (_match, name: string) =>
    SYMBOLS[name] ?? (IGNORED.has(name) ? "" : name)
  );
  // Math delimiters.
  text = text.replace(/\${1,2}/g, "");

  return text.replace(/\s+/g, " ").trim();
}
