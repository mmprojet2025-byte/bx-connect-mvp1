import { useState, useEffect } from 'react';
import api from '../../api/axios';

const STATUTS = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];

export default function AdminActivites() {
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  useEffect(() => {
    fetchActivites();
  }, []);

  const fetchActivites = async () => {
    try {
      const res = await api.get('/activites/admin/toutes');
      setActivites(res.data);
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
    }
  };

  const changerStatut = async (id, statut) => {
    try {
      const res = await api.patch(`/activites/${id}/statut?statut=${statut}`);
      setActivites(prev => prev.map(a => a.id === id ? res.data : a));
      setMessage(`✅ Statut mis à jour : ${statut}`);
    } catch {
      setError('Erreur lors du changement de statut.');
    }
  };

  const supprimerActivite = async (id, titre) => {
    if (!window.confirm(`Supprimer définitivement l'activité "${titre}" ?`)) return;
    try {
      await api.delete(`/activites/${id}`);
      setActivites(prev => prev.filter(a => a.id !== id));
      setMessage('✅ Activité supprimée.');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const activitesFiltrees = activites.filter(a => {
    const matchRecherche = a.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
      a.lieu?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? a.statut === filtreStatut : true;
    return matchRecherche && matchStatut;
  });

  if (loading) return <p style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#1A3C5E', marginBottom: '0.5rem' }}>🎯 Gestion des activités</h1>
      <p style={{ color: '#4A6A8A', marginBottom: '1.5rem' }}>
        {activites.length} activité(s) au total
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

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Rechercher par titre ou lieu..."
          value={recherche}
          onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
          style={{
            flex: 1, minWidth: '200px', padding: '0.6rem 1rem',
            borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem'
          }}
        />
        <select
          value={filtreStatut}
          onChange={e => setFiltreStatut(e.target.value)}
          style={{
            padding: '0.6rem 1rem', borderRadius: '8px',
            border: '1px solid #ccc', fontSize: '0.95rem', background: '#fff'
          }}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#F0F4F8' }}>
              <th style={thStyle}>Titre</th>
              <th style={thStyle}>Lieu</th>
              <th style={thStyle}>Date début</th>
              <th style={thStyle}>Créateur</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activitesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#4A6A8A' }}>
                  Aucune activité trouvée.
                </td>
              </tr>
            ) : (
              activitesFiltrees.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #E2EAF0' }}>
                  <td style={tdStyle}>
                    <strong style={{ color: '#1A3C5E' }}>{a.titre}</strong>
                    {a.gratuite
                      ? <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#28a745' }}>🆓</span>
                      : <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#F4A261' }}>💶 {a.prix}€</span>
                    }
                  </td>
                  <td style={tdStyle}>{a.lieu || '—'}</td>
                  <td style={tdStyle}>
                    {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString('fr-BE') : '—'}
                  </td>
                  <td style={tdStyle}>
                    {a.createurPrenom} {a.createurNom}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={a.statut}
                      onChange={e => changerStatut(a.id, e.target.value)}
                      style={{
                        padding: '0.3rem 0.5rem', borderRadius: '6px',
                        border: '1px solid #ccc', fontSize: '0.85rem',
                        background: statutColor(a.statut), color: '#fff', cursor: 'pointer'
                      }}
                    >
                      {STATUTS.map(s => (
                        <option key={s} value={s} style={{ background: '#fff', color: '#333' }}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => supprimerActivite(a.id, a.titre)}
                      style={{
                        background: '#dc3545', color: '#fff', border: 'none',
                        borderRadius: '6px', padding: '0.3rem 0.7rem',
                        cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      Supprimer
                    </button>
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

function statutColor(statut) {
  switch (statut) {
    case 'PUBLIEE':   return '#28a745';
    case 'ANNULEE':   return '#dc3545';
    case 'TERMINEE':  return '#6c757d';
    default:          return '#ffc107';
  }
}