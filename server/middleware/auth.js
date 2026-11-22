import jwt from 'jsonwebtoken';
import { User } from '../models.js';

export const httpError = (status, message) => Object.assign(new Error(message), { status });

// Admins see everything; owners see their own notes; everyone else sees ready, public notes.
export function canView(note, user) {
  if (user.role === 'admin') return true;
  if (String(note.owner?._id ?? note.owner) === String(user._id)) return true;
  return note.status === 'ready' && note.visibility === 'public';
}

export const isOwner = (note, user) => String(note.owner?._id ?? note.owner) === String(user._id);

export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Please log in again' });
  }
  const user = await User.findById(payload.sub).select('name email role status');
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Account unavailable' });
  }
  req.user = user;
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: 'You do not have permission for this action' });
