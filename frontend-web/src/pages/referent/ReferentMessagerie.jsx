import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function ReferentMessagerie() {
  const { user } = useAuth()
  const [groupes, setGroupes] = useState([])
  const [groupeActif, setGroupeActif] = useState(null)
  const [filActif, setFilActif] = useState(null)
  const [messages, setMessages] = useState([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [creatingFil, setCreatingFil] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const messagesEndRef = useRef(null)

  const fetchMessages = useCallback(async (filId) => {
    setLoadingMessages(true)
    setError('')
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`)
      setMessages(res.data)
    } catch (err) {
      setError(getAccessError(err))
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const selectionnerGroupe = useCallback(async (groupe) => {
    setGroupeActif(groupe)
    setFilActif(null)
    setMessages([])
    setNouveauMessage('')
    setError('')
    setInfo('')
    try {
      const filRes = await api.get(`/messagerie/groupes/${groupe.id}/fil`)
      setFilActif(filRes.data)
      await fetchMessages(filRes.data.id)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Accès non autorisé à cette messagerie.')
      } else {
        setInfo('Aucun fil de discussion actif pour ce groupe.')
      }
    }
  }, [fetchMessages])

  const fetchGroupes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/referent/groupes')
      setGroupes(res.data)
      if (res.data.length > 0) {
        await selectionnerGroupe(res.data[0])
      }
    } catch {
      setError('Impossible de charger vos groupes.')
    } finally {
      setLoading(false)
    }
  }, [selectionnerGroupe])

  useEffect(() => { fetchGroupes() }, [fetchGroupes])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const creerFil = async () => {
    if (!groupeActif) return
    setCreatingFil(true)
    setError('')
    try {
      const res = await api.post('/messagerie/fils', {
        titre: `Discussion - ${groupeActif.nom}`,
        description: `Messagerie du groupe ${groupeActif.nom}`,
        type: 'GENERAL',
        groupeId: groupeActif.id,
      })
      setFilActif(res.data)
      setInfo('')
      await fetchMessages(res.data.id)
    } catch (err) {
      setError(getAccessError(err))
    } finally {
      setCreatingFil(false)
    }
  }

  const handleEnvoyer = async (e) => {
    e.preventDefault()
    if (!nouveauMessage.trim() || !groupeActif || !filActif) return
    setError('')
    try {
      await api.post(`/messagerie/groupes/${groupeActif.id}/messages`, {
        contenu: nouveauMessage.trim(),
        filId: filActif.id,
      })
      setNouveauMessage('')
      await fetchMessages(filActif.id)
    } catch (err) {
      setError(getAccessError(err))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Messagerie référent</h1>
          <p className="text-sm text-gray-500 mt-1">Discussions limitées aux groupes que vous encadrez.</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">Chargement...</p>
        ) : groupes.length === 0 ? (
          <EmptyState>Aucun groupe ne vous est assigné.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
            <aside className="bg-white rounded-2xl shadow flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-blue-900 text-sm">Mes groupes</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {groupes.map(groupe => {
                  const actif = groupeActif?.id === groupe.id
                  return (
                    <button
                      key={groupe.id}
                      type="button"
                      onClick={() => selectionnerGroupe(groupe)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${actif ? 'bg-teal-50 border-l-4 border-l-teal-600' : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                    >
                      <span className="block text-sm font-semibold text-blue-900">{groupe.nom}</span>
                      <span className="block text-xs text-gray-400">{groupe.nombreMembres ?? 0} membre(s)</span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
              {!groupeActif ? (
                <EmptyConversation>Sélectionnez un groupe.</EmptyConversation>
              ) : !filActif ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <p className="text-sm text-gray-500 mb-4">{info || 'Discussion indisponible.'}</p>
                    <button
                      type="button"
                      onClick={creerFil}
                      disabled={creatingFil}
                      className="bg-teal-700 hover:bg-teal-600 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                    >
                      {creatingFil ? 'Création...' : 'Créer la discussion du groupe'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-blue-900">{filActif.titre}</h2>
                    <p className="text-xs text-gray-400">{groupeActif.nom} · {messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {loadingMessages ? (
                      <p className="text-gray-400 text-center text-sm">Chargement des messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-gray-400 text-center text-sm mt-8">Aucun message dans ce groupe.</p>
                    ) : (
                      messages.map(message => (
                        <MessageBubble key={message.id} message={message} currentUser={user} />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleEnvoyer} className="px-4 py-3 border-t border-gray-100 flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder="Écrire dans ce groupe..."
                      value={nouveauMessage}
                      onChange={e => setNouveauMessage(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      type="submit"
                      disabled={!nouveauMessage.trim()}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white transition disabled:bg-gray-300 bg-teal-700 hover:bg-teal-600"
                    >
                      ➤
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function MessageBubble({ message, currentUser }) {
  const estMoi = message.auteurPrenom === currentUser?.prenom && message.auteurNom === currentUser?.nom
  return (
    <div className={`flex items-end gap-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-teal-100 text-teal-900">
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className="max-w-xs md:max-w-md">
        {!estMoi && <div className="text-xs text-gray-400 mb-0.5 pl-1">{message.auteurPrenom} {message.auteurNom}</div>}
        <div className={`px-4 py-2 text-sm leading-relaxed break-words ${estMoi ? 'bg-teal-700 text-white' : 'bg-gray-100 text-blue-900'}`} style={{ borderRadius: estMoi ? '12px 12px 2px 12px' : '12px 12px 12px 2px' }}>
          {message.contenu}
        </div>
        <div className={`text-xs text-gray-400 mt-0.5 ${estMoi ? 'text-right pr-1' : 'pl-1'}`}>
          {formatDate(message.dateEnvoi)}
        </div>
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700'

  return <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500 text-sm">{children}</div>
}

function EmptyConversation({ children }) {
  return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{children}</div>
}

function getAccessError(err) {
  return err.response?.status === 403
    ? 'Accès non autorisé à cette messagerie.'
    : 'Impossible de charger la messagerie.'
}

function getInitiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('fr-BE')} ${d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`
}
