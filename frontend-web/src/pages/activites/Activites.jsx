import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import ActivityCover from '../../components/ActivityCover';
import { userFriendlyError } from '../../utils/userFriendlyError';
import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';

export default function Activites() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const { t, i18n } = useTranslation();

  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filtres (V03)
  const [recherche, setRecherche] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreTheme, setFiltreTheme] = useState('');
  const [filtreLieu, setFiltreLieu] = useState('');
  const [filtreGratuite, setFiltreGratuite] = useState('');
  const [options, setOptions] = useState({ categories: [], themes: [], lieux: [] });

  // Formulaire création (Admin/Référent)
  const [showForm, setShowForm] = useState(false);
  const peutGerer = isAdmin || isReferent;

  const [form, setForm] = useState({
    titre: '', description: '', dateDebut: '', dateFin: '',
    lieu: '', gratuite: true, prix: '', capaciteMax: 0,
    categorie: '', theme: '', imageUrl: '',
  });

  useEffect(() => {
    fetchActivites();
    fetchOptions();
  }, []);

  const fetchActivites = async () => {
    try {
      setError('');
      const endpoint = peutGerer ? '/activites/admin/toutes' : '/activites';
      const res = await api.get(endpoint);
      setActivites(res.data);
    } catch {
      setError(t('activities.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await api.get('/activites/options-filtres');
      setOptions(res.data);
    } catch {
      // silencieux
    }
  };

  const handleFiltrer = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (recherche)       params.append('q', recherche);
      if (filtreCategorie) params.append('categorie', filtreCategorie);
      if (filtreTheme)     params.append('theme', filtreTheme);
      if (filtreLieu)      params.append('lieu', filtreLieu);
      if (filtreGratuite !== '') params.append('gratuite', filtreGratuite);

      const res = await api.get(`/activites/filtrer?${params.toString()}`);
      setActivites(res.data);
    } catch {
      setError(t('activities.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecherche(''); setFiltreCategorie('');
    setFiltreTheme(''); setFiltreLieu(''); setFiltreGratuite('');
    fetchActivites();
  };

  const handleInscrire = async (activiteId) => {
    try {
      await api.post('/inscriptions', { activiteId });
      setMessage(t('activities.success_register'));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(userFriendlyError(err, t('activities.error_register')));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePublier = async (id) => {
    try {
      await api.patch(`/activites/${id}/statut?statut=PUBLIEE`);
      setMessage(t('activities.success_publish'));
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('activities.error_publish'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/activites', {
        ...form,
        prix: form.gratuite ? null : parseFloat(form.prix),
        capaciteMax: parseInt(form.capaciteMax),
      });
      setMessage(t('activities.success_create'));
      setShowForm(false);
      setForm({ titre: '', description: '', dateDebut: '', dateFin: '', lieu: '', gratuite: true, prix: '', capaciteMax: 0, categorie: '', theme: '', imageUrl: '' });
      fetchActivites();
    } catch {
      setError(t('activities.error_create'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">

        <PageHeader
          eyebrow={peutGerer ? t('activities.manage_mode', { count: activites.length }) : t('nav.activities')}
          title={t('activities.title')}
          description={t('ux.activities.intro', { defaultValue: 'Découvre les activités, ateliers et événements de la communauté BX-Connect.' })}
          action={peutGerer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              {showForm ? t('common.cancel') : t('activities.new_activity')}
            </button>
          )}
        />

        {/* Messages */}
        {message && <Alert>{message}</Alert>}
        {error && activites.length > 0 && <Alert type="error">{error}</Alert>}

        {/* ── Filtres (V03) ── */}
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-950 mb-3">{t('activities.filters_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder={t('activities.search_placeholder')}
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={filtreCategorie}
              onChange={e => setFiltreCategorie(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_categories')}</option>
              {options.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filtreTheme}
              onChange={e => setFiltreTheme(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_themes')}</option>
              {options.themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtreLieu}
              onChange={e => setFiltreLieu(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.all_places')}</option>
              {options.lieux.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filtreGratuite}
              onChange={e => setFiltreGratuite(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t('activities.free_and_paid')}</option>
              <option value="true">{t('activities.free_only')}</option>
              <option value="false">{t('activities.paid_only')}</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleFiltrer}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {t('activities.apply_filters')}
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {t('activities.reset_filters')}
            </button>
          </div>
        </div>

        {/* ── Formulaire création ── */}
        {showForm && peutGerer && (
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">{t('activities.new_title')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_title')}</label>
                  <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_place')}</label>
                  <input value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_start')}</label>
                  <input required type="datetime-local" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_end')}</label>
                  <input required type="datetime-local" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_category')}</label>
                  <input value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_theme')}</label>
                  <input value={form.theme} onChange={e => setForm({...form, theme: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_capacity')}</label>
                  <input type="number" min="0" value={form.capaciteMax} onChange={e => setForm({...form, capaciteMax: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="gratuite" checked={form.gratuite} onChange={e => setForm({...form, gratuite: e.target.checked})} />
                  <label htmlFor="gratuite" className="text-sm text-slate-700">{t('activities.form_free')}</label>
                </div>
              </div>
              {!form.gratuite && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_price')}</label>
                  <input type="number" min="0" step="0.01" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})}
                    className="w-48 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('activities.form_description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                {t('activities.create_btn')}
              </button>
            </form>
          </div>
        )}

        {/* ── Liste des activités ── */}
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error && activites.length === 0 ? (
          <ErrorState
            title={t('common.loadErrorTitle')}
            description={error || t('common.loadErrorDescription')}
            actionLabel={t('common.retry')}
            action={fetchActivites}
          />
        ) : activites.length === 0 ? (
          <EmptyState
            icon="Calendar"
            title={t('activities.no_activities')}
            description={t('activities.empty_description')}
            actionLabel={t('groups.discover')}
            actionTo="/groupes"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activites.map(a => (
              <article key={a.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-900/5 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition flex flex-col">
                <div className="relative">
                  <ActivityCover imageUrl={a.imageUrl} title={a.titre} className="h-44" />
                  <div className="absolute left-4 top-4">
                    <StatusBadge status={a.statut}>
                      {t(`statuses.${a.statut}`, { defaultValue: a.statut })}
                    </StatusBadge>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-950 text-lg leading-tight">{a.titre}</h3>
                    {(a.categorie || a.theme) && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        {[a.categorie, a.theme].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {a.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">{a.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <InfoPill label={t('activities.form_place')} value={a.lieu || '—'} />
                    <InfoPill
                      label={t('activities.start_date')}
                      value={a.dateDebut ? new Date(a.dateDebut).toLocaleDateString(i18n.language || 'fr-BE') : '—'}
                    />
                    <InfoPill
                      label={t('activities.capacity')}
                      value={a.capaciteMax > 0 ? t('activities.capacity_max', { count: a.capaciteMax }) : t('activities.unlimited')}
                    />
                    <InfoPill
                      label={t('activities.form_price')}
                      value={a.gratuite ? t('activities.free') : t('activities.price_value', { price: a.prix })}
                    />
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {/* Lien détail (V04) */}
                    <Link
                      to={`/activites/${a.id}`}
                      className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-semibold py-2 rounded-xl transition"
                    >
                      {t('activities.view_detail')}
                    </Link>

                    {/* S'inscrire (Membre) */}
                    {isAuthenticated && !peutGerer && a.statut === 'PUBLIEE' && (
                      <button
                        onClick={() => handleInscrire(a.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-xl transition"
                      >
                        {t('activities.register_btn')}
                      </button>
                    )}

                    {/* Publier (Admin/Référent) */}
                    {peutGerer && a.statut === 'BROUILLON' && (
                      <button
                        onClick={() => handlePublier(a.id)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 rounded-xl transition"
                      >
                        {t('activities.publish')}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-700 truncate">{value}</p>
    </div>
  );
}
