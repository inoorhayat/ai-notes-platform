import { useEffect, useState } from 'react';
import { api } from '../api.js';
import NoteCard from '../components/NoteCard.jsx';

export default function Bookmarks() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api('/notes/bookmarks')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, []);

  if (!items) return <p className="muted">Loading…</p>;

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Saved</p>
        <h1>
          Your <em>shelf</em>
        </h1>
      </header>
      {items.length === 0 ? (
        <p className="muted empty">Nothing saved yet. Open a note and tap Save.</p>
      ) : (
        <div className="grid">
          {items.map((n) => (
            <NoteCard key={n._id} note={n} />
          ))}
        </div>
      )}
    </section>
  );
}
