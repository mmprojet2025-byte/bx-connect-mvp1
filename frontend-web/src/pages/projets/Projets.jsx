import { useState, useEffect } from 'react';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';

export default function Projets() {
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    titre: '',
    description: '',
    budgetDemande: '',
    imageUrl: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    fetchProjets();
  }, []);

  const fetchProjets = async () => {
    try {
      const res = await api.get('/projets');
      setProjets(res.data);
    } catch {
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/projets', {
        ...form,
        budgetDemande: parseFloat(form.budgetDemande) || 0,
      });
      setMessage('✅ Projet soumis avec succès !');
      setShowForm(false);
      setForm({ titre: '', description: '', budgetDemande: '', imageUrl: '' });
      fetchProjets();
    } catch {
      setError('Erreur lors de la soumission du projet.');
    }
  };

  const getStatutStyle = (statut) => {
    const styles = {
      BROUILLON:  { background: '#e2e3e5', color: '#383d41' },
      SOUMIS:     { background: '#fff3cd', color: '#856404' },
      APPROUVE:   { background: '#d4edda', color: '#155724' },
      EN_COURS:   { background: '#cce5ff', color: '#004085' },
      TERMINE:    { background: '#d1ecf1', color: '#0c5460' },
      REJETE:     { background: '#f8d7da', color: '#721c24' },
    };
    return styles[statut] || { background: '#e2e3e5', color: '#383d41' };
  };

  if (loading) return <p style={{ padding: '2rem' }}>Chargement des projets...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#1A3C5E', margin: 0 }}>🚀 Projets</h1>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
          >
            {showForm ? 'Annuler' : '+ Proposer un projet'}
          </button>
        )}
      </div>

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

      {/* Formulaire nouveau projet */}
      {showForm && user && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#1A3C5E', marginTop: 0 }}>Proposer un projet</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Image de couverture */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A', display: 'block', marginBottom: '0.5rem' }}>
                📷 Image de couverture du projet
              </label>
              <ImageUpload
                type="projet"
                currentUrl={form.imageUrl || null}
                onUploadSuccess={(url) => setForm({ ...form, imageUrl: url })}
                shape="rectangle"
                label="Ajouter une image de couverture"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Titre du projet *</label>
              <input
                required
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex: Atelier numérique pour jeunes"
                style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Décrivez votre projet, ses objectifs et son impact..."
                style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Budget demandé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetDemande}
                onChange={(e) => setForm({ ...form, budgetDemande: e.target.value })}
                placeholder="0.00"
                style={{ display: 'block', width: '200px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
              />
            </div>

            <button
              type="submit"
              style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.5rem', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              Soumettre le projet
            </button>
          </form>
        </div>
      )}

      {/* Liste des projets */}
      {projets.length === 0 ? (
        <p style={{ color: '#4A6A8A', textAlign: 'center', padding: '3rem' }}>
          Aucun projet disponible pour le moment.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {projets.map((projet) => {
            const statutStyle = getStatutStyle(projet.statut);
            const progression = projet.budgetDemande > 0
              ? Math.min(100, Math.round(((projet.budgetRecu || 0) / projet.budgetDemande) * 100))
              : 0;

            return (
              <div
                key={projet.id}
                style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                {projet.imageUrl ? (
                  <img
                    src={projet.imageUrl}
                    alt={projet.titre}
                    style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '160px', background: '#E2EAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6A8A', fontSize: '2rem' }}>
                    🚀
                  </div>
                )}

                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: '1rem' }}>{projet.titre}</h3>
                    <span style={{
                      ...statutStyle,
                      borderRadius: '20px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                    }}>
                      {projet.statut}
                    </span>
                  </div>

                  {projet.description && (
                    <p style={{ color: '#4A6A8A', fontSize: '0.85rem', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                      {projet.description.length > 90 ? projet.description.substring(0, 90) + '...' : projet.description}
                    </p>
                  )}

                  {projet.budgetDemande > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#4A6A8A', marginBottom: '4px' }}>
                        <span>💶 {projet.budgetRecu || 0} € reçus</span>
                        <span>Objectif : {projet.budgetDemande} €</span>
                      </div>
                      <div style={{ background: '#E2EAF0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                        <div style={{
                          background: '#2E86AB',
                          height: '100%',
                          width: `${progression}%`,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#4A6A8A', margin: '4px 0 0', textAlign: 'right' }}>
                        {progression}%
                      </p>
                    </div>
                  )}

                  {projet.porteurPrenom && (
                    <p style={{ color: '#4A6A8A', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                      👤 {projet.porteurPrenom} {projet.porteurNom}
                    </p>
                  )}

                  {user && projet.statut === 'APPROUVE' && (
                    <button
                      onClick={() => setMessage(`Redirection vers le paiement pour "${projet.titre}"...`)}
                      style={{ background: '#F4A261', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                    >
                      💛 Soutenir ce projet
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}