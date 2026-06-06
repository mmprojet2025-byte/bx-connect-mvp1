import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ImageUpload from '../../components/ImageUpload';
import AppIcon from '../../components/ui/AppIcons';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/StatusBadge';

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
    } catch (err) {
      setError(getApiError(err, t('profile.error_load'), t));
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

      // Synchroniser la langue de l'interface avec la préférence sauvegardée.
      const langCode = form.languePreference.toLowerCase();
      i18n.changeLanguage(langCode);
      localStorage.setItem('bxconnect_lang', langCode);
    } catch (err) {
      setError(getApiError(err, t('profile.error_update'), t));
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
    } catch (err) {
      setError(getApiError(err, t('profile.error_password'), t));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">{t('common.loading')}</p>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <PageHeader
          eyebrow={t('profile.title')}
          title={`${profil?.prenom || ''} ${profil?.nom || ''}`.trim() || t('profile.title')}
          description={profil?.email}
        />

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

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Carte profil */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm mb-6">
            <div className="flex gap-6 items-start flex-wrap">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-3 ring-1 ring-blue-100">
                  <ImageUpload
                    type="avatar"
                    currentUrl={avatarUrl}
                    onUploadSuccess={(url) => setAvatarUrl(url)}
                    shape="circle"
                    label={t('profile.photo')}
                  />
                </div>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
              {!editMode ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-950 mb-2">
                    {profil?.prenom} {profil?.nom}
                  </h2>
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    <AppIcon name={profil?.role === 'SUPER_ADMIN' ? 'Shield' : 'User'} className="h-3.5 w-3.5" />
                    {t(`roles.${profil?.role}`, profil?.role)}
                  </span>
                  <div className="grid sm:grid-cols-2 gap-3 mb-5">
                    <ProfileInfo label={t('users.email')} value={profil?.email} />
                    <ProfileInfo label={t('profile.language')} value={languageLabel(profil?.languePreference, t)} />
                    <ProfileInfo
                      label={t('users.memberSince')}
                      value={formatDate(profil?.dateInscription, i18n.language, t)}
                    />
                    <ProfileInfo label={t('users.status')} value={(
                      <StatusBadge status={profil?.actif === false ? 'ANNULEE' : 'VALIDE'}>
                        {profil?.actif === false ? t('users.inactive') : t('users.active')}
                      </StatusBadge>
                    )} />
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    <AppIcon name="Edit" className="h-4 w-4" />
                    {t('profile.edit_btn')}
                  </button>
                </>
              ) : (
                <form onSubmit={handleSaveProfil} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.firstname')}</label>
                    <input
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.lastname')}</label>
                    <input
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.language')}</label>
                    <select
                      value={form.languePreference}
                      onChange={(e) => setForm({ ...form, languePreference: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="FR">{t('common.language_fr')}</option>
                      <option value="NL">{t('common.language_nl')}</option>
                      <option value="EN">{t('common.language_en')}</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-500">
                      <AppIcon name="Save" className="h-4 w-4" />
                      {t('profile.save_btn')}
                    </button>
                    <button type="button" onClick={() => setEditMode(false)} className="inline-flex items-center gap-2 rounded-2xl bg-gray-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-gray-300">
                      <AppIcon name="XCircle" className="h-4 w-4" />
                      {t('profile.cancel_btn')}
                    </button>
                  </div>
                </form>
              )}
              </div>
            </div>
          </div>

          {/* Sécurité — Changer mot de passe */}
          <aside className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm mb-6 h-fit">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <AppIcon name="Lock" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">{t('profile.security')}</h3>
              <p className="text-xs text-slate-500 mt-1">{profil?.email}</p>
            </div>
          </div>
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              <AppIcon name="Lock" className="h-4 w-4" />
              {t('profile.change_password')}
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.old_password')}</label>
                <input
                  type="password"
                  value={passwordForm.ancienMotDePasse}
                  onChange={(e) => setPasswordForm({ ...passwordForm, ancienMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.new_password')}</label>
                <input
                  type="password"
                  value={passwordForm.nouveauMotDePasse}
                  onChange={(e) => setPasswordForm({ ...passwordForm, nouveauMotDePasse: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-500">
                  <AppIcon name="Save" className="h-4 w-4" />
                  {t('profile.save_password')}
                </button>
                <button type="button" onClick={() => setShowPasswordForm(false)} className="inline-flex items-center gap-2 rounded-2xl bg-gray-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-gray-300">
                  <AppIcon name="XCircle" className="h-4 w-4" />
                  {t('profile.cancel_btn')}
                </button>
              </div>
            </form>
          )}
          </aside>
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          <AppIcon name="LogOut" className="h-4 w-4" />
          {t('nav.logout')}
        </button>

        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black text-slate-950">
            <AppIcon name="Shield" className="h-5 w-5 text-blue-700" />
            {t('legal.profileTitle')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t('legal.profileDescription')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/conditions-utilisation" className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {t('legal.links.terms')}
            </Link>
            <Link to="/politique-confidentialite" className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {t('legal.links.privacy')}
            </Link>
            <Link to="/mentions-legales" className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {t('legal.links.notices')}
            </Link>
          </div>
          {profil?.legalVersion && (
            <p className="mt-3 text-xs text-slate-400">
              {t('legal.acceptedVersion', { version: profil.legalVersion })}
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function getApiError(err, fallback, t) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

function ProfileInfo({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-700 break-words">{value || '—'}</div>
    </div>
  );
}

function languageLabel(value, t) {
  return {
    FR: t('common.language_fr'),
    NL: t('common.language_nl'),
    EN: t('common.language_en'),
  }[value] || value || '';
}

function formatDate(value, language, t) {
  if (!value) return t('profile.unknown_date');
  const locale = language === 'nl' ? 'nl-BE' : language === 'en' ? 'en-GB' : 'fr-BE';
  return new Date(value).toLocaleDateString(locale);
}
