import { Link } from 'react-router-dom';

export default function NoteCard({ note }) {
  const place = [note.semester, note.unit].filter(Boolean).join(' · ') || 'General';
  return (
    <Link to={`/notes/${note._id}`} className="note-card">
      <span className="chip">{note.subject}</span>
      <h3>{note.title}</h3>
      <p>{note.description || note.topic || 'No description provided.'}</p>
      <div className="meta">
        <span>{place}</span>
        <span>{note.owner?.name}</span>
      </div>
      {note.status && note.status !== 'ready' && <span className="status">{note.status}</span>}
    </Link>
  );
}
