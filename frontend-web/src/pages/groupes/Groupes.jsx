import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function Groupes() {
  const [groupes, setGroupes] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '', type: 'GENERAL' });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    fetchGroupes();
  }, []);

  const fetchGroupes = async () => {
    try {
      const res = await api.get('/groupes');
      setGroupes(res.data);
    } catch {
      setError('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/mes-groupes');
      setMesGroupes(res.data);
    } catch {
      // silencieux si pas connecté
    }
  };

  useEffect(() => {
    if (user) fetchMesGroupes();
  }, [user]);

  const handleRejoindre = async (groupeId) => {
    setMessage('');
    setError('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      setMessage('✅ Vous avez rejoint le groupe !');
      fetchGroupes();
      fetchMesGroupes();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande.');
    }
  };

  const handleQuitter = async (groupeId) => {
    setMessage('');
    setError('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      setMessage('✅ Vous avez quitté le groupe.');
      fetchGroupes();
      fetchMesGroupes();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande.');
    }
  };

  const handleCreer = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/groupes', form);
      setMessage('✅ Groupe créé avec succès !');
      setShowForm(false);
      setForm({ nom: '', description: '', type: 'GENERAL' });
      fetchGroupes();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'REFERENT';
  const mesGroupesIds = mesGroupes.map((g) => g.id);
  const groupesFiltres = groupes.filter((g) =>
    g.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  if (loading) return <p style={{ padding: '2rem' }}>Chargement des groupes...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#1A3C5E', margin: 0 }}>👥 Groupes</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
          >
            {showForm ? 'Annuler' : '+ Nouveau groupe'}
          </button>
        )}
      </div>

      {/* Messages */}
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

      {/* Formulaire création groupe (Admin/Référent) */}
      {showForm && isAdmin && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#1A3C5E', marginTop: 0 }}>Nouveau groupe</h2>
          <form onSubmit={handleCreer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Nom du groupe *</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                >
                  <option value="GENERAL">Général</option>
                  <option value="PROJET">Projet</option>
                  <option value="EVENEMENT">Événement</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <button
              type="submit"
              style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.5rem', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              Créer le groupe
            </button>
          </form>
        </div>
      )}

      {/* Mes groupes */}
      {user && mesGroupes.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#1A3C5E', fontSize: '1.1rem', marginBottom: '0.75rem' }}>📌 Mes groupes</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {mesGroupes.map((g) => (
              <span
                key={g.id}
                style={{ background: '#2E86AB', color: '#fff', borderRadius: '20px', padding: '4px 14px', fontSize: '0.85rem' }}
              >
                {g.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un groupe par nom..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* Liste des groupes */}
      {groupesFiltres.length === 0 ? (
        <p style={{ color: '#4A6A8A', textAlign: 'center', padding: '3rem' }}>
          Aucun groupe disponible pour le moment.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {groupesFiltres.map((groupe) => {
            const estMembre = mesGroupesIds.includes(groupe.id);
            const typeBadge = {
              ADMIN: { bg: '#f8d7da', color: '#721c24' },
              PROJET: { bg: '#d4edda', color: '#155724' },
              EVENEMENT: { bg: '#fff3cd', color: '#856404' },
              GENERAL: { bg: '#e2eaf0', color: '#1A3C5E' },
            }[groupe.type] || { bg: '#e2eaf0', color: '#1A3C5E' };

            return (
              <div
                key={groupe.id}
                style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: '1rem' }}>{groupe.nom}</h3>
                  <span style={{ background: typeBadge.bg, color: typeBadge.color, borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {groupe.type || 'GÉNÉRAL'}
                  </span>
                </div>

                {groupe.description && (
                  <p style={{ color: '#4A6A8A', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                    {groupe.description.length > 100 ? groupe.description.substring(0, 100) + '...' : groupe.description}
                  </p>
                )}

                <p style={{ color: '#4A6A8A', fontSize: '0.8rem', margin: 0 }}>
                  👤 {groupe.nombreMembres ?? 0} membre{(groupe.nombreMembres ?? 0) !== 1 ? 's' : ''}
                </p>

                {user && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {estMembre ? (
                      <button
                        onClick={() => handleQuitter(groupe.id)}
                        style={{ background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                      >
                        Quitter le groupe
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRejoindre(groupe.id)}
                        style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                      >
                        Rejoindre
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}