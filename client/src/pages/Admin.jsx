import { useEffect, useState } from 'react';
import { api } from '../api.js';

const TABS = ['Overview', 'Reports', 'Users', 'Notes', 'Subjects'];

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  const [flash, setFlash] = useState('');

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Administration</p>
        <h1>
          Moderation <em>desk</em>
        </h1>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {flash && <p className="flash">{flash}</p>}

      {tab === 'Overview' && <Overview />}
      {tab === 'Reports' && <Reports notify={setFlash} />}
      {tab === 'Users' && <Users notify={setFlash} />}
      {tab === 'Notes' && <Notes notify={setFlash} />}
      {tab === 'Subjects' && <Subjects notify={setFlash} />}
    </section>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api('/admin/stats').then(setS).catch(() => {});
  }, []);
  if (!s) return <p className="muted">Loading…</p>;
  return (
    <div className="stats">
      {[
        ['Users', s.users],
        ['Notes', s.notes],
        ['Open reports', s.openReports],
        ['AI runs', s.aiRuns],
      ].map(([label, value]) => (
        <div className="card stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Reports({ notify }) {
  const [items, setItems] = useState([]);
  const load = () => api('/admin/reports').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const act = async (id, action, hideNote = false) => {
    try {
      await api(`/admin/reports/${id}`, { method: 'PATCH', body: { action, hideNote } });
      notify(action === 'resolve' ? 'Report resolved' : 'Report dismissed');
      load();
    } catch (err) {
      notify(err.message);
    }
  };

  if (items.length === 0) return <p className="muted empty">No reports yet.</p>;
  return (
    <div className="stack">
      {items.map((r) => (
        <div className="card row" key={r._id}>
          <div>
            <b>{r.note?.title ?? 'Deleted note'}</b>
            <p className="muted small">
              Reported by {r.reporter?.name} · {new Date(r.createdAt).toLocaleDateString()}
            </p>
            <p>“{r.reason}”</p>
            <span className="chip">{r.status}</span>
          </div>
          {r.status === 'open' && (
            <div className="actions">
              <button className="primary" onClick={() => act(r._id, 'resolve', true)}>
                Hide note &amp; resolve
              </button>
              <button onClick={() => act(r._id, 'resolve')}>Resolve</button>
              <button className="ghost" onClick={() => act(r._id, 'dismiss')}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Users({ notify }) {
  const [items, setItems] = useState([]);
  const load = () => api('/admin/users').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const update = async (id, body) => {
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body });
      notify('User updated');
      load();
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => update(u._id, { role: e.target.value })}>
                  <option value="student">student</option>
                  <option value="contributor">contributor</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>{u.status}</td>
              <td>
                <button
                  className="ghost"
                  onClick={() => update(u._id, { status: u.status === 'active' ? 'suspended' : 'active' })}
                >
                  {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Notes({ notify }) {
  const [items, setItems] = useState([]);
  const load = () => api('/admin/notes').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const toggleVisibility = async (n) => {
    await api(`/admin/notes/${n._id}`, {
      method: 'PATCH',
      body: { visibility: n.visibility === 'public' ? 'hidden' : 'public' },
    });
    notify('Visibility updated');
    load();
  };

  const remove = async (n) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    await api(`/notes/${n._id}`, { method: 'DELETE' });
    notify('Note deleted');
    load();
  };

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Owner</th>
            <th>Processing</th>
            <th>Visibility</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((n) => (
            <tr key={n._id}>
              <td>{n.title}</td>
              <td>{n.owner?.name}</td>
              <td>{n.status}</td>
              <td>{n.visibility}</td>
              <td className="actions">
                <button className="ghost" onClick={() => toggleVisibility(n)}>
                  {n.visibility === 'public' ? 'Hide' : 'Publish'}
                </button>
                <button className="danger" onClick={() => remove(n)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Subjects({ notify }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const load = () => api('/notes/subjects').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/subjects', { method: 'POST', body: { name } });
      setName('');
      notify('Subject added');
      load();
    } catch (err) {
      notify(err.message);
    }
  };

  const del = async (id) => {
    await api(`/admin/subjects/${id}`, { method: 'DELETE' });
    notify('Subject removed');
    load();
  };

  return (
    <div className="stack">
      <form className="card filters" onSubmit={add}>
        <input className="grow" placeholder="New subject, e.g. Operating Systems" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary">Add subject</button>
      </form>
      <div className="chips">
        {items.map((s) => (
          <span className="chip removable" key={s._id}>
            {s.name}
            <button onClick={() => del(s._id)} aria-label={`Remove ${s.name}`}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
