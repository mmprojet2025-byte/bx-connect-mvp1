import { useState, useEffect } from 'react';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';

export default function Activites() {
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    lieu: '',
    gratuite: true,
    prix: '',
    capaciteMax: 0,
    categorie: '',
    theme: '',
    imageUrl: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    fetchActivites();
  }, []);

  const fetchActivites = async () => {
    try {
      const res = await api.get('/activites');
      setActivites(res.data);
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
    }
  };

  const isAdminOrReferent = user?.role === 'ADMIN' || user?.role === 'REFERENT';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/activites', {
        ...form,
        prix: form.gratuite ? null : parseFloat(form.prix),
        capaciteMax: parseInt(form.capaciteMax),
      });
      setMessage('✅ Activité créée avec succès !');
      setShowForm(false);
      setForm({ titre: '', description: '', dateDebut: '', dateFin: '', lieu: '', gratuite: true, prix: '', capaciteMax: 0, categorie: '', theme: '', imageUrl: '' });
      fetchActivites();
    } catch {
      setError("Erreur lors de la création de l'activité.");
    }
  };

  const handleInscrire = async (activiteId) => {
    try {
      await api.post('/inscriptions', { activiteId });
      setMessage('✅ Inscription réussie !');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
    }
  };

  if (loading) return <p style={{ padding: '2rem' }}>Chargement des activités...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#1A3C5E', margin: 0 }}>🎯 Activités</h1>
        {isAdminOrReferent && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
          >
            {showForm ? 'Annuler' : '+ Nouvelle activité'}
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

      {/* Formulaire création activité */}
      {showForm && isAdminOrReferent && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h2 style={{ color: '#1A3C5E', marginTop: 0 }}>Nouvelle activité</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Image de couverture */}
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A', display: 'block', marginBottom: '0.5rem' }}>
                📷 Image de couverture
              </label>
              <ImageUpload
                type="activite"
                currentUrl={form.imageUrl || null}
                onUploadSuccess={(url) => setForm({ ...form, imageUrl: url })}
                shape="rectangle"
                label="Ajouter une image de couverture"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Titre *</label>
                <input
                  required
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Lieu</label>
                <input
                  value={form.lieu}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Date début *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.dateDebut}
                  onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Date fin *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.dateFin}
                  onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Catégorie</label>
                <input
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Thème</label>
                <input
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Capacité max (0 = illimité)</label>
                <input
                  type="number"
                  min="0"
                  value={form.capaciteMax}
                  onChange={(e) => setForm({ ...form, capaciteMax: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="gratuite"
                  checked={form.gratuite}
                  onChange={(e) => setForm({ ...form, gratuite: e.target.checked })}
                />
                <label htmlFor="gratuite" style={{ fontSize: '0.9rem', color: '#4A6A8A' }}>Activité gratuite</label>
              </div>
            </div>

            {!form.gratuite && (
              <div>
                <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Prix (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                  style={{ display: 'block', width: '200px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
                />
              </div>
            )}

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
              Créer l'activité
            </button>
          </form>
        </div>
      )}

      {/* Liste des activités */}
      {activites.length === 0 ? (
        <p style={{ color: '#4A6A8A', textAlign: 'center', padding: '3rem' }}>
          Aucune activité disponible pour le moment.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {activites.map((activite) => (
            <div
              key={activite.id}
              style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              {activite.imageUrl ? (
                <img
                  src={activite.imageUrl}
                  alt={activite.titre}
                  style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '160px', background: '#E2EAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6A8A', fontSize: '2rem' }}>
                  🎯
                </div>
              )}

              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: '1rem' }}>{activite.titre}</h3>
                  <span style={{
                    background: activite.statut === 'PUBLIEE' ? '#d4edda' : '#fff3cd',
                    color: activite.statut === 'PUBLIEE' ? '#155724' : '#856404',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                  }}>
                    {activite.statut}
                  </span>
                </div>

                {activite.description && (
                  <p style={{ color: '#4A6A8A', fontSize: '0.85rem', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                    {activite.description.length > 80 ? activite.description.substring(0, 80) + '...' : activite.description}
                  </p>
                )}

                <p style={{ color: '#4A6A8A', fontSize: '0.8rem', margin: '0.25rem 0' }}>
                  📅 {new Date(activite.dateDebut).toLocaleDateString('fr-BE')}
                </p>
                {activite.lieu && (
                  <p style={{ color: '#4A6A8A', fontSize: '0.8rem', margin: '0.25rem 0' }}>
                    📍 {activite.lieu}
                  </p>
                )}
                <p style={{ color: '#4A6A8A', fontSize: '0.8rem', margin: '0.25rem 0 0.75rem' }}>
                  {activite.gratuite ? '🆓 Gratuit' : `💶 ${activite.prix} €`}
                </p>

                {user && activite.statut === 'PUBLIEE' && (
                  <button
                    onClick={() => handleInscrire(activite.id)}
                    style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                  >
                    S'inscrire
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}