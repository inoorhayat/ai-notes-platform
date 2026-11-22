import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { requireAuth, httpError } from '../middleware/auth.js';

const r = Router();
const sign = (u) => jwt.sign({ sub: String(u._id), role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

r.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    throw httpError(422, 'Name, email and a password of 6+ characters are required');
  }
  if (await User.exists({ email: email.toLowerCase().trim() })) {
    throw httpError(409, 'This email is already registered');
  }
  const user = await User.create({
    name: name.trim(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    // Admins are never self-assigned; only student or contributor can be chosen at sign-up.
    role: role === 'contributor' ? 'contributor' : 'student',
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    throw httpError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') throw httpError(403, 'This account has been suspended');
  res.json({ token: sign(user), user: publicUser(user) });
});

r.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default r;
