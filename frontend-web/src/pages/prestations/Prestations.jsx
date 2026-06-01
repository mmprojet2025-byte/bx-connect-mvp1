import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

const TYPES = ['ANIMATION', 'LOGISTIQUE', 'COMMUNICATION', 'FORMATION', 'AUTRE'];

export default function Prestations() {
  const [prestations, setPrestations] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titre: '', type: 'ANIMATION', datePrestation: '',
    dureeHeures: '', description: '', groupeId: ''
  });

  useEffect(() => {
    fetchPrestations();
    fetchMesGroupes();
  }, []);

  const fetchPrestations = async () => {
    try {
      const res = await api.get('/prestations/mes-prestations');
      setPrestations(res.data);
    } catch { setError('Impossible de charger les prestations.'); }
    finally { setLoading(false); }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/mes-groupes');
      setMesGroupes(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, groupeId: res.data[0].id }));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await api.post('/prestations', {
        ...form,
        dureeHeures: parseFloat(form.dureeHeures),
        groupeId: parseInt(form.groupeId),
      });
      setMessage('✅ Prestation encodée avec succès !');
      setShowForm(false);
      setForm({ titre: '', type: 'ANIMATION', datePrestation: '', dureeHeures: '', description: '', groupeId: mesGroupes[0]?.id || '' });
      fetchPrestations();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'encodage.');
    }
  };

  const statutStyle = (s) => {
    switch (s) {
      case 'VALIDEE':    return 'bg-green-100 text-green-700';
      case 'REFUSEE':    return 'bg-red-100 text-red-700';
      default:           return 'bg-yellow-100 text-yellow-700';
    }
  };

  const totalHeures = prestations
    .filter(p => p.statut === 'VALIDEE')
    .reduce((sum, p) => sum + (p.dureeHeures || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">🤝 Mes prestations bénévoles</h1>
            <p className="text-gray-500 text-sm mt-1">
              Total validé : <strong className="text-green-700">{totalHeures.toFixed(1)}h</strong>
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            {showForm ? 'Annuler' : '+ Encoder une prestation'}
          </button>
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Nouvelle prestation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input required type="date" value={form.datePrestation} onChange={e => setForm({...form, datePrestation: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée (heures) *</label>
                  <input required type="number" min="0.5" step="0.5" value={form.dureeHeures} onChange={e => setForm({...form, dureeHeures: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                {mesGroupes.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Groupe *</label>
                    <select value={form.groupeId} onChange={e => setForm({...form, groupeId: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <button type="submit" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                Encoder la prestation
              </button>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : prestations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-4xl mb-2">🤝</div>
            <p className="text-gray-400 text-sm">Aucune prestation encodée pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prestations.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-5 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-blue-900">{p.titre}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.type}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    📅 {p.datePrestation} · ⏱️ {p.dureeHeures}h · 👥 {p.groupeNom}
                  </p>
                  {p.commentaire && (
                    <p className="text-xs text-gray-500 mt-1 italic">💬 {p.commentaire}</p>
                  )}
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ml-4 ${statutStyle(p.statut)}`}>
                  {p.statut}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
