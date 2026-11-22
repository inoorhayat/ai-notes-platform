import { Router } from 'express';
import mongoose from 'mongoose';
import { User, Note, Report, Subject, AIInteraction } from '../models.js';
import { requireAuth, requireRole, httpError } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));

r.get('/stats', async (req, res) => {
  const [users, notes, openReports, aiRuns] = await Promise.all([
    User.countDocuments(),
    Note.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    AIInteraction.countDocuments(),
  ]);
  res.json({ users, notes, openReports, aiRuns });
});

r.get('/users', async (req, res) => {
  res.json({ items: await User.find().sort({ createdAt: -1 }).limit(200) });
});

r.patch('/users/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'User not found');
  const update = {};
  const { role, status } = req.body || {};
  if (['student', 'contributor', 'admin'].includes(role)) update.role = role;
  if (['active', 'suspended'].includes(status)) update.status = status;
  if (String(req.user._id) === req.params.id && update.status === 'suspended') {
    throw httpError(400, 'You cannot suspend your own account');
  }
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) throw httpError(404, 'User not found');
  res.json({ user });
});

r.get('/notes', async (req, res) => {
  res.json({ items: await Note.find().sort({ createdAt: -1 }).limit(200).populate('owner', 'name') });
});

r.patch('/notes/:id', async (req, res) => {
  const visibility = req.body?.visibility;
  if (!['public', 'hidden'].includes(visibility)) throw httpError(422, 'Visibility must be public or hidden');
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Note not found');
  const note = await Note.findByIdAndUpdate(req.params.id, { visibility }, { new: true });
  if (!note) throw httpError(404, 'Note not found');
  res.json({ note });
});

r.get('/reports', async (req, res) => {
  res.json({
    items: await Report.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('note', 'title visibility')
      .populate('reporter', 'name email'),
  });
});

r.patch('/reports/:id', async (req, res) => {
  const { action, hideNote } = req.body || {};
  if (!['resolve', 'dismiss'].includes(action)) throw httpError(422, 'Action must be resolve or dismiss');
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Report not found');
  const report = await Report.findById(req.params.id);
  if (!report) throw httpError(404, 'Report not found');
  report.status = action === 'resolve' ? 'resolved' : 'dismissed';
  report.reviewer = req.user._id;
  await report.save();
  if (action === 'resolve' && hideNote) await Note.updateOne({ _id: report.note }, { visibility: 'hidden' });
  res.json({ report });
});

r.get('/subjects', async (req, res) => {
  res.json({ items: await Subject.find().sort({ name: 1 }) });
});

r.post('/subjects', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw httpError(422, 'Subject name is required');
  try {
    const subject = await Subject.create({ name });
    res.status(201).json({ subject });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, 'That subject already exists');
    throw err;
  }
});

r.delete('/subjects/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Subject not found');
  await Subject.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default r;
