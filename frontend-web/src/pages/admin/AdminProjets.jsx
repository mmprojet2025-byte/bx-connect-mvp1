import { useState, useEffect } from 'react';
import api from '../../api/axios';

const STATUTS = ['BROUILLON', 'SOUMIS', 'APPROUVE', 'EN_COURS', 'TERMINE', 'REJETE'];

export default function AdminProjets() {
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  useEffect(() => {
    fetchProjets();
  }, []);

  const fetchProjets = async () => {
    try {
      const res = await api.get('/projets/admin/tous');
      setProjets(res.data);
    } catch {
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const changerStatut = async (id, statut) => {
    try {
      const res = await api.patch(`/projets/${id}/statut?statut=${statut}`);
      setProjets(prev => prev.map(p => p.id === id ? res.data : p));
      setMessage(`✅ Statut mis à jour : ${statut}`);
      setError('');
    } catch {
      setError('Erreur lors du changement de statut.');
    }
  };

  const supprimerProjet = async (id, titre) => {
    if (!window.confirm(`Supprimer définitivement le projet "${titre}" ?`)) return;
    try {
      await api.delete(`/projets/${id}`);
      setProjets(prev => prev.filter(p => p.id !== id));
      setMessage('✅ Projet supprimé.');
      setError('');
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const projetsFiltres = projets.filter(p => {
    const matchRecherche = p.titre?.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut ? p.statut === filtreStatut : true;
    return matchRecherche && matchStatut;
  });

  if (loading) return <p style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#1A3C5E', marginBottom: '0.5rem' }}>🚀 Gestion des projets</h1>
      <p style={{ color: '#4A6A8A', marginBottom: '1.5rem' }}>
        {projets.length} projet(s) au total
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

      {/* Résumé par statut */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {STATUTS.map(s => {
          const count = projets.filter(p => p.statut === s).length;
          return (
            <div
              key={s}
              onClick={() => setFiltreStatut(filtreStatut === s ? '' : s)}
              style={{
                background: filtreStatut === s ? statutColor(s) : '#F0F4F8',
                color: filtreStatut === s ? '#fff' : '#4A6A8A',
                borderRadius: '20px', padding: '0.3rem 0.9rem',
                fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
                border: `2px solid ${statutColor(s)}`
              }}
            >
              {s} ({count})
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Rechercher par titre..."
          value={recherche}
          onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
          style={{
            flex: 1, minWidth: '200px', padding: '0.6rem 1rem',
            borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem'
          }}
        />
      </div>

      {/* Cartes projets */}
      {projetsFiltres.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#4A6A8A', background: '#fff', borderRadius: '12px' }}>
          Aucun projet trouvé.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {projetsFiltres.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              overflow: 'hidden',
              borderTop: `4px solid ${statutColor(p.statut)}`
            }}>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: '1rem' }}>{p.titre}</h3>
                  <span style={{
                    background: statutColor(p.statut), color: '#fff',
                    borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem',
                    whiteSpace: 'nowrap', marginLeft: '0.5rem'
                  }}>
                    {p.statut}
                  </span>
                </div>

                {p.description && (
                  <p style={{ color: '#4A6A8A', fontSize: '0.85rem', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                    {p.description.length > 100 ? p.description.substring(0, 100) + '...' : p.description}
                  </p>
                )}

                <div style={{ fontSize: '0.8rem', color: '#4A6A8A', marginBottom: '0.5rem' }}>
                  💰 Budget demandé : <strong>{p.budgetDemande ? `${p.budgetDemande} €` : 'Non défini'}</strong>
                </div>

                {p.porteurPrenom && (
                  <div style={{ fontSize: '0.8rem', color: '#4A6A8A', marginBottom: '1rem' }}>
                    👤 Porteur : <strong>{p.porteurPrenom} {p.porteurNom}</strong>
                  </div>
                )}

                {/* Changer statut */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={p.statut}
                    onChange={e => changerStatut(p.id, e.target.value)}
                    style={{
                      flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px',
                      border: '1px solid #ccc', fontSize: '0.85rem', background: '#fff'
                    }}
                  >
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => supprimerProjet(p.id, p.titre)}
                    style={{
                      background: '#dc3545', color: '#fff', border: 'none',
                      borderRadius: '6px', padding: '0.4rem 0.75rem',
                      cursor: 'pointer', fontSize: '0.8rem'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statutColor(statut) {
  switch (statut) {
    case 'APPROUVE':  return '#28a745';
    case 'EN_COURS':  return '#2E86AB';
    case 'TERMINE':   return '#6c757d';
    case 'REJETE':    return '#dc3545';
    case 'SOUMIS':    return '#17a2b8';
    default:          return '#ffc107';
  }
}