import { useState } from 'react';
import { api } from '../api.js';

const TABS = [
  ['summary', 'Summary'],
  ['topics', 'Key topics'],
  ['questions', 'Practice questions'],
  ['ask', 'Ask the note'],
];

export default function AIPanel({ noteId, ready }) {
  const [tab, setTab] = useState('summary');
  const [question, setQuestion] = useState('');
  const [output, setOutput] = useState('');
  const [sources, setSources] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const switchTab = (key) => {
    setTab(key);
    setOutput('');
    setSources([]);
    setError('');
  };

  async function run(type) {
    setBusy(true);
    setError('');
    setOutput('');
    setSources([]);
    try {
      if (type === 'ask') {
        const d = await api(`/ai/ask/${noteId}`, { method: 'POST', body: { question } });
        setOutput(d.answer);
        setSources(d.sources);
      } else {
        const d = await api(`/ai/${type}/${noteId}`, { method: 'POST' });
        setOutput(d.output);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="card ai">
      <p className="eyebrow">AI learning panel</p>
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => switchTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="muted">AI tools unlock once this note has finished processing.</p>
      ) : tab === 'ask' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run('ask');
          }}
        >
          <textarea
            rows={3}
            placeholder="Ask something this note covers…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="primary" disabled={busy || question.trim().length < 3}>
            {busy ? 'Thinking…' : 'Ask'}
          </button>
        </form>
      ) : (
        <button className="primary" disabled={busy} onClick={() => run(tab)}>
          {busy ? 'Thinking…' : 'Generate'}
        </button>
      )}

      {error && <p className="error">{error}</p>}
      {output && <article className="output">{output}</article>}
      {sources.length > 0 && (
        <details className="sources">
          <summary>Sources used</summary>
          {sources.map((s) => (
            <blockquote key={s.label}>
              <b>{s.label}.</b> {s.text}
            </blockquote>
          ))}
        </details>
      )}
      <p className="fine">Grounded in this note only. Verify important facts with your course material.</p>
    </aside>
  );
}
