import { GoogleGenerativeAI } from '@google/generative-ai';
import { httpError } from '../middleware/auth.js';

const GUARD = [
  'You are a study assistant inside an academic notes platform.',
  'Use ONLY the note excerpts provided. If they do not cover the request, say the topic is not covered in this note.',
  'Be accurate, clear and concise. Your output is a study aid, not an authoritative source.',
].join(' ');

let client = null;

export async function generate(task, context) {
  if (!process.env.GEMINI_API_KEY) {
    throw httpError(503, 'AI is not configured yet (missing GEMINI_API_KEY)');
  }
  client ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
  const prompt = `${GUARD}\n\nTASK:\n${task}\n\nNOTE EXCERPTS:\n${context}`;
  // Google returns temporary 429/503 "high demand" errors, so retry with a short backoff.
  const delays = [0, 3000, 8000];
  let lastError;
  for (const wait of delays) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      const retryable = [429, 500, 503].includes(err.status);
      console.error('Gemini error:', err.message);
      if (!retryable) break;
    }
  }
  const busy = [429, 503].includes(lastError?.status);
  throw httpError(
    502,
    busy
      ? 'The AI model is busy right now. Please wait a minute and try again.'
      : 'The AI service is unavailable right now. Please try again shortly.'
  );
}