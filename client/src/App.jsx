import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Directory from './pages/Directory.jsx';
import NoteDetail from './pages/NoteDetail.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Upload from './pages/Upload.jsx';
import Admin from './pages/Admin.jsx';

function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted center-block">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Directory /></Guard>} />
        <Route path="/notes/:id" element={<Guard><NoteDetail /></Guard>} />
        <Route path="/bookmarks" element={<Guard><Bookmarks /></Guard>} />
        <Route path="/upload" element={<Guard roles={['contributor', 'admin']}><Upload /></Guard>} />
        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
