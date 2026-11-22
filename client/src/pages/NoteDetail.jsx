import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, download } from '../api.js';
import { useAuth } from '../auth.jsx';
import AIPanel from '../components/AIPanel.jsx';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setNote(null);
    setError('');
    api(`/notes/${id}`)
      .then((d) => setNote(d.note))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <p className="error center-block">
        {error} <Link to="/">Back to library</Link>
      </p>
    );
  }
  if (!note) return <p className="muted">Loading note…</p>;

  const canManage = user.role === 'admin' || String(note.owner?._id) === String(user.id);

  const toggleBookmark = async () => {
    const d = await api(`/notes/${id}/bookmark`, { method: 'POST' });
    setNote((n) => ({ ...n, bookmarked: d.bookmarked }));
  };

  const remove = async () => {
    if (!window.confirm('Delete this note permanently?')) return;
    await api(`/notes/${id}`, { method: 'DELETE' });
    navigate('/');
  };

  const sendReport = async (e) => {
    e.preventDefault();
    try {
      await api(`/notes/${id}/report`, { method: 'POST', body: { reason } });
      setNotice('Thanks. The moderation team will review this.');
      setReporting(false);
      setReason('');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const place = [note.semester, note.unit].filter(Boolean).join(' · ');

  return (
    <section className="detail">
      <div>
        <p className="eyebrow">
          {note.subject}
          {place && ` · ${place}`}
        </p>
        <h1>{note.title}</h1>
        <p className="lede">{note.description || 'No description provided.'}</p>
        <div className="chips">
          {note.topic && <span className="chip">{note.topic}</span>}
          {(note.tags || []).map((t) => (
            <span className="chip ghost-chip" key={t}>
              #{t}
            </span>
          ))}
        </div>
        <p className="muted small">
          Shared by {note.owner?.name} · {new Date(note.createdAt).toLocaleDateString()} · {note.views} views
        </p>

        {notice && <p className="flash">{notice}</p>}
        {note.status !== 'ready' && (
          <p className="flash">This note is {note.status}. AI tools unlock once processing completes.</p>
        )}

        <div className="actions">
          <button onClick={toggleBookmark} className={note.bookmarked ? 'primary' : ''}>
            {note.bookmarked ? '★ Saved' : '☆ Save'}
          </button>
          <button onClick={() => download(`/notes/${id}/file`, note.fileName)}>Download original</button>
          <button className="ghost" onClick={() => setReporting(!reporting)}>
            Report
          </button>
          {canManage && (
            <button className="danger" onClick={remove}>
              Delete
            </button>
          )}
        </div>

        {reporting && (
          <form className="card report" onSubmit={sendReport}>
            <textarea
              rows={3}
              placeholder="What is wrong with this resource?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button className="primary">Send report</button>
          </form>
        )}
      </div>

      <AIPanel noteId={id} ready={note.status === 'ready'} />
    </section>
  );
}
