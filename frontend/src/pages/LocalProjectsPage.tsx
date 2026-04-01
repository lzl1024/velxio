import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProjects, type ProjectResponse } from '../services/projectService';
import { AppHeader } from '../components/layout/AppHeader';
import { useSEO } from '../utils/useSEO';
import './UserProfilePage.css';

export const LocalProjectsPage: React.FC = () => {
  useSEO({
    title: 'My Projects — Velxio',
    description: 'Your locally saved Arduino projects.',
    url: 'https://velxio.dev/projects',
    noindex: true,
  });

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyProjects()
      .then(setProjects)
      .catch(() => setError('Could not load projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="profile-page">
      <AppHeader />
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-username">My Projects</h1>
          <Link to="/editor" className="profile-new-btn">+ New project</Link>
        </div>

        {loading && <p className="profile-muted">Loading…</p>}
        {error && <p className="profile-error">{error}</p>}
        {!loading && !error && projects.length === 0 && (
          <p className="profile-muted">No saved projects yet. Open the editor and save one!</p>
        )}

        <div className="profile-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/project/${p.id}`} className="profile-card">
              <div className="profile-card-title">{p.name}</div>
              {p.description && <div className="profile-card-desc">{p.description}</div>}
              <div className="profile-card-meta">
                <span className="profile-badge">{p.board_type}</span>
                <span className="profile-date">{new Date(p.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
