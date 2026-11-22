import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Margin<span>.</span>
        </Link>
        {user && (
          <nav>
            <NavLink to="/">Library</NavLink>
            <NavLink to="/bookmarks">Saved</NavLink>
            {['contributor', 'admin'].includes(user.role) && <NavLink to="/upload">Upload</NavLink>}
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
        )}
        {user ? (
          <div className="who">
            <span>{user.name}</span>
            <button className="ghost" onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <NavLink to="/login" className="pill">Sign in</NavLink>
        )}
      </header>
      <main>{children}</main>
      <footer>Margin · Notes shared with care. AI answers are study aids, not guaranteed truth.</footer>
    </div>
  );
}
