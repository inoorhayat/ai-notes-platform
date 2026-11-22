import { Router } from 'express';
import mongoose from 'mongoose';
import { Note, AIInteraction } from '../models.js';
import { requireAuth, canView, httpError } from '../middleware/auth.js';
import { retrieve } from '../services/retrieval.js';
import { generate } from '../services/gemini.js';

const TASKS = {
  summary: 'Write a concise study summary of this note: 5-7 bullet points covering the key ideas, then one sentence on why it matters.',
  topics: 'List the 8-10 most important topics and keywords in this note. Give each one a one-line explanation.',
  questions: 'Create 5 practice questions from this note (a mix of short-answer and long-answer). Give a brief model answer after each question.',
};

async function readyNote(id, user) {
  const note = mongoose.isValidObjectId(id) ? await Note.findById(id).select('+chunks') : null;
  if (!note || !canView(note, user)) throw httpError(404, 'Note not found');
  if (note.status !== 'ready') throw httpError(409, 'This note is still being processed');
  if (!note.chunks?.length) throw httpError(422, 'Insufficient content: this note has no readable text');
  return note;
}

// Whole-note context for summary / topics / questions, capped to stay within model limits.
function wholeContext(chunks, limit = 14000) {
  let out = '';
  for (const c of chunks) {
    if (out.length + c.length > limit) break;
    out += c + '\n';
  }
  return out;
}

const r = Router();
r.use(requireAuth);

for (const type of Object.keys(TASKS)) {
  r.post(`/${type}/:noteId`, async (req, res) => {
    const note = await readyNote(req.params.noteId, req.user);
    const output = await generate(TASKS[type], wholeContext(note.chunks));
    await AIInteraction.create({ user: req.user._id, note: note._id, type, output });
    res.json({ output });
  });
}

// Note-grounded Q&A with retrieval: top chunks only, and an explicit "not covered" path.
r.post('/ask/:noteId', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  if (question.length < 3) throw httpError(422, 'Please type a question');
  const note = await readyNote(req.params.noteId, req.user);

  const hits = retrieve(note.chunks, question, 4);
  if (hits.length === 0) {
    const answer = 'This topic is not covered in this note.';
    await AIInteraction.create({ user: req.user._id, note: note._id, type: 'qa', question, output: answer });
    return res.json({ answer, sources: [] });
  }

  const context = hits.map((h, i) => `[Excerpt ${i + 1}]\n${h.text}`).join('\n\n');
  const answer = await generate(
    `Answer the student's question using only the excerpts. Cite excerpt numbers such as [Excerpt 1]. Question: ${question}`,
    context
  );
  const sources = hits.map((h, i) => ({ label: `Excerpt ${i + 1}`, text: h.text.slice(0, 240) + '…' }));
  await AIInteraction.create({
    user: req.user._id,
    note: note._id,
    type: 'qa',
    question,
    output: answer,
    sources: hits.map((h) => h.index),
  });
  res.json({ answer, sources });
});

export default r;
