import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ImageUpload from '../../components/ImageUpload';

export default function Profil() {
  const navigate = useNavigate();
  const [profil, setProfil] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', languePreference: 'FR' });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ ancienMotDePasse: '', nouveauMotDePasse: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfil();
  }, []);

  const fetchProfil = async () => {
    try {
      const res = await api.get('/users/me');
      setProfil(res.data);
      setForm({
        prenom: res.data.prenom,
        nom: res.data.nom,
        languePreference: res.data.languePreference || 'FR',
      });
      setAvatarUrl(res.data.avatarUrl || null);
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfil = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await api.put('/users/me', { ...form, avatarUrl });
      setProfil(res.data);
      setEditMode(false);
      setMessage('✅ Profil mis à jour avec succès !');
    } catch {
      setError('Erreur lors de la mise à jour du profil.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.put('/users/me/password', passwordForm);
      setMessage('✅ Mot de passe changé avec succès !');
      setShowPasswordForm(false);
      setPasswordForm({ ancienMotDePasse: '', nouveauMotDePasse: '' });
    } catch {
      setError('Ancien mot de passe incorrect ou erreur serveur.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) return <p style={{ padding: '2rem' }}>Chargement du profil...</p>;

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#1A3C5E', marginBottom: '1.5rem' }}>Mon Profil</h1>

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

      {/* Carte profil */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ImageUpload
              type="avatar"
              currentUrl={avatarUrl}
              onUploadSuccess={(url) => setAvatarUrl(url)}
              shape="circle"
              label="Changer l'avatar"
            />
          </div>

          {/* Infos */}
          <div style={{ flex: 1 }}>
            {!editMode ? (
              <>
                <h2 style={{ margin: '0 0 0.25rem', color: '#1A3C5E' }}>
                  {profil?.prenom} {profil?.nom}
                </h2>
                <span style={{
                  display: 'inline-block',
                  background: '#2E86AB',
                  color: '#fff',
                  borderRadius: '20px',
                  padding: '2px 12px',
                  fontSize: '0.8rem',
                  marginBottom: '0.75rem',
                }}>
                  {profil?.role}
                </span>
                <p style={{ margin: '0.25rem 0', color: '#4A6A8A' }}>📧 {profil?.email}</p>
                <p style={{ margin: '0.25rem 0', color: '#4A6A8A' }}>🌐 Langue : {profil?.languePreference}</p>
                <p style={{ margin: '0.25rem 0', color: '#4A6A8A', fontSize: '0.85rem' }}>
                  Membre depuis le {new Date(profil?.dateInscription).toLocaleDateString('fr-BE')}
                </p>
                <button
                  onClick={() => setEditMode(true)}
                  style={{ marginTop: '1rem', background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}
                >
                  ✏️ Modifier le profil
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveProfil} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Prénom</label>
                  <input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Nom</label>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Langue</label>
                  <select
                    value={form.languePreference}
                    onChange={(e) => setForm({ ...form, languePreference: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
                  >
                    <option value="FR">Français</option>
                    <option value="NL">Néerlandais</option>
                    <option value="EN">Anglais</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                    💾 Sauvegarder
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Changer mot de passe */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#1A3C5E' }}>🔒 Sécurité</h3>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            style={{ background: '#F4A261', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}
          >
            Changer le mot de passe
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '350px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Ancien mot de passe</label>
              <input
                type="password"
                value={passwordForm.ancienMotDePasse}
                onChange={(e) => setPasswordForm({ ...passwordForm, ancienMotDePasse: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#4A6A8A' }}>Nouveau mot de passe</label>
              <input
                type="password"
                value={passwordForm.nouveauMotDePasse}
                onChange={(e) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: '2px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                Confirmer
              </button>
              <button type="button" onClick={() => setShowPasswordForm(false)} style={{ background: '#ccc', color: '#333', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.5rem', cursor: 'pointer', fontSize: '0.95rem' }}
      >
        🚪 Se déconnecter
      </button>
    </div>
  );
}