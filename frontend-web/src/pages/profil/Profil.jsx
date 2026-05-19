import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ImageUpload from '../../components/ImageUpload';

export default function Profil() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t, i18n } = useTranslation();

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
      setError(t('profile.error_update'));
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
      setMessage(t('profile.success_update'));

      // ✅ Synchroniser la langue de l'interface avec la préférence sauvegardée
      const langCode = form.languePreference.toLowerCase(); // FR → fr, NL → nl, EN → en
      i18n.changeLanguage(langCode);
      localStorage.setItem('bxconnect_lang', langCode);
    } catch {
      setError(t('profile.error_update'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.put('/users/me/password', passwordForm);
      setMessage(t('profile.success_password'));
      setShowPasswordForm(false);
      setPasswordForm({ ancienMotDePasse: '', nouveauMotDePasse: '' });
    } catch {
      setError(t('profile.error_password'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">{t('profile.title')}</h1>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Carte profil */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex gap-6 items-start flex-wrap">

            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <ImageUpload
                type="avatar"
                currentUrl={avatarUrl}
                onUploadSuccess={(url) => setAvatarUrl(url)}
                shape="circle"
                label={t('profile.photo')}
              />
            </div>

            {/* Infos */}
            <div className="flex-1">
              {!editMode ? (
                <>
                  <h2 className="text-xl font-bold text-blue-900 mb-1">
                    {profil?.prenom} {profil?.nom}
                  </h2>
                  <span className="inline-block bg-blue-600 text-white text-xs px-3 py-0.5 rounded-full mb-3">
                    {profil?.role}
                  </span>
                  <p className="text-gray-600 text-sm mb-1">📧 {profil?.email}</p>
                  <p className="text-gray-600 text-sm mb-1">
                    🌐 {t('profile.language')} : <strong>{profil?.languePreference}</strong>
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    {t('profile.member_since')} {new Date(profil?.dateInscription).toLocaleDateString('fr-BE')}
                  </p>
                  <button
                    onClick={() => setEditMode(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl transition"
                  >
                    ✏️ {t('profile.edit_btn')}
                  </button>
                </>
              ) : (
                <form onSubmit={handleSaveProfil} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.firstname')}</label>
                    <input
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.lastname')}</label>
                    <input
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.language')}</label>
                    <select
                      value={form.languePreference}
                      onChange={(e) => setForm({ ...form, languePreference: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="FR">🇫🇷 Français</option>
                      <option value="NL">🇧🇪 Nederlands</option>
                      <option value="EN">🇬🇧 English</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl transition">
                      💾 {t('profile.save_btn')}
                    </button>
                    <button type="button" onClick={() => setEditMode(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-xl transition">
                      {t('profile.cancel_btn')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Sécurité — Changer mot de passe */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">🔒 {t('profile.change_password')}</h3>
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-orange-400 hover:bg-orange-300 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              {t('profile.change_password')}
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.old_password')}</label>
                <input
                  type="password"
                  value={passwordForm.ancienMotDePasse}
                  onChange={(e) => setPasswordForm({ ...passwordForm, ancienMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.new_password')}</label>
                <input
                  type="password"
                  value={passwordForm.nouveauMotDePasse}
                  onChange={(e) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl transition">
                  {t('profile.save_password')}
                </button>
                <button type="button" onClick={() => setShowPasswordForm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-xl transition">
                  {t('profile.cancel_btn')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
        >
          🚪 {t('nav.logout')}
        </button>
      </main>

      <Footer />
    </div>
  );
}