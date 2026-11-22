// Splits note text into overlapping chunks for retrieval.
export function chunkText(text, size = 900, overlap = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const chunks = [];
  if (!clean) return chunks;
  for (let i = 0; i < clean.length; i += size - overlap) {
    chunks.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return chunks;
}

const STOP = new Set([
  'the', 'and', 'for', 'are', 'was', 'with', 'this', 'that', 'what', 'how', 'why', 'does',
  'from', 'into', 'about', 'when', 'where', 'which', 'you', 'can', 'its', 'not', 'but', 'use',
]);

const tokenize = (s) =>
  (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));

// Keyword-overlap retrieval (lightweight RAG). Returns the best-matching chunks with their index.
export function retrieve(chunks, query, k = 4) {
  const terms = new Set(tokenize(query));
  if (!terms.size) return [];
  return chunks
    .map((text, index) => {
      const words = tokenize(text);
      const hits = words.reduce((n, w) => n + (terms.has(w) ? 1 : 0), 0);
      return { index, text, score: hits / Math.sqrt(words.length + 1) };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
