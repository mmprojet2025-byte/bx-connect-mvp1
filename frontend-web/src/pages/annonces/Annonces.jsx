import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

export default function Annonces() {
  const { isAuthenticated, isAdmin, isReferent } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [form, setForm] = useState({
    titre: '', contenu: '', type: 'GLOBALE', groupeId: null, epinglee: false
  });

  const peutPublier = isAdmin || isReferent;

  useEffect(() => {
    fetchAnnonces();
    if (isReferent) fetchMesGroupes();
  }, []);

  const fetchAnnonces = async () => {
    try {
      const endpoint = isAuthenticated ? '/annonces/mes-annonces' : '/annonces/globales';
      const res = await api.get(endpoint);
      setAnnonces(res.data);
    } catch { setError('Impossible de charger les annonces.'); }
    finally { setLoading(false); }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/referent/mes-groupes');
      setMesGroupes(res.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const payload = { ...form };
      if (form.type === 'GLOBALE') payload.groupeId = null;
      await api.post('/annonces', payload);
      setMessage('✅ Annonce publiée !');
      setShowForm(false);
      setForm({ titre: '', contenu: '', type: 'GLOBALE', groupeId: null, epinglee: false });
      fetchAnnonces();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la publication.');
    }
  };

  const handleEpingler = async (id) => {
    try {
      await api.patch(`/annonces/${id}/epingler`);
      fetchAnnonces();
    } catch { setError('Erreur lors de l\'épinglage.'); }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    try {
      await api.delete(`/annonces/${id}`);
      setAnnonces(prev => prev.filter(a => a.id !== id));
    } catch { setError('Erreur lors de la suppression.'); }
  };

  const typeStyle = (type) => {
    switch (type) {
      case 'GLOBALE': return 'bg-blue-100 text-blue-700';
      case 'GROUPE':  return 'bg-purple-100 text-purple-700';
      case 'SYSTEME': return 'bg-gray-100 text-gray-600';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">📢 Annonces</h1>
          {peutPublier && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              {showForm ? 'Annuler' : '+ Nouvelle annonce'}
            </button>
          )}
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Formulaire */}
        {showForm && peutPublier && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Nouvelle annonce</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input required value={form.titre} onChange={e => setForm({...form, titre: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
                <textarea required value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="GLOBALE">🌍 Globale (tous les membres)</option>
                      <option value="GROUPE">👥 Groupe spécifique</option>
                    </select>
                  </div>
                )}
                {(form.type === 'GROUPE' || isReferent) && mesGroupes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
                    <select value={form.groupeId || ''} onChange={e => setForm({...form, groupeId: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="epinglee" checked={form.epinglee} onChange={e => setForm({...form, epinglee: e.target.checked})} />
                  <label htmlFor="epinglee" className="text-sm text-gray-700">📌 Épingler cette annonce</label>
                </div>
              )}
              <button type="submit" className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                Publier l'annonce
              </button>
            </form>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : annonces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-4xl mb-2">📢</div>
            <p className="text-gray-400 text-sm">Aucune annonce pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {annonces.map(a => (
              <div key={a.id} className={`bg-white rounded-2xl shadow p-5 ${a.epinglee ? 'border-l-4 border-blue-500' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {a.epinglee && <span className="text-blue-500">📌</span>}
                    <h3 className="font-bold text-blue-900">{a.titre}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeStyle(a.type)}`}>
                      {a.type === 'GLOBALE' ? '🌍 Global' : a.type === 'GROUPE' ? `👥 ${a.groupeNom}` : '⚙️ Système'}
                    </span>
                  </div>
                  {peutPublier && (
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button onClick={() => handleEpingler(a.id)}
                          className="text-xs text-blue-600 hover:underline">
                          {a.epinglee ? 'Désépingler' : '📌 Épingler'}
                        </button>
                      )}
                      <button onClick={() => handleSupprimer(a.id)}
                        className="text-xs text-red-500 hover:underline">
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-3 whitespace-pre-line">{a.contenu}</p>
                <p className="text-xs text-gray-400">
                  Par {a.auteurPrenom} {a.auteurNom} ({a.auteurRole}) ·{' '}
                  {new Date(a.dateCreation).toLocaleDateString('fr-BE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
