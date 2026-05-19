import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const STATUTS = ['BROUILLON', 'PUBLIEE', 'ANNULEE', 'TERMINEE'];

export default function AdminActivites() {
  const { t } = useTranslation();
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  useEffect(() => { fetchActivites(); }, []);

  const fetchActivites = async () => {
    try {
      const res = await api.get('/activites/admin/toutes');
      setActivites(res.data);
    } catch {
      setError(t('admin.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const changerStatut = async (id, statut) => {
    try {
      const res = await api.patch(`/activites/${id}/statut?statut=${statut}`);
      setActivites(prev => prev.map(a => a.id === id ? res.data : a));
      setMessage(`✅ Statut mis à jour : ${statut}`);
      setError('');
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
      setError('');
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">🎯 {t('admin.activities_title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{activites.length} activité(s) au total</p>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {/* Filtres */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Rechercher par titre ou lieu..."
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setMessage(''); setError(''); }}
            className="flex-1 min-w-48 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={filtreStatut}
            onChange={e => setFiltreStatut(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">{t('common.all_statuses')}</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('admin.loading')}</p>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Titre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lieu</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date début</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Créateur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activitesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Aucune activité trouvée.</td>
                    </tr>
                  ) : (
                    activitesFiltrees.map((a, i) => (
                      <tr key={a.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-blue-900 text-sm">{a.titre}</span>
                          {a.gratuite
                            ? <span className="ml-2 text-xs text-green-600">🆓</span>
                            : <span className="ml-2 text-xs text-orange-500">💶 {a.prix}€</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.lieu || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {a.dateDebut ? new Date(a.dateDebut).toLocaleDateString('fr-BE') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.createurPrenom} {a.createurNom}</td>
                        <td className="px-4 py-3">
                          <select
                            value={a.statut}
                            onChange={e => changerStatut(a.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ background: statutColor(a.statut), color: '#fff' }}
                          >
                            {STATUTS.map(s => (
                              <option key={s} value={s} style={{ background: '#fff', color: '#333' }}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => supprimerActivite(a.id, a.titre)}
                            className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function statutColor(statut) {
  switch (statut) {
    case 'PUBLIEE':  return '#28a745';
    case 'ANNULEE':  return '#dc3545';
    case 'TERMINEE': return '#6c757d';
    default:         return '#ffc107';
  }
}