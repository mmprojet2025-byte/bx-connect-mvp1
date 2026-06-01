import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

const emptyGroupeForm = {
  nom: '',
  description: '',
  categorie: '',
  theme: '',
  objectif: '',
  capaciteMax: '',
  referentId: '',
};

export default function AdminGroupes() {
  const [groupes, setGroupes] = useState([]);
  const [referents, setReferents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('en-attente');
  const [motifRefus, setMotifRefus] = useState('');
  const [groupeARefuser, setGroupeARefuser] = useState(null);
  const [groupeForm, setGroupeForm] = useState(emptyGroupeForm);

  const referentsActifs = referents.filter(referent => referent.actif);

  const fetchReferents = useCallback(async () => {
    try {
      const res = await api.get('/admin/referents');
      setReferents(res.data);
    } catch {
      setError('Impossible de charger les référents.');
    }
  }, []);

  const fetchGroupes = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = onglet === 'en-attente'
        ? '/admin/groupes/en-attente'
        : '/admin/groupes';
      const res = await api.get(endpoint);
      setGroupes(res.data);
    } catch {
      setError('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  }, [onglet]);

  useEffect(() => {
    fetchGroupes();
    fetchReferents();
  }, [fetchGroupes, fetchReferents]);

  const handleFormChange = (field, value) => {
    setGroupeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateGroupe = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await api.post('/admin/groupes', {
        ...groupeForm,
        capaciteMax: Number(groupeForm.capaciteMax) || 0,
        referentId: Number(groupeForm.referentId),
      });
      setMessage('✅ Groupe créé et référent assigné.');
      setGroupeForm(emptyGroupeForm);
      setOnglet('tous');
      await fetchGroupes();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors de la création du groupe.');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignerReferent = async (groupeId, referentId) => {
    setAssigningId(groupeId);
    setError('');

    try {
      const res = await api.patch(`/admin/groupes/${groupeId}/referent/${referentId}`);
      setGroupes(prev => prev.map(groupe => groupe.id === groupeId ? res.data : groupe));
      setMessage('✅ Référent assigné au groupe.');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError('Erreur lors de l’assignation du référent.');
    } finally {
      setAssigningId(null);
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

  const referentLabel = (referent) => `${referent.prenom || ''} ${referent.nom || ''}`.trim() || referent.email;

  const referentAssigne = (groupe) => {
    const referent = referents.find(item => item.id === groupe.referentId);
    if (referent) return referentLabel(referent);
    return `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim() || 'Aucun référent assigné';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">👥 Gestion des groupes</h1>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        <section className="bg-white rounded-2xl shadow p-5 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">Créer un groupe</h2>
          <form onSubmit={handleCreateGroupe} className="grid md:grid-cols-2 gap-4">
            <Input
              label="Nom du groupe"
              value={groupeForm.nom}
              onChange={value => handleFormChange('nom', value)}
              required
            />
            <Input
              label="Catégorie"
              value={groupeForm.categorie}
              onChange={value => handleFormChange('categorie', value)}
            />
            <Input
              label="Thème"
              value={groupeForm.theme}
              onChange={value => handleFormChange('theme', value)}
            />
            <Input
              label="Capacité maximale"
              value={groupeForm.capaciteMax}
              onChange={value => handleFormChange('capaciteMax', value)}
              type="number"
              min="0"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Référent actif</label>
              <select
                value={groupeForm.referentId}
                onChange={e => handleFormChange('referentId', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Sélectionner un référent</option>
                {referentsActifs.map(referent => (
                  <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                ))}
              </select>
              {referentsActifs.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Aucun référent actif disponible.</p>
              )}
            </div>
            <TextArea
              label="Description"
              value={groupeForm.description}
              onChange={value => handleFormChange('description', value)}
            />
            <TextArea
              label="Objectif"
              value={groupeForm.objectif}
              onChange={value => handleFormChange('objectif', value)}
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating || referentsActifs.length === 0}
                className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                {creating ? 'Création...' : 'Créer le groupe'}
              </button>
            </div>
          </form>
        </section>

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
                      👤 Référent : {referentAssigne(g)}
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

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Référent assigné</label>
                  <select
                    value={g.referentId || ''}
                    onChange={e => handleAssignerReferent(g.id, e.target.value)}
                    disabled={assigningId === g.id || referentsActifs.length === 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  >
                    {g.referentId && !referentsActifs.some(referent => referent.id === g.referentId) && (
                      <option value={g.referentId} disabled>{referentAssigne(g)}</option>
                    )}
                    {referentsActifs.map(referent => (
                      <option key={referent.id} value={referent.id}>{referentLabel(referent)}</option>
                    ))}
                  </select>
                </div>

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

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        min={min}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
    </div>
  );
}
