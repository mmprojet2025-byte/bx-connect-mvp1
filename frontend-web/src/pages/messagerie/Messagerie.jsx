import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

export default function Messagerie() {
  const [fils, setFils] = useState([]);
  const [filSelectionne, setFilSelectionne] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const messagesEndRef = useRef(null);

  // Charger les fils de discussion
  useEffect(() => {
    api.get('/messagerie/fils')
      .then(res => {
        setFils(res.data);
        setLoading(false);
      })
      .catch(() => {
        setErreur('Impossible de charger les fils de discussion.');
        setLoading(false);
      });
  }, []);

  // Charger les messages quand un fil est sélectionné
  useEffect(() => {
    if (!filSelectionne) return;
    api.get(`/messagerie/fils/${filSelectionne.id}/messages`)
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]));
  }, [filSelectionne]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const envoyerMessage = async (e) => {
    e.preventDefault();
    if (!nouveauMessage.trim() || !filSelectionne) return;
    try {
      const res = await api.post('/messagerie/messages', {
        contenu: nouveauMessage,
        filId: filSelectionne.id,
      });
      setMessages(prev => [...prev, res.data]);
      setNouveauMessage('');
    } catch {
      setErreur('Erreur lors de l\'envoi du message.');
    }
  };

  const badgeType = (type) => {
    const styles = {
      GENERAL: 'bg-blue-100 text-blue-700',
      PROJET: 'bg-green-100 text-green-700',
      EVENEMENT: 'bg-orange-100 text-orange-700',
      ADMIN: 'bg-red-100 text-red-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">

      {/* ── Colonne gauche : liste des fils ── */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">💬 Messagerie</h2>
          <p className="text-sm text-gray-500">{fils.length} fil(s) actif(s)</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fils.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Aucun fil disponible.</p>
          ) : (
            fils.map(fil => (
              <button
                key={fil.id}
                onClick={() => setFilSelectionne(fil)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  filSelectionne?.id === fil.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800 text-sm truncate">{fil.titre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeType(fil.type)}`}>
                    {fil.type}
                  </span>
                </div>
                {fil.description && (
                  <p className="text-xs text-gray-500 truncate">{fil.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Par {fil.createurPrenom} {fil.createurNom}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Colonne droite : conversation ── */}
      <div className="flex-1 flex flex-col">
        {!filSelectionne ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-lg font-medium">Sélectionne un fil de discussion</p>
              <p className="text-sm">pour voir les messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* En-tête du fil */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
              <div>
                <h3 className="font-bold text-gray-800">{filSelectionne.titre}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeType(filSelectionne.type)}`}>
                  {filSelectionne.type}
                </span>
              </div>
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm mt-8">
                  Aucun message dans ce fil. Sois le premier à écrire !
                </p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {msg.auteurPrenom?.[0]}{msg.auteurNom?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800">
                          {msg.auteurPrenom} {msg.auteurNom}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(msg.dateEnvoi)}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 text-sm text-gray-700">
                        {msg.contenu}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="bg-white border-t border-gray-200 p-4">
              {erreur && <p className="text-red-500 text-sm mb-2">{erreur}</p>}
              <form onSubmit={envoyerMessage} className="flex gap-3">
                <input
                  type="text"
                  value={nouveauMessage}
                  onChange={e => setNouveauMessage(e.target.value)}
                  placeholder="Écris un message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!nouveauMessage.trim()}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Envoyer
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}