import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import AppIcon from '../../components/ui/AppIcons'
import PageHeader from '../../components/ui/PageHeader'
import LoadingState from '../../components/ui/LoadingState'

export default function Messagerie() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [groupe, setGroupe] = useState(null)
  const [fil, setFil] = useState(null)
  const [messages, setMessages] = useState([])
  const [nouveauMessage, setNouveauMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [emptyState, setEmptyState] = useState('')
  const [error, setError] = useState('')
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

  const fetchMessagerie = useCallback(async () => {
    setLoading(true)
    setError('')
    setEmptyState('')
    try {
      const groupeRes = await api.get('/messagerie/mon-groupe')
      setGroupe(groupeRes.data)

      const filRes = await api.get(`/messagerie/groupes/${groupeRes.data.id}/fil`)
      setFil(filRes.data)
      await fetchMessages(filRes.data.id)
    } catch (err) {
      setGroupe(null)
      setFil(null)
      setMessages([])
      if (err.response?.status === 403) {
        setEmptyState(t('messaging.noGroup'))
      } else {
        setError(getAccessError(err, t))
      }
    } finally {
      setLoading(false)
    }
  }, [fetchMessages, t])

  useEffect(() => { fetchMessagerie() }, [fetchMessagerie])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleEnvoyer = async (e) => {
    e.preventDefault()
    if (!nouveauMessage.trim() || !groupe || !fil) return
    setError('')
    try {
      await api.post(`/messagerie/groupes/${groupe.id}/messages`, {
        contenu: nouveauMessage.trim(),
        filId: fil.id,
      })
      setNouveauMessage('')
      await fetchMessages(fil.id)
    } catch (err) {
      setError(getAccessError(err, t))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <PageHeader
          eyebrow={t('nav.messaging')}
          title={t('messaging.groupMessaging')}
          description={groupe ? groupe.nom : t('messaging.joinGroupDescription')}
        />

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : emptyState ? (
          <EmptyState
            icon="Users"
            title={emptyState}
            description={t('messaging.joinGroupDescription')}
            actionLabel={t('groups.discover')}
            actionTo="/groupes"
          />
        ) : !fil ? (
          <EmptyState
            icon="MessageCircle"
            title={t('messaging.threadUnavailable')}
            description={t('messaging.threadNotOpen')}
            actionLabel={t('nav.dashboard')}
            actionTo="/dashboard"
          />
        ) : (
          <section className="flex h-[55vh] min-h-[360px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <AppIcon name="MessageCircle" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">{fil.titre}</h2>
                  <p className="text-xs text-slate-500">{t('messaging.messagesCount', { count: messages.length })}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/40 p-4">
              {loadingMessages ? (
                <p className="text-slate-400 text-center text-sm">{t('messaging.loadingMessages')}</p>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
                  <AppIcon name="MessageCircle" className="mx-auto mb-3 h-10 w-10 text-indigo-200" />
                  {t('messaging.noMessages')}
                </div>
              ) : (
                messages.map(message => (
                  <MessageBubble key={message.id} message={message} currentUser={user} language={i18n.language} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleEnvoyer} className="border-t border-gray-100 bg-white px-4 py-3 flex gap-3 items-center">
              <input
                type="text"
                placeholder={t('messaging.type_message')}
                value={nouveauMessage}
                onChange={e => setNouveauMessage(e.target.value)}
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={!nouveauMessage.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:bg-gray-300"
              >
                <AppIcon name="MessageCircle" className="h-4 w-4" />
                {t('common.send')}
              </button>
            </form>
          </section>
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
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold shadow-sm ${estMoi ? 'bg-indigo-100 text-indigo-900' : 'bg-white text-slate-950 ring-1 ring-slate-100'}`}>
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className="max-w-xs md:max-w-md">
        {!estMoi && (
          <div className="text-xs text-slate-400 mb-0.5 pl-1">
            {message.auteurPrenom} {message.auteurNom}
          </div>
        )}
        <div className={`px-4 py-3 text-sm leading-relaxed break-words shadow-sm ${estMoi ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-100'}`} style={{ borderRadius: estMoi ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
          {message.contenu}
        </div>
        <div className={`text-xs text-slate-400 mt-0.5 ${estMoi ? 'text-right pr-1' : 'pl-1'}`}>
          {formatDate(message.dateEnvoi, language)}
        </div>
      </div>
    </div>
  )
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
