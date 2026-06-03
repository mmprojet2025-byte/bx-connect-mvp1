import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{t('nav.messaging')}</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{t('messaging.groupMessaging')}</h1>
          {groupe && <p className="text-sm text-gray-500 mt-1">{groupe.nom}</p>}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('messaging.loadingMessaging')}</p>
        ) : emptyState ? (
          <EmptyState
            title={emptyState}
            description={t('messaging.joinGroupDescription')}
            actionLabel={t('groups.discover')}
            actionTo="/groupes"
          />
        ) : !fil ? (
          <EmptyState
            title={t('messaging.threadUnavailable')}
            description={t('messaging.threadNotOpen')}
            actionLabel={t('nav.dashboard')}
            actionTo="/dashboard"
          />
        ) : (
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '70vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/70">
              <h2 className="font-bold text-slate-950">{fil.titre}</h2>
              <p className="text-xs text-gray-500">{t('messaging.messagesCount', { count: messages.length })}</p>
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

            <form onSubmit={handleEnvoyer} className="px-4 py-3 border-t border-gray-100 bg-white flex gap-3 items-center">
              <input
                type="text"
                placeholder={t('messaging.type_message')}
                value={nouveauMessage}
                onChange={e => setNouveauMessage(e.target.value)}
                className="flex-1 border border-slate-200 bg-slate-50 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={!nouveauMessage.trim()}
                className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:bg-gray-300"
              >
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
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-blue-100 text-blue-900">
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className="max-w-xs md:max-w-md">
        {!estMoi && (
          <div className="text-xs text-gray-400 mb-0.5 pl-1">
            {message.auteurPrenom} {message.auteurNom}
          </div>
        )}
        <div className={`px-4 py-3 text-sm leading-relaxed break-words shadow-sm ${estMoi ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`} style={{ borderRadius: estMoi ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
          {message.contenu}
        </div>
        <div className={`text-xs text-gray-400 mt-0.5 ${estMoi ? 'text-right pr-1' : 'pl-1'}`}>
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
