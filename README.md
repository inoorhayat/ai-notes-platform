# Margin · AI-Based Notes Sharing and Learning Platform

A web-based academic notes platform built from the SRS (FR01–FR12). Students browse, search, save and
study notes; contributors upload them; admins moderate. AI features (summary, key topics, practice
questions, note-grounded Q&A) run on **Google Gemini**.

## Stack
- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express 5 (REST API under `/api`)
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcrypt, role-based access (student / contributor / admin)
- **Files:** multer uploads, PDF text extraction with `pdf-parse`
- **AI:** Gemini via `@google/generative-ai`, keyword retrieval (RAG) over note chunks

## Folder structure
```
ai-notes-platform/
├── server/
│   ├── index.js            # Express app, error handling, admin seeding, serves React build
│   ├── models.js           # User, Subject, Note, Bookmark, Report, AIInteraction
│   ├── middleware/auth.js  # JWT auth, RBAC, access rules
│   ├── routes/
│   │   ├── auth.js         # FR01 register / login / me
│   │   ├── notes.js        # FR03–FR06, FR11 upload, search, view, bookmark, report
│   │   ├── ai.js           # FR07–FR10 summary, topics, questions, grounded Q&A
│   │   └── admin.js        # FR11–FR12 reports, users, notes, subjects, stats
│   └── services/
│       ├── extract.js      # PDF / TXT / MD text extraction
│       ├── retrieval.js    # chunking + retrieval
│       └── gemini.js       # Gemini client with grounding instructions
├── client/
│   ├── index.html, vite.config.js
│   └── src/
│       ├── App.jsx, main.jsx, auth.jsx, api.js, styles.css
│       ├── components/     # Layout, NoteCard, AIPanel
│       └── pages/          # Login, Directory, NoteDetail, Bookmarks, Upload, Admin
├── render.yaml             # one-click Render Blueprint
├── .env.example
└── package.json
```

## 1. Get your keys (free)
1. **MongoDB Atlas:** create a free cluster → Database Access (create a user) → Network Access
   (allow `0.0.0.0/0` for deployment) → Connect → copy the `mongodb+srv://…` URI.
2. **Gemini API key:** open https://aistudio.google.com/app/apikey → Create API key.

## 2. Run locally
```bash
cd ai-notes-platform
cp .env.example .env          # then fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, ADMIN_*
npm install
npm run dev:server            # terminal 1 → API on http://localhost:5000
npm run dev:client            # terminal 2 → UI on http://localhost:5173
```
Open http://localhost:5173, log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then register a
contributor account to test uploads.

## 3. Deploy on Render (recommended)
1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint** → select the repo (it reads `render.yaml`), or **New → Web Service**
   with build command `npm install && npm run build` and start command `npm start`.
3. Fill the secret environment variables: `MONGODB_URI`, `GEMINI_API_KEY`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`. `JWT_SECRET` is generated automatically.
4. Deploy. The app is served from one URL (UI + API together).

### Why not Vercel directly?
Vercel serverless functions are short-lived and read-only on disk, which does not suit PDF
processing and file uploads with this single-server design. If you must use Vercel, host the
frontend there and keep this Express service on Render, then set `VITE_API_URL` to the Render URL
before building the client.

## Notes and limitations
- **Uploaded PDFs are stored on the server disk.** On Render's free plan the disk is reset on
  redeploy, so downloads of original files can disappear. Extracted text and AI features are stored
  in MongoDB and keep working. For permanent file storage, add S3 or Cloudinary later.
- Free Render services sleep after inactivity; the first request may take ~30 seconds.
- AI answers are grounded in the note text and are study aids, not guaranteed truth (SRS §4).
- Version 1.0 scope follows SRS §2.6: no grading, no mobile app, no Redis (add later for caching).

## Future enhancements (SRS §8)
Audit log for admin actions, notifications, semantic/vector search, learning analytics dashboard.
