import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import api from '../../api/axios'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import MessageComposer from '../../components/messaging/MessageComposer'

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
      toast.success(t('messaging.messageSent', { defaultValue: 'Message envoyé.' }))
    } catch (err) {
      setError(getAccessError(err, t))
      toast.error(getAccessError(err, t))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <PageHeader
          eyebrow={t('nav.messaging')}
          title={t('messaging.referentMessaging')}
          description={t('messaging.referentSubtitle')}
        />

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('common.loading')}</p>
        ) : groupes.length === 0 ? (
          <EmptyState>{t('messaging.noAssignedGroups')}</EmptyState>
        ) : (
          <div className="grid min-h-[360px] grid-cols-1 gap-4 lg:h-[55vh] lg:grid-cols-[320px_1fr]">
            <aside className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white">
                <span className="inline-flex items-center gap-2 font-semibold text-blue-900 text-sm">
                  <AppIcon name="Users" className="h-4 w-4 text-teal-700" />
                  {t('nav.myGroups')}
                </span>
              </div>
              <div className="overflow-y-auto flex-1">
                {groupes.map(groupe => {
                  const actif = groupeActif?.id === groupe.id
                  return (
                    <button
                      key={groupe.id}
                      type="button"
                      onClick={() => selectionnerGroupe(groupe)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition hover:bg-teal-50/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-400 ${actif ? 'bg-teal-50 border-l-4 border-l-teal-600' : 'bg-white border-l-4 border-l-transparent'}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                          <AppIcon name="MessageCircle" className="h-4 w-4" />
                        </span>
                        {groupe.nom}
                      </span>
                      <span className="mt-1 block pl-10 text-xs text-gray-400">{t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}</span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
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
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:bg-gray-300"
                    >
                      <AppIcon name="PlusCircle" className="h-4 w-4" />
                      {creatingFil ? t('messaging.creatingThread') : t('messaging.createGroupThread')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                        <AppIcon name="MessageCircle" className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-950">{filActif.titre}</h2>
                        <p className="text-xs text-gray-400">{groupeActif.nom} · {t('messaging.messagesCount', { count: messages.length })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/40 p-4">
                    {loadingMessages ? (
                      <p className="text-gray-400 text-center text-sm">{t('messaging.loadingMessages')}</p>
                    ) : messages.length === 0 ? (
                      <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
                        <AppIcon name="MessageCircle" className="mx-auto mb-3 h-10 w-10 text-teal-200" />
                        {t('messaging.noMessages')}
                      </div>
                    ) : (
                      messages.map(message => (
                        <MessageBubble key={message.id} message={message} currentUser={user} language={i18n.language} />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <MessageComposer
                    value={nouveauMessage}
                    onChange={setNouveauMessage}
                    onSubmit={handleEnvoyer}
                    placeholder={t('messaging.writeInGroup')}
                    sendLabel={t('common.send')}
                    accent="teal"
                  />
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
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold shadow-sm ${estMoi ? 'bg-teal-100 text-teal-900' : 'bg-white text-teal-900 ring-1 ring-slate-100'}`}>
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className="max-w-xs md:max-w-md">
        {!estMoi && <div className="text-xs text-gray-400 mb-0.5 pl-1">{message.auteurPrenom} {message.auteurNom}</div>}
        <div className={`px-4 py-3 text-sm leading-relaxed break-words shadow-sm ${estMoi ? 'bg-teal-700 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-100'}`} style={{ borderRadius: estMoi ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
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
