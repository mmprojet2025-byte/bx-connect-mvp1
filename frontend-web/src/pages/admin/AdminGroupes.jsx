import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

export default function AdminGroupes() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('en-attente');
  const [motifRefus, setMotifRefus] = useState('');
  const [groupeARefuser, setGroupeARefuser] = useState(null);

  useEffect(() => { fetchGroupes(); }, [onglet]);

  const fetchGroupes = async () => {
    setLoading(true);
    try {
      const endpoint = onglet === 'en-attente'
        ? '/admin/groupes/en-attente'
        : '/groupes/admin/tous';
      const res = await api.get(endpoint);
      setGroupes(res.data);
    } catch {
      setError('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  };

  const handleValider = async (id) => {
    try {
      await api.patch(`/admin/groupes/${id}/valider`);
      setMessage('✅ Groupe validé !');
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Erreur lors de la validation.'); }
  };

  const handleRefuser = async () => {
    if (!groupeARefuser) return;
    try {
      await api.patch(`/admin/groupes/${groupeARefuser}/refuser`, { motif: motifRefus || 'Non précisé' });
      setMessage('✅ Groupe refusé.');
      setGroupeARefuser(null);
      setMotifRefus('');
      fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Erreur lors du refus.'); }
  };

  const statutColor = (statut) => {
    switch (statut) {
      case 'VALIDE':     return 'bg-green-100 text-green-700';
      case 'EN_ATTENTE': return 'bg-yellow-100 text-yellow-700';
      case 'REFUSE':     return 'bg-red-100 text-red-700';
      case 'ARCHIVE':    return 'bg-gray-100 text-gray-600';
      default:           return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">👥 Gestion des groupes</h1>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Onglets */}
        <div className="flex gap-3 mb-6">
          {[
            { id: 'en-attente', label: '⏳ En attente' },
            { id: 'tous',       label: '📋 Tous les groupes' },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                onglet === o.id ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
              }`}>
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : groupes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-400 text-sm">
              {onglet === 'en-attente' ? 'Aucun groupe en attente de validation.' : 'Aucun groupe.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupes.map(g => (
              <div key={g.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-blue-900 text-lg">{g.nom}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                      👤 Référent : {g.referentPrenom} {g.referentNom}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statutColor(g.statut)}`}>
                    {g.statut}
                  </span>
                </div>

                {g.description && <p className="text-gray-600 text-sm mb-3">{g.description}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500 mb-4">
                  {g.theme    && <span>🎨 {g.theme}</span>}
                  {g.categorie && <span>🏷️ {g.categorie}</span>}
                  {g.capaciteMax > 0 && <span>👥 Max {g.capaciteMax}</span>}
                  <span>📅 {new Date(g.dateCreation).toLocaleDateString('fr-BE')}</span>
                </div>

                {g.objectif && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">
                    <strong>Objectif :</strong> {g.objectif}
                  </div>
                )}

                {g.motifRefus && (
                  <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
                    <strong>Motif de refus :</strong> {g.motifRefus}
                  </div>
                )}

                {g.statut === 'EN_ATTENTE' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleValider(g.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                      ✅ Valider le groupe
                    </button>
                    <button onClick={() => setGroupeARefuser(g.id)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                      ❌ Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal refus */}
        {groupeARefuser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-blue-900 mb-4">❌ Refuser le groupe</h2>
              <label className="block text-sm font-medium text-gray-700 mb-2">Motif du refus</label>
              <textarea
                value={motifRefus}
                onChange={e => setMotifRefus(e.target.value)}
                rows={3}
                placeholder="Expliquez pourquoi ce groupe est refusé..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={handleRefuser}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl transition">
                  Confirmer le refus
                </button>
                <button onClick={() => { setGroupeARefuser(null); setMotifRefus(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
