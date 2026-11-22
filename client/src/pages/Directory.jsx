import { useEffect, useState } from 'react';
import { api } from '../api.js';
import NoteCard from '../components/NoteCard.jsx';

const EMPTY = { q: '', subject: '', semester: '', topic: '' };

export default function Directory() {
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/notes/subjects')
      .then((d) => setSubjects(d.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(applied).filter(([, v]) => v));
    const qs = new URLSearchParams({ ...params, page: String(page) });
    api(`/notes?${qs}`)
      .then(setData)
      .catch(() => setData({ items: [], pages: 1, total: 0 }))
      .finally(() => setLoading(false));
  }, [applied, page]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  const field = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Library</p>
        <h1>
          Notes worth <em>keeping</em>
        </h1>
        <p className="muted">{data.total} resource(s) match your search.</p>
      </header>

      <form className="filters card" onSubmit={submit}>
        <input className="grow" placeholder="Search title, topic, tags…" value={filters.q} onChange={field('q')} />
        <select value={filters.subject} onChange={field('subject')}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s._id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <input placeholder="Semester" value={filters.semester} onChange={field('semester')} />
        <input placeholder="Topic" value={filters.topic} onChange={field('topic')} />
        <button className="primary">Search</button>
      </form>

      {loading ? (
        <p className="muted">Loading notes…</p>
      ) : data.items.length === 0 ? (
        <p className="muted empty">No notes match these filters yet.</p>
      ) : (
        <div className="grid">
          {data.items.map((n) => (
            <NoteCard key={n._id} note={n} />
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span className="muted">
            Page {page} of {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
