import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import AppIcon from '../../components/ui/AppIcons';

export default function GestionPrestations() {
  const { isAdmin } = useAuth();
  const [prestations, setPrestations] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [groupeSelectionne, setGroupeSelectionne] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('EN_ATTENTE');

  useEffect(() => {
    if (isAdmin) {
      fetchToutesPrestations();
    } else {
      fetchMesGroupes();
    }
  }, []);

  useEffect(() => {
    if (groupeSelectionne) fetchPrestationsGroupe(groupeSelectionne);
  }, [groupeSelectionne]);

  const fetchMesGroupes = async () => {
    try {
      await api.get('/referent/mes-activites');
      // Récupérer les groupes du référent
      const gRes = await api.get('/groupes/referent/mes-groupes');
      setMesGroupes(gRes.data);
      if (gRes.data.length > 0) setGroupeSelectionne(gRes.data[0].id);
    } catch { setError('Impossible de charger vos groupes.'); }
    finally { setLoading(false); }
  };

  const fetchPrestationsGroupe = async (groupeId) => {
    setLoading(true);
    try {
      const res = await api.get(`/prestations/groupe/${groupeId}`);
      setPrestations(res.data);
    } catch { setError('Impossible de charger les prestations.'); }
    finally { setLoading(false); }
  };

  const fetchToutesPrestations = async () => {
    try {
      const res = await api.get('/prestations/admin/toutes');
      setPrestations(res.data);
    } catch { setError('Impossible de charger les prestations.'); }
    finally { setLoading(false); }
  };

  const handleValider = async (id) => {
    try {
      await api.patch(`/prestations/${id}/valider`, { commentaire: 'Validée par le référent' });
      setMessage('Prestation validée !');
      if (isAdmin) fetchToutesPrestations();
      else if (groupeSelectionne) fetchPrestationsGroupe(groupeSelectionne);
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Erreur lors de la validation.'); }
  };

  const handleRefuser = async (id) => {
    const commentaire = prompt('Motif du refus :') || 'Non précisé';
    try {
      await api.patch(`/prestations/${id}/refuser`, { commentaire });
      setMessage('Prestation refusée.');
      if (isAdmin) fetchToutesPrestations();
      else if (groupeSelectionne) fetchPrestationsGroupe(groupeSelectionne);
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Erreur lors du refus.'); }
  };

  const prestationsFiltrees = prestations.filter(p =>
    filtre === 'TOUS' || p.statut === filtre
  );

  const statutStyle = (s) => {
    switch (s) {
      case 'VALIDEE':    return 'bg-green-100 text-green-700';
      case 'REFUSEE':    return 'bg-red-100 text-red-700';
      default:           return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        <h1 className="text-2xl font-bold text-blue-900 mb-6">
          <span className="inline-flex items-center gap-2">
            <AppIcon name="Handshake" className="h-6 w-6" />
            {isAdmin ? 'Toutes les prestations' : 'Validation des prestations'}
          </span>
        </h1>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{message}</div>}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* Sélecteur de groupe (référent) */}
        {!isAdmin && mesGroupes.length > 1 && (
          <div className="mb-4">
            <select value={groupeSelectionne || ''} onChange={e => setGroupeSelectionne(parseInt(e.target.value))}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['TOUS', 'EN_ATTENTE', 'VALIDEE', 'REFUSEE'].map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filtre === f ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}>
              {f} ({prestations.filter(p => f === 'TOUS' || p.statut === f).length})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : prestationsFiltrees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <AppIcon name="Handshake" className="mx-auto mb-3 h-10 w-10 text-blue-300" />
            <p className="text-gray-400 text-sm">Aucune prestation {filtre !== 'TOUS' ? `avec le statut "${filtre}"` : ''}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prestationsFiltrees.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-blue-900">{p.titre}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1"><AppIcon name="User" className="h-3.5 w-3.5" />{p.membrePrenom} {p.membreNom}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><AppIcon name="Calendar" className="h-3.5 w-3.5" />{p.datePrestation}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><AppIcon name="Clock" className="h-3.5 w-3.5" />{p.dureeHeures}h</span>
                      <span>·</span>
                      <span>{p.type}</span>
                    </p>
                    {p.groupeNom && <p className="inline-flex items-center gap-1 text-xs text-gray-400"><AppIcon name="Users" className="h-3.5 w-3.5" />{p.groupeNom}</p>}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statutStyle(p.statut)}`}>
                    {p.statut}
                  </span>
                </div>

                {p.description && <p className="text-sm text-gray-600 mb-3">{p.description}</p>}
                {p.commentaire && (
                  <p className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 italic"><AppIcon name="MessageCircle" className="h-3.5 w-3.5" />{p.commentaire}</p>
                )}

                {p.statut === 'EN_ATTENTE' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleValider(p.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-xl transition">
                      <AppIcon name="CheckCircle" className="h-4 w-4" />
                      Valider
                    </button>
                    <button onClick={() => handleRefuser(p.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 rounded-xl transition">
                      <AppIcon name="XCircle" className="h-4 w-4" />
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
