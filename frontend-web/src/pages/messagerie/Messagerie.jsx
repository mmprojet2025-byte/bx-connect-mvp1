import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

export default function Messagerie() {
  const [fils, setFils] = useState([]);
  const [filActif, setFilActif] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showNouveauFil, setShowNouveauFil] = useState(false);
  const [formFil, setFormFil] = useState({ titre: '', type: 'GENERAL' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
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
      setError('Impossible de charger les fils de discussion.');
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
      setError('Impossible de charger les messages.');
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
      setError(err.response?.data?.message || "Erreur lors de l'envoi du message.");
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
      setError(err.response?.data?.message || 'Erreur lors de la création du fil.');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const typeBadgeStyle = (type) => {
    const styles = {
      ADMIN: { bg: '#f8d7da', color: '#721c24' },
      PROJET: { bg: '#d4edda', color: '#155724' },
      EVENEMENT: { bg: '#fff3cd', color: '#856404' },
      GENERAL: { bg: '#e2eaf0', color: '#1A3C5E' },
    };
    return styles[type] || styles.GENERAL;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getInitiales = (prenom, nom) =>
    ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';

  if (loading) return <p style={{ padding: '2rem' }}>Chargement de la messagerie...</p>;

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ color: '#1A3C5E', marginBottom: '1.5rem' }}>💬 Messagerie</h1>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: '70vh' }}>

        {/* ── Colonne gauche : liste des fils ── */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #E2EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#1A3C5E', fontSize: '0.95rem' }}>Fils de discussion</span>
            {isAdmin && (
              <button
                onClick={() => setShowNouveauFil(!showNouveauFil)}
                style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                + Nouveau
              </button>
            )}
          </div>

          {/* Formulaire nouveau fil (Admin uniquement) */}
          {showNouveauFil && isAdmin && (
            <div style={{ padding: '0.75rem', borderBottom: '1px solid #E2EAF0', background: '#F0F4F8' }}>
              <form onSubmit={handleCreerFil} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  required
                  placeholder="Titre du fil..."
                  value={formFil.titre}
                  onChange={(e) => setFormFil({ ...formFil, titre: e.target.value })}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                />
                <select
                  value={formFil.type}
                  onChange={(e) => setFormFil({ ...formFil, type: e.target.value })}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                >
                  <option value="GENERAL">Général</option>
                  <option value="PROJET">Projet</option>
                  <option value="EVENEMENT">Événement</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Créer
                </button>
              </form>
            </div>
          )}

          {/* Liste des fils */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {fils.length === 0 ? (
              <p style={{ color: '#4A6A8A', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
                Aucun fil disponible.
              </p>
            ) : (
              fils.map((fil) => {
                const badge = typeBadgeStyle(fil.type);
                const actif = filActif?.id === fil.id;
                return (
                  <div
                    key={fil.id}
                    onClick={() => handleSelectFil(fil)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #F0F4F8',
                      cursor: 'pointer',
                      background: actif ? '#E2EAF0' : '#fff',
                      borderLeft: actif ? '3px solid #2E86AB' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: actif ? 600 : 400, color: '#1A3C5E', fontSize: '0.9rem' }}>
                        {fil.titre}
                      </span>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: '20px', padding: '1px 7px', fontSize: '0.65rem' }}>
                        {fil.type}
                      </span>
                    </div>
                    {fil.dernierMessage && (
                      <p style={{ color: '#4A6A8A', fontSize: '0.75rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fil.dernierMessage}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Colonne droite : conversation ── */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!filActif ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6A8A' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                <p>Sélectionnez un fil de discussion pour commencer.</p>
              </div>
            </div>
          ) : (
            <>
              {/* En-tête du fil */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2EAF0' }}>
                <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: '1rem' }}>{filActif.titre}</h3>
                <span style={{ fontSize: '0.75rem', color: '#4A6A8A' }}>
                  {filActif.type} · {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Zone messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loadingMessages ? (
                  <p style={{ color: '#4A6A8A', textAlign: 'center' }}>Chargement...</p>
                ) : messages.length === 0 ? (
                  <p style={{ color: '#4A6A8A', textAlign: 'center', marginTop: '2rem' }}>
                    Aucun message dans ce fil. Soyez le premier à écrire !
                  </p>
                ) : (
                  messages.map((msg) => {
                    const estMoi = msg.expediteurEmail === user?.email;
                    return (
                      <div
                        key={msg.id}
                        style={{ display: 'flex', flexDirection: estMoi ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '0.5rem' }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: estMoi ? '#2E86AB' : '#E2EAF0',
                          color: estMoi ? '#fff' : '#1A3C5E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                        }}>
                          {getInitiales(msg.expediteurPrenom, msg.expediteurNom)}
                        </div>

                        {/* Bulle */}
                        <div style={{ maxWidth: '65%' }}>
                          {!estMoi && (
                            <div style={{ fontSize: '0.72rem', color: '#4A6A8A', marginBottom: '2px', paddingLeft: '4px' }}>
                              {msg.expediteurPrenom} {msg.expediteurNom}
                              {msg.expediteurRole && (
                                <span style={{ marginLeft: '4px', background: '#E2EAF0', borderRadius: '10px', padding: '1px 6px', fontSize: '0.65rem' }}>
                                  {msg.expediteurRole}
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{
                            background: estMoi ? '#2E86AB' : '#F0F4F8',
                            color: estMoi ? '#fff' : '#1A3C5E',
                            borderRadius: estMoi ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            padding: '0.6rem 0.9rem', fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word',
                          }}>
                            {msg.contenu}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#4A6A8A', marginTop: '2px', textAlign: estMoi ? 'right' : 'left', paddingLeft: '4px', paddingRight: '4px' }}>
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
                  style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2EAF0', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    placeholder="Écrire un message..."
                    value={nouveauMessage}
                    onChange={(e) => setNouveauMessage(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '20px', border: '1px solid #ccc', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={!nouveauMessage.trim()}
                    style={{
                      background: nouveauMessage.trim() ? '#2E86AB' : '#ccc',
                      color: '#fff', border: 'none', borderRadius: '50%',
                      width: '40px', height: '40px',
                      cursor: nouveauMessage.trim() ? 'pointer' : 'default',
                      fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    ➤
                  </button>
                </form>
              ) : (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2EAF0', textAlign: 'center', color: '#4A6A8A', fontSize: '0.85rem' }}>
                  <a href="/connexion" style={{ color: '#2E86AB' }}>Connectez-vous</a> pour envoyer un message.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}