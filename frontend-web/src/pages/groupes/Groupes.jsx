import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function Groupes() {
  const { user, isAdmin, isReferent } = useAuth();
  const { t } = useTranslation();

  const [groupes, setGroupes] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '', type: 'GENERAL' });

  const peutGerer = isAdmin || isReferent;

  useEffect(() => {
    fetchGroupes();
  }, []);

  useEffect(() => {
    if (user) fetchMesGroupes();
  }, [user]);

  const fetchGroupes = async () => {
    try {
      const res = await api.get('/groupes');
      setGroupes(res.data);
    } catch {
      setError(t('groups.error_load'));
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

  const handleRejoindre = async (groupeId) => {
    setMessage(''); setError('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      setMessage(t('groups.success_join'));
      fetchGroupes(); fetchMesGroupes();
    } catch (err) {
      setError(err.response?.data?.message || t('groups.error_load'));
    }
  };

  const handleQuitter = async (groupeId) => {
    setMessage(''); setError('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      setMessage(t('groups.success_leave'));
      fetchGroupes(); fetchMesGroupes();
    } catch (err) {
      setError(err.response?.data?.message || t('groups.error_load'));
    }
  };

  const handleCreer = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api.post('/groupes', form);
      setMessage('✅ Groupe créé avec succès !');
      setShowForm(false);
      setForm({ nom: '', description: '', type: 'GENERAL' });
      fetchGroupes();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const mesGroupesIds = mesGroupes.map((g) => g.id);
  const groupesFiltres = groupes.filter((g) =>
    g.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  const typeBadge = (type) => ({
    ADMIN:     { bg: '#f8d7da', color: '#721c24' },
    PROJET:    { bg: '#d4edda', color: '#155724' },
    EVENEMENT: { bg: '#fff3cd', color: '#856404' },
    GENERAL:   { bg: '#e2eaf0', color: '#1A3C5E' },
  }[type] || { bg: '#e2eaf0', color: '#1A3C5E' });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">👥 {t('groups.title')}</h1>
          {peutGerer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              {showForm ? t('common.cancel') : '+ Nouveau groupe'}
            </button>
          )}
        </div>

        {/* Messages */}
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

        {/* Formulaire création groupe */}
        {showForm && peutGerer && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Nouveau groupe</h2>
            <form onSubmit={handleCreer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe *</label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="GENERAL">Général</option>
                    <option value="PROJET">Projet</option>
                    <option value="EVENEMENT">Événement</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
              >
                Créer le groupe
              </button>
            </form>
          </div>
        )}

        {/* Mes groupes */}
        {user && mesGroupes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-blue-900 mb-3">📌 Mes groupes</h2>
            <div className="flex flex-wrap gap-2">
              {mesGroupes.map((g) => (
                <span key={g.id} className="bg-blue-600 text-white text-sm px-4 py-1 rounded-full">
                  {g.nom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder={`🔍 ${t('groups.search')}`}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Liste des groupes */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('groups.loading')}</p>
        ) : groupesFiltres.length === 0 ? (
          <p className="text-gray-400 text-center py-10">{t('groups.no_groups')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupesFiltres.map((groupe) => {
              const estMembre = mesGroupesIds.includes(groupe.id);
              const badge = typeBadge(groupe.type);
              return (
                <div key={groupe.id} className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-blue-900 text-base">{groupe.nom}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {groupe.type || 'GÉNÉRAL'}
                    </span>
                  </div>

                  {groupe.description && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                      {groupe.description}
                    </p>
                  )}

                  <p className="text-gray-400 text-xs">
                    👤 {groupe.nombreMembres ?? 0} {t('groups.members')}
                  </p>

                  {user && (
                    estMembre ? (
                      <button
                        onClick={() => handleQuitter(groupe.id)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-700 text-sm py-1.5 rounded-xl transition border border-red-200"
                      >
                        {t('groups.leave_btn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRejoindre(groupe.id)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded-xl transition"
                      >
                        {t('groups.join_btn')}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}