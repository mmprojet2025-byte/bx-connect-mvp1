import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'

export default function ReferentMessagerie() {
  const { t, i18n } = useTranslation()
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
      setError(getAccessError(err, t))
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [t])

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
        setError(t('messaging.accessDenied'))
      } else {
        setInfo(t('messaging.noActiveThread'))
      }
    }
  }, [fetchMessages, t])

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
      setError(t('messaging.errorGroups'))
    } finally {
      setLoading(false)
    }
  }, [selectionnerGroupe, t])

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
        description: t('messaging.groupDescription', { group: groupeActif.nom }),
        type: 'GENERAL',
        groupeId: groupeActif.id,
      })
      setFilActif(res.data)
      setInfo('')
      await fetchMessages(res.data.id)
    } catch (err) {
      setError(getAccessError(err, t))
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
      setError(getAccessError(err, t))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-600">{t('nav.messaging')}</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{t('messaging.referentMessaging')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('messaging.referentSubtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupes.length === 0 ? (
          <EmptyState>{t('messaging.noAssignedGroups')}</EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
            <aside className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-blue-900 text-sm">{t('nav.myGroups')}</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {groupes.map(groupe => {
                  const actif = groupeActif?.id === groupe.id
                  return (
                    <button
                      key={groupe.id}
                      type="button"
                      onClick={() => selectionnerGroupe(groupe)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${actif ? 'bg-teal-50 border-l-4 border-l-teal-600' : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                    >
                      <span className="block text-sm font-semibold text-blue-900">{groupe.nom}</span>
                      <span className="block text-xs text-gray-400">{t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}</span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              {!groupeActif ? (
                <EmptyConversation>{t('messaging.selectGroup')}</EmptyConversation>
              ) : !filActif ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <p className="text-sm text-gray-500 mb-4">{info || t('messaging.threadUnavailable')}</p>
                    <button
                      type="button"
                      onClick={creerFil}
                      disabled={creatingFil}
                      className="bg-teal-700 hover:bg-teal-600 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                    >
                      {creatingFil ? t('messaging.creatingThread') : t('messaging.createGroupThread')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/70">
                    <h2 className="font-bold text-slate-950">{filActif.titre}</h2>
                    <p className="text-xs text-gray-400">{groupeActif.nom} · {t('messaging.messagesCount', { count: messages.length })}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {loadingMessages ? (
                      <p className="text-gray-400 text-center text-sm">{t('messaging.loadingMessages')}</p>
                    ) : messages.length === 0 ? (
                      <p className="text-gray-400 text-center text-sm mt-8">{t('messaging.noMessages')}</p>
                    ) : (
                      messages.map(message => (
                        <MessageBubble key={message.id} message={message} currentUser={user} language={i18n.language} />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleEnvoyer} className="px-4 py-3 border-t border-gray-100 flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder={t('messaging.writeInGroup')}
                      value={nouveauMessage}
                      onChange={e => setNouveauMessage(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      type="submit"
                      disabled={!nouveauMessage.trim()}
                      className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-gray-300"
                    >
                      {t('common.send')}
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

function MessageBubble({ message, currentUser, language }) {
  const estMoi = message.auteurPrenom === currentUser?.prenom && message.auteurNom === currentUser?.nom
  return (
    <div className={`flex items-end gap-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-teal-100 text-teal-900">
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className="max-w-xs md:max-w-md">
        {!estMoi && <div className="text-xs text-gray-400 mb-0.5 pl-1">{message.auteurPrenom} {message.auteurNom}</div>}
        <div className={`px-4 py-3 text-sm leading-relaxed break-words shadow-sm ${estMoi ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'}`} style={{ borderRadius: estMoi ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
          {message.contenu}
        </div>
        <div className={`text-xs text-gray-400 mt-0.5 ${estMoi ? 'text-right pr-1' : 'pl-1'}`}>
          {formatDate(message.dateEnvoi, language)}
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

function getAccessError(err, t) {
  return err.response?.status === 403
    ? t('messaging.accessDenied')
    : t('messaging.errorMessaging')
}

function getInitiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?'
}

function formatDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.toLocaleDateString(language || 'fr-BE')} ${d.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' })}`
}
