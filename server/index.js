import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { User } from './models.js';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the Express server also serves the built React app.
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 422;
    message = 'File is too large (maximum 10 MB)';
  }
    if (status >= 500 && !err.expose) {
    console.error(err);
    message = 'Something went wrong. Please try again.';
  }

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  if (await User.exists({ role: 'admin' })) return;
  await User.create({
    name: 'Administrator',
    email: ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    role: 'admin',
  });
  console.log(`Admin account created for ${ADMIN_EMAIL}`);
}

const PORT = process.env.PORT || 5000;
async function start() {
  if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set');
  await mongoose.connect(process.env.MONGODB_URI);
  await seedAdmin();
  app.listen(PORT, () => console.log(`Margin is running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
