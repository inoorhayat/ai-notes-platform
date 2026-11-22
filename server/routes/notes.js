import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { Note, Bookmark, Report, Subject } from '../models.js';
import { requireAuth, requireRole, canView, isOwner, httpError } from '../middleware/auth.js';
import { extractText } from '../services/extract.js';
import { chunkText } from '../services/retrieval.js';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED_EXT = ['.pdf', '.txt', '.md'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (v) => new RegExp(`^${esc(String(v))}$`, 'i');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(httpError(422, 'Only PDF, TXT or MD files are supported'));
  },
});

// Runs after a 201 response: extract text, chunk it, mark the note ready (or failed).
async function processNote(id) {
  const note = await Note.findById(id).select('+filePath');
  try {
    note.chunks = chunkText(await extractText(note.filePath, note.fileName));
    if (note.chunks.length === 0) throw new Error('No readable text found');
    note.status = 'ready';
  } catch (err) {
    console.error('Note processing failed:', err.message);
    note.status = 'failed';
  }
  await note.save();
}

async function loadAccessible(id, user, select = '') {
  if (!mongoose.isValidObjectId(id)) return null;
  const q = Note.findById(id);
  if (select) q.select(select);
  const note = await q.populate('owner', 'name');
  return note && canView(note, user) ? note : null;
}

async function findOwned(id, user) {
  if (!mongoose.isValidObjectId(id)) return null;
  const note = await Note.findById(id).select('+filePath');
  return note && (isOwner(note, user) || user.role === 'admin') ? note : null;
}

const r = Router();
r.use(requireAuth);

r.get('/subjects', async (req, res) => {
  res.json({ items: await Subject.find().sort({ name: 1 }) });
});

r.get('/bookmarks', async (req, res) => {
  const items = await Bookmark.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'note', select: '-filePath', populate: { path: 'owner', select: 'name' } });
  res.json({ items: items.map((b) => b.note).filter(Boolean) });
});

r.get('/', async (req, res) => {
  const { q = '', subject = '', semester = '', unit = '', topic = '', tag = '', page = '1' } = req.query;
  const and = [];
  if (req.user.role !== 'admin') {
    and.push({ $or: [{ status: 'ready', visibility: 'public' }, { owner: req.user._id }] });
  }
  if (q) {
    const rx = new RegExp(esc(String(q)), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }, { subject: rx }, { topic: rx }, { tags: rx }] });
  }
  if (subject) and.push({ subject: exact(subject) });
  if (semester) and.push({ semester: exact(semester) });
  if (unit) and.push({ unit: exact(unit) });
  if (topic) and.push({ topic: exact(topic) });
  if (tag) and.push({ tags: exact(tag) });

  const filter = and.length ? { $and: and } : {};
  const p = Math.max(1, parseInt(page, 10) || 1);
  const limit = 12;
  const [items, total] = await Promise.all([
    Note.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit).populate('owner', 'name'),
    Note.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.get('/:id', async (req, res) => {
  const note = await loadAccessible(req.params.id, req.user);
  if (!note) throw httpError(404, 'Note not found');
  if (!isOwner(note, req.user)) await Note.updateOne({ _id: note._id }, { $inc: { views: 1 } });
  const bookmarked = !!(await Bookmark.exists({ user: req.user._id, note: note._id }));
  res.json({ note: { ...note.toObject(), bookmarked } });
});

// Contributor / admin upload: responds 201 with status "processing", then indexes in the background.
r.post('/', requireRole('contributor', 'admin'), upload.single('file'), async (req, res) => {
  const meta = req.body || {};
  if (!req.file) throw httpError(422, 'Please attach a PDF, TXT or MD file');
  if (!meta.title?.trim() || !meta.subject?.trim()) {
    await fsp.unlink(req.file.path).catch(() => {});
    throw httpError(422, 'Title and subject are required');
  }
  const subject = meta.subject.trim();
  const tags = String(meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15);
  const note = await Note.create({
    title: meta.title.trim(),
    subject,
    description: meta.description || '',
    semester: meta.semester || '',
    unit: meta.unit || '',
    topic: meta.topic || '',
    tags,
    owner: req.user._id,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    filePath: req.file.path,
    status: 'processing',
  });
  if (!(await Subject.exists({ name: subject }))) await Subject.create({ name: subject }).catch(() => {});

  res.status(201).json({ note: { _id: note._id, title: note.title, status: note.status } });
  processNote(note._id).catch((err) => console.error('Background processing error:', err));
});

r.patch('/:id', async (req, res) => {
  const note = await findOwned(req.params.id, req.user);
  if (!note) throw httpError(404, 'Note not found');
  for (const f of ['title', 'description', 'subject', 'semester', 'unit', 'topic']) {
    if (req.body?.[f] !== undefined) note[f] = String(req.body[f]).trim();
  }
  if (Array.isArray(req.body?.tags)) note.tags = req.body.tags.slice(0, 15);
  await note.save();
  res.json({ ok: true });
});

r.delete('/:id', async (req, res) => {
  const note = await findOwned(req.params.id, req.user);
  if (!note) throw httpError(404, 'Note not found');
  await Promise.all([
    Note.deleteOne({ _id: note._id }),
    Bookmark.deleteMany({ note: note._id }),
    Report.deleteMany({ note: note._id }),
  ]);
  if (note.filePath) await fsp.unlink(note.filePath).catch(() => {});
  res.json({ ok: true });
});

r.get('/:id/file', async (req, res) => {
  const note = await loadAccessible(req.params.id, req.user, '+filePath');
  if (!note?.filePath || !fs.existsSync(note.filePath)) {
    throw httpError(404, 'The original file is no longer available');
  }
  res.download(note.filePath, note.fileName);
});

r.post('/:id/bookmark', async (req, res) => {
  const note = await loadAccessible(req.params.id, req.user);
  if (!note) throw httpError(404, 'Note not found');
  const removed = await Bookmark.findOneAndDelete({ user: req.user._id, note: note._id });
  if (removed) return res.json({ bookmarked: false });
  await Bookmark.create({ user: req.user._id, note: note._id });
  res.json({ bookmarked: true });
});

r.post('/:id/report', async (req, res) => {
  const note = await loadAccessible(req.params.id, req.user);
  if (!note) throw httpError(404, 'Note not found');
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 5) throw httpError(422, 'Please describe the problem (at least 5 characters)');
  await Report.create({ reporter: req.user._id, note: note._id, reason });
  res.status(201).json({ ok: true });
});

export default r;
