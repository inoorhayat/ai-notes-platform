import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const EMPTY = { title: '', subject: '', semester: '', unit: '', topic: '', tags: '', description: '' };

export default function Upload() {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [status, setStatus] = useState(null); // { id, state }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/notes/subjects')
      .then((d) => setSubjects(d.items))
      .catch(() => {});
  }, []);

  // Poll until background processing finishes.
  useEffect(() => {
    if (!status || status.state !== 'processing') return;
    const timer = setInterval(async () => {
      try {
        const d = await api(`/notes/${status.id}`);
        if (d.note.status !== 'processing') setStatus({ id: status.id, state: d.note.status });
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [status]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError('Choose a PDF, TXT or MD file first');
    setError('');
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('file', file);
    try {
      const d = await api('/notes', { method: 'POST', form: fd });
      setStatus({ id: d.note._id, state: 'processing' });
      setForm(EMPTY);
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Contributor desk</p>
        <h1>
          Publish a <em>note</em>
        </h1>
        <p className="muted">PDF, TXT or MD, up to 10 MB. Text is extracted and indexed for AI tools.</p>
      </header>

      <form className="card form-grid" onSubmit={submit}>
        <label className="span-2">
          Title
          <input required value={form.title} onChange={set('title')} />
        </label>
        <label>
          Subject
          <input required list="subject-options" value={form.subject} onChange={set('subject')} />
          <datalist id="subject-options">
            {subjects.map((s) => (
              <option key={s._id} value={s.name} />
            ))}
          </datalist>
        </label>
        <label>
          Semester
          <input value={form.semester} onChange={set('semester')} />
        </label>
        <label>
          Unit
          <input value={form.unit} onChange={set('unit')} />
        </label>
        <label>
          Topic
          <input value={form.topic} onChange={set('topic')} />
        </label>
        <label className="span-2">
          Tags (comma separated)
          <input value={form.tags} onChange={set('tags')} placeholder="deadlock, paging, revision" />
        </label>
        <label className="span-2">
          Description
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </label>
        <label className="span-2">
          File
          <input type="file" accept=".pdf,.txt,.md" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>

        {error && <p className="error span-2">{error}</p>}
        <div className="span-2 actions">
          <button className="primary" disabled={busy}>
            {busy ? 'Uploading…' : 'Publish note'}
          </button>
        </div>
      </form>

      {status && (
        <div className="card status-box">
          {status.state === 'processing' && <p>Extracting text and building the study index…</p>}
          {status.state === 'ready' && (
            <p>
              Ready. <Link to={`/notes/${status.id}`}>Open the note →</Link>
            </p>
          )}
          {status.state === 'failed' && (
            <p className="error">
              Processing failed. Make sure the PDF has selectable text (not only scanned images).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
