import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function Messagerie() {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();

  const [fils, setFils] = useState([]);
  const [filActif, setFilActif] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [showNouveauFil, setShowNouveauFil] = useState(false);
  const [formFil, setFormFil] = useState({ titre: '', type: 'GENERAL' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchFils();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchFils = async () => {
    try {
      const res = await api.get('/messagerie/fils');
      setFils(res.data);
    } catch {
      setError(t('messaging.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (filId) => {
    setLoadingMessages(true);
    setError('');
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`);
      setMessages(res.data);
    } catch {
      setError(t('messaging.error_load'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectFil = (fil) => {
    setFilActif(fil);
    fetchMessages(fil.id);
    setNouveauMessage('');
  };

  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!nouveauMessage.trim()) return;
    try {
      await api.post(`/messagerie/fils/${filActif.id}/messages`, {
        contenu: nouveauMessage.trim(),
      });
      setNouveauMessage('');
      fetchMessages(filActif.id);
    } catch (err) {
      setError(err.response?.data?.message || t('messaging.error_load'));
    }
  };

  const handleCreerFil = async (e) => {
    e.preventDefault();
    try {
      await api.post('/messagerie/fils', formFil);
      setShowNouveauFil(false);
      setFormFil({ titre: '', type: 'GENERAL' });
      fetchFils();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  const typeBadgeStyle = (type) => ({
    ADMIN:     { bg: '#f8d7da', color: '#721c24' },
    PROJET:    { bg: '#d4edda', color: '#155724' },
    EVENEMENT: { bg: '#fff3cd', color: '#856404' },
    GENERAL:   { bg: '#e2eaf0', color: '#1A3C5E' },
  }[type] || { bg: '#e2eaf0', color: '#1A3C5E' });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitiales = (prenom, nom) =>
    ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">💬 {t('messaging.title')}</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('messaging.loading')}</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr', height: '70vh' }}>

            {/* ── Colonne gauche : liste des fils ── */}
            <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-blue-900 text-sm">Fils de discussion</span>
                {isAdmin && (
                  <button
                    onClick={() => setShowNouveauFil(!showNouveauFil)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-lg transition"
                  >
                    {t('messaging.new_thread')}
                  </button>
                )}
              </div>

              {/* Formulaire nouveau fil (Admin uniquement) */}
              {showNouveauFil && isAdmin && (
                <div className="px-3 py-3 border-b border-gray-100 bg-gray-50">
                  <form onSubmit={handleCreerFil} className="space-y-2">
                    <input
                      required
                      placeholder="Titre du fil..."
                      value={formFil.titre}
                      onChange={(e) => setFormFil({ ...formFil, titre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select
                      value={formFil.type}
                      onChange={(e) => setFormFil({ ...formFil, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="GENERAL">Général</option>
                      <option value="PROJET">Projet</option>
                      <option value="EVENEMENT">Événement</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded-lg transition"
                    >
                      Créer
                    </button>
                  </form>
                </div>
              )}

              {/* Liste des fils */}
              <div className="overflow-y-auto flex-1">
                {fils.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm p-6">{t('messaging.no_threads')}</p>
                ) : (
                  fils.map((fil) => {
                    const badge = typeBadgeStyle(fil.type);
                    const actif = filActif?.id === fil.id;
                    return (
                      <div
                        key={fil.id}
                        onClick={() => handleSelectFil(fil)}
                        className="px-4 py-3 border-b border-gray-50 cursor-pointer transition"
                        style={{
                          background: actif ? '#E2EAF0' : '#fff',
                          borderLeft: actif ? '3px solid #2E86AB' : '3px solid transparent',
                        }}
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={`text-sm ${actif ? 'font-semibold' : ''} text-blue-900`}>
                            {fil.titre}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {fil.type}
                          </span>
                        </div>
                        {fil.dernierMessage && (
                          <p className="text-gray-400 text-xs truncate">{fil.dernierMessage}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Colonne droite : conversation ── */}
            <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden">
              {!filActif ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-5xl mb-4">💬</div>
                    <p className="text-sm">{t('messaging.select_thread')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* En-tête du fil */}
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-blue-900">{filActif.titre}</h3>
                    <span className="text-xs text-gray-400">
                      {filActif.type} · {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Zone messages */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {loadingMessages ? (
                      <p className="text-gray-400 text-center text-sm">{t('messaging.loading')}</p>
                    ) : messages.length === 0 ? (
                      <p className="text-gray-400 text-center text-sm mt-8">
                        Aucun message dans ce fil. Soyez le premier à écrire !
                      </p>
                    ) : (
                      messages.map((msg) => {
                        const estMoi = msg.expediteurEmail === user?.email;
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                background: estMoi ? '#2E86AB' : '#E2EAF0',
                                color: estMoi ? '#fff' : '#1A3C5E',
                              }}
                            >
                              {getInitiales(msg.expediteurPrenom, msg.expediteurNom)}
                            </div>

                            {/* Bulle */}
                            <div className="max-w-xs md:max-w-md">
                              {!estMoi && (
                                <div className="text-xs text-gray-400 mb-0.5 pl-1">
                                  {msg.expediteurPrenom} {msg.expediteurNom}
                                  {msg.expediteurRole && (
                                    <span className="ml-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                      {msg.expediteurRole}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div
                                className="px-4 py-2 text-sm leading-relaxed break-words"
                                style={{
                                  background: estMoi ? '#2E86AB' : '#F0F4F8',
                                  color: estMoi ? '#fff' : '#1A3C5E',
                                  borderRadius: estMoi ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                }}
                              >
                                {msg.contenu}
                              </div>
                              <div className={`text-xs text-gray-400 mt-0.5 ${estMoi ? 'text-right pr-1' : 'pl-1'}`}>
                                {formatDate(msg.dateEnvoi)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Zone de saisie */}
                  {user ? (
                    <form
                      onSubmit={handleEnvoyer}
                      className="px-4 py-3 border-t border-gray-100 flex gap-3 items-center"
                    >
                      <input
                        type="text"
                        placeholder={t('messaging.type_message')}
                        value={nouveauMessage}
                        onChange={(e) => setNouveauMessage(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="submit"
                        disabled={!nouveauMessage.trim()}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white transition flex-shrink-0"
                        style={{ background: nouveauMessage.trim() ? '#2E86AB' : '#ccc' }}
                      >
                        ➤
                      </button>
                    </form>
                  ) : (
                    <div className="px-4 py-3 border-t border-gray-100 text-center text-sm text-gray-400">
                      <a href="/login" className="text-blue-600 hover:underline">Connectez-vous</a> pour envoyer un message.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}