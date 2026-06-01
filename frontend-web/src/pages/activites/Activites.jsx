import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

const STATUTS = {
  PUBLIEE: { label: 'Confirmée', variant: 'success' },
  BROUILLON: { label: 'Brouillon', variant: 'neutral' },
  ANNULEE: { label: 'Annulée', variant: 'danger' },
  TERMINEE: { label: 'Terminée', variant: 'neutral' },
}

export default function Activites() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const { t } = useTranslation();

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
      setMessage('✅ Inscription réussie !');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription.");
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePublier = async (id) => {
    try {
      await api.patch(`/activites/${id}/statut?statut=PUBLIEE`);
      setMessage('✅ Activité publiée !');
      fetchActivites();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors de la publication.');
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
      setMessage('✅ Activité créée !');
      setShowForm(false);
      setForm({ titre: '', description: '', dateDebut: '', dateFin: '', lieu: '', gratuite: true, prix: '', capaciteMax: 0, categorie: '', theme: '', imageUrl: '' });
      fetchActivites();
    } catch {
      setError("Erreur lors de la création.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">

        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">🎯 {t('activities.title')}</h1>
            {peutGerer && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                🛡️ Mode Admin — {activites.length} activité(s)
              </span>
            )}
          </div>
          {peutGerer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              {showForm ? 'Annuler' : t('activities.new_activity')}
            </button>
          )}
        </div>

        {/* Messages */}
        {message && <Alert>{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* ── Filtres (V03) ── */}
        <div className="bg-white rounded-2xl shadow p-5 mb-6">
          <h2 className="text-sm font-bold text-blue-900 mb-3">🔍 Recherche & Filtres</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Rechercher par mot-clé..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={filtreCategorie}
              onChange={e => setFiltreCategorie(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Toutes les catégories</option>
              {options.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filtreTheme}
              onChange={e => setFiltreTheme(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Tous les thèmes</option>
              {options.themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtreLieu}
              onChange={e => setFiltreLieu(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Tous les lieux</option>
              {options.lieux.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filtreGratuite}
              onChange={e => setFiltreGratuite(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Gratuit & Payant</option>
              <option value="true">🆓 Gratuit seulement</option>
              <option value="false">💶 Payant seulement</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleFiltrer}
              className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              Appliquer les filtres
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* ── Formulaire création ── */}
        {showForm && peutGerer && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Nouvelle activité</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                  <input value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                  <input required type="datetime-local" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
                  <input required type="datetime-local" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thème</label>
                  <input value={form.theme} onChange={e => setForm({...form, theme: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité max (0 = illimité)</label>
                  <input type="number" min="0" value={form.capaciteMax} onChange={e => setForm({...form, capaciteMax: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="gratuite" checked={form.gratuite} onChange={e => setForm({...form, gratuite: e.target.checked})} />
                  <label htmlFor="gratuite" className="text-sm text-gray-700">Activité gratuite</label>
                </div>
              </div>
              {!form.gratuite && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                  <input type="number" min="0" step="0.01" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})}
                    className="w-48 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical" />
              </div>
              <button type="submit" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                Créer l'activité
              </button>
            </form>
          </div>
        )}

        {/* ── Liste des activités ── */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : activites.length === 0 ? (
          <EmptyState
            title={t('activities.no_activities')}
            description="Les activités publiées par l’association apparaîtront ici."
            actionLabel="Découvrir les groupes"
            actionTo="/groupes"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activites.map(a => (
              <div key={a.id} className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-md transition">
                {/* Image */}
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt={a.titre} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-blue-50 flex items-center justify-center text-4xl">🎯</div>
                )}

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-blue-900 text-base leading-tight flex-1 mr-2">{a.titre}</h3>
                    <StatusBadge variant={STATUTS[a.statut]?.variant || 'neutral'}>
                      {STATUTS[a.statut]?.label || a.statut}
                    </StatusBadge>
                  </div>

                  {a.description && (
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{a.description}</p>
                  )}

                  <div className="space-y-1 mb-3">
                    {a.lieu && <p className="text-xs text-gray-500">📍 {a.lieu}</p>}
                    {a.dateDebut && <p className="text-xs text-gray-500">📅 {new Date(a.dateDebut).toLocaleDateString('fr-BE')}</p>}
                    {a.categorie && <p className="text-xs text-gray-500">🏷️ {a.categorie}</p>}
                    <p className="text-xs text-gray-500">
                      Places : {a.capaciteMax > 0 ? `${a.capaciteMax} maximum` : 'illimitées'}
                    </p>
                    <p className="text-xs text-gray-500">{a.gratuite ? '🆓 Gratuit' : `💶 ${a.prix} €`}</p>
                  </div>

                  <div className="flex gap-2">
                    {/* Lien détail (V04) */}
                    <Link
                      to={`/activites/${a.id}`}
                      className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-xl transition"
                    >
                      Voir détail
                    </Link>

                    {/* S'inscrire (Membre) */}
                    {isAuthenticated && !peutGerer && a.statut === 'PUBLIEE' && (
                      <button
                        onClick={() => handleInscrire(a.id)}
                        className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-xl transition"
                      >
                        S'inscrire
                      </button>
                    )}

                    {/* Publier (Admin/Référent) */}
                    {peutGerer && a.statut === 'BROUILLON' && (
                      <button
                        onClick={() => handlePublier(a.id)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 rounded-xl transition"
                      >
                        ▶ Publier
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
