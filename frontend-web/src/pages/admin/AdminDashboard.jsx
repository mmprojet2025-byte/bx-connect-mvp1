import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => setError('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>

      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#1A3C5E', margin: 0 }}>🛡️ Back-office Admin</h1>
        <p style={{ color: '#4A6A8A', marginTop: '0.5rem' }}>
          Tableau de bord — BX-CONNECT
        </p>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Cartes statistiques */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Utilisateurs total" value={stats.totalUtilisateurs} color="#2E86AB" icon="👥" />
          <StatCard label="Membres actifs" value={stats.membresActifs} color="#28a745" icon="✅" />
          <StatCard label="Activités" value={stats.totalActivites} color="#F4A261" icon="🎯" />
          <StatCard label="Inscriptions" value={stats.totalInscriptions} color="#6f42c1" icon="📋" />
          <StatCard label="Admins" value={stats.totalAdmins} color="#dc3545" icon="🛡️" />
          <StatCard label="Référents" value={stats.totalReferents} color="#17a2b8" icon="👤" />
          <StatCard label="Membres" value={stats.totalMembres} color="#1A3C5E" icon="🙋" />
          <StatCard label="Partenaires" value={stats.totalPartenaires} color="#fd7e14" icon="🤝" />
        </div>
      )}

      {/* Navigation rapide */}
      <h2 style={{ color: '#1A3C5E', marginBottom: '1rem' }}>Gestion</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        <NavCard
          to="/admin/utilisateurs"
          icon="👥"
          title="Utilisateurs"
          description="Gérer les comptes, rôles et accès"
          color="#2E86AB"
        />
        <NavCard
          to="/admin/activites"
          icon="🎯"
          title="Activités"
          description="Valider, modifier, supprimer les activités"
          color="#F4A261"
        />
        <NavCard
          to="/admin/projets"
          icon="🚀"
          title="Projets"
          description="Approuver et suivre les projets"
          color="#28a745"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#4A6A8A', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

function NavCard({ to, icon, title, description, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          cursor: 'pointer',
          transition: 'transform 0.15s',
          borderTop: `3px solid ${color}`,
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
        <h3 style={{ margin: '0 0 0.5rem', color: '#1A3C5E' }}>{title}</h3>
        <p style={{ margin: 0, color: '#4A6A8A', fontSize: '0.85rem' }}>{description}</p>
      </div>
    </Link>
  );
}