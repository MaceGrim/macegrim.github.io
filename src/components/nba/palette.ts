// Per-model categorical colors, harmonized with the bone/ink chart palette.
// Shared by the era-slope and rorschach charts so the same model reads as the
// same color across both.
export const MODEL_COLOR: Record<string, string> = {
  'gemma3:12b': '#3f7d86',   // teal — old-school lean
  'llama3.1:8b': '#a8492c',  // clay — recency riser (the protagonist)
  'mistral:7b': '#9a5b6b',   // rose — the contrarian
  'phi4:14b': '#6b7f4e',     // olive
  'qwen2.5:7b': '#cf8a3b',   // ochre — recency riser
};

export const shortModel = (m: string) => m.split(':')[0];
