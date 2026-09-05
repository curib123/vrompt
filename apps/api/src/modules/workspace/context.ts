// Deterministic extractive context avoids an extra model call and keeps source text.
export function relevantContext(
  query: string,
  documents: string[],
  budget: number,
) {
  const terms = new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const chunks = documents.flatMap(
    (text) => text.match(/[\s\S]{1,1000}/g) ?? [],
  );
  const ranked = chunks
    .map((text, index) => ({
      text,
      index,
      score: [...terms].reduce(
        (n, term) => n + Number(text.toLowerCase().includes(term)),
        0,
      ),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let result = '';
  for (const chunk of ranked) {
    const remaining = budget - result.length;
    if (remaining <= 1) break;
    result += `${chunk.text.slice(0, remaining - 1)}\n`;
  }
  return result;
}
