import { useState, useEffect } from 'react';
import api from '../../api/axios';

const ROLES = ['MEMBRE', 'REFERENT', 'PARTENAIRE', 'ADMIN'];

export default function AdminUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    fetchUtilisateurs();
  }, []);

  const fetchUtilisateurs = async () => {
    try {
      const res = await api.get('/admin/utilisateurs');
      setUtilisateurs(res.data);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const changerRole = async (id, role) => {
    try {
      const res = await api.patch(`/admin/utilisateurs/${id}/role?role=${role}`);
      setUtilisateurs(prev => prev.map(u => u.id === id ? res.data : u));
      setMessage(`✅ Rôle mis à jour.`);
    } catch {
      setError('Erreur lors du changement de rôle.');
    }
  };

  const toggleActif = async (id) => {
    try {
      const res = await api.patch(`/admin/utilisateurs/${id}/actif`);
      setUtilisateurs(prev => prev.map(u => u.id === id ? res.data : u));
      setMessage('✅ Statut mis à jour.');
    } catch {
      setError('Erreur lors de la mise à jour du statut.');
    }
  };

  const supprimerUtilisateur = async (id, email) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${email} ?`)) return;
    try {
      await api.delete(`/admin/utilisateurs/${id}`);
      setUtilisateurs(prev => prev.filter(u => u.id !== id));
      setMessage('✅ Utilisateur supprimé.');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const utilisateursFiltres = utilisateurs.filter(u =>
    u.prenom?.toLowerCase().includes(recherche.toLowerCase()) ||
    u.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
    u.email?.toLowerCase().includes(recherche.toLowerCase())
  );

  if (loading) return <p style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#1A3C5E', marginBottom: '0.5rem' }}>👥 Gestion des utilisateurs</h1>
      <p style={{ color: '#4A6A8A', marginBottom: '1.5rem' }}>
        {utilisateurs.length} utilisateur(s) enregistré(s)
      </p>

      {message && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="🔍 Rechercher par nom, prénom ou email..."
        value={recherche}
        onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
        style={{
          width: '100%', padding: '0.6rem 1rem', borderRadius: '8px',
          border: '1px solid #ccc', marginBottom: '1.5rem',
          fontSize: '0.95rem', boxSizing: 'border-box'
        }}
      />

      {/* Tableau */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F0F4F8' }}>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rôle</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Inscription</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateursFiltres.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#4A6A8A' }}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              utilisateursFiltres.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #E2EAF0' }}>
                  <td style={tdStyle}>
                    <strong style={{ color: '#1A3C5E' }}>{u.prenom} {u.nom}</strong>
                  </td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <select
                      value={u.role}
                      onChange={e => changerRole(u.id, e.target.value)}
                      style={{
                        padding: '0.3rem 0.5rem', borderRadius: '6px',
                        border: '1px solid #ccc', fontSize: '0.85rem',
                        background: roleColor(u.role), color: '#fff', cursor: 'pointer'
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} style={{ background: '#fff', color: '#333' }}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: u.actif ? '#d4edda' : '#f8d7da',
                      color: u.actif ? '#155724' : '#721c24',
                      borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem'
                    }}>
                      {u.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {u.dateInscription ? new Date(u.dateInscription).toLocaleDateString('fr-BE') : '—'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => toggleActif(u.id)}
                        style={{
                          background: u.actif ? '#ffc107' : '#28a745',
                          color: '#fff', border: 'none', borderRadius: '6px',
                          padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                      >
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => supprimerUtilisateur(u.id, u.email)}
                        style={{
                          background: '#dc3545', color: '#fff', border: 'none',
                          borderRadius: '6px', padding: '0.3rem 0.7rem',
                          cursor: 'pointer', fontSize: '0.8rem'
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '0.75rem 1rem', textAlign: 'left',
  fontSize: '0.85rem', color: '#4A6A8A',
  fontWeight: 600, borderBottom: '2px solid #E2EAF0'
};

const tdStyle = {
  padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#333'
};

function roleColor(role) {
  switch (role) {
    case 'ADMIN':      return '#dc3545';
    case 'REFERENT':   return '#17a2b8';
    case 'PARTENAIRE': return '#fd7e14';
    default:           return '#1A3C5E';
  }
}