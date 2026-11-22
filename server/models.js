import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name, required: true });

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'contributor', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

const subjectSchema = new Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);

const noteSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, required: true, trim: true },
    semester: { type: String, default: '' },
    unit: { type: String, default: '' },
    topic: { type: String, default: '' },
    tags: { type: [String], default: [] },
    owner: ref('User'),
    fileName: String,
    mimeType: String,
    filePath: { type: String, select: false },
    chunks: { type: [String], select: false },
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    visibility: { type: String, enum: ['public', 'hidden'], default: 'public' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const bookmarkSchema = new Schema({ user: ref('User'), note: ref('Note') }, { timestamps: true });
bookmarkSchema.index({ user: 1, note: 1 }, { unique: true });

const reportSchema = new Schema(
  {
    reporter: ref('User'),
    note: ref('Note'),
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const aiInteractionSchema = new Schema(
  {
    user: ref('User'),
    note: ref('Note'),
    type: { type: String, enum: ['summary', 'topics', 'questions', 'qa'], required: true },
    question: String,
    output: String,
    sources: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
export const Subject = model('Subject', subjectSchema);
export const Note = model('Note', noteSchema);
export const Bookmark = model('Bookmark', bookmarkSchema);
export const Report = model('Report', reportSchema);
export const AIInteraction = model('AIInteraction', aiInteractionSchema);
