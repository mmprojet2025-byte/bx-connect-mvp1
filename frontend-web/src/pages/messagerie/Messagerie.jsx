import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import AppIcon from '../../components/ui/AppIcons'
import LoadingState from '../../components/ui/LoadingState'
import MessageComposer from '../../components/messaging/MessageComposer'
import BusinessMessageCard, { getBusinessPayload } from '../../components/messaging/BusinessMessageCard'
import useGroupMessaging from '../../hooks/useGroupMessaging'

export default function Messagerie() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [nouveauMessage, setNouveauMessage] = useState('')
  const messagesEndRef = useRef(null)
  const {
    emptyState,
    error,
    fil,
    groupe,
    loading,
    loadingMessages,
    messages,
    sendMessage,
  } = useGroupMessaging({ t })
  const lastMessage = messages[messages.length - 1]
  const memberCount = groupe?.nombreMembres ?? countMessageAuthors(messages)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleEnvoyer = async (e) => {
    e.preventDefault()
    if (!nouveauMessage.trim() || !groupe || !fil) return
    try {
      await sendMessage(nouveauMessage)
      setNouveauMessage('')
      toast.success(t('messaging.messageSent'))
    } catch {
      toast.error(t('messaging.errorMessaging'))
    }
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100">
      <Navbar />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-3 lg:px-5">
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
          <section className="relative grid min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 lg:grid-cols-[310px_minmax(0,1fr)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-500" />
            <aside className="flex min-h-0 flex-col border-b border-slate-100 bg-white lg:border-b-0 lg:border-r">
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
                  <AppIcon name="MessageCircle" className="h-4 w-4 text-blue-700" />
                  {t('messaging.conversations')}
                </h2>
              </div>
              <div className="messaging-scroll min-h-0 flex-1 overflow-y-auto p-2">
                <button type="button" className="flex w-full items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-left text-sm transition hover:bg-blue-100">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-700 to-teal-600 text-white">
                    {getGroupInitial(groupe?.nom)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black text-slate-950">{groupe?.nom}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {lastMessage?.contenu || t('messaging.noMessages')}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] font-bold text-slate-400">{formatTime(lastMessage?.dateEnvoi, i18n.language)}</span>
                  </span>
                </button>
              </div>
            </aside>

            <div className="flex min-h-0 overflow-hidden flex-col">
              <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-white to-emerald-50/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-teal-600 text-sm font-black text-white">
                    {getGroupInitial(groupe?.nom)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-black text-slate-950">{groupe?.nom || fil.titre}</h2>
                    <p className="truncate text-xs text-slate-500">
                      {t('messaging.membersCount', { count: memberCount })} · {t('messaging.activeStatus')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="messaging-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto bg-slate-50 px-3 py-2 sm:px-4">
                {loadingMessages ? (
                  <p className="text-slate-400 text-center text-sm">{t('messaging.loadingMessages')}</p>
                ) : messages.length === 0 ? (
                  <div className="mx-auto mt-8 max-w-sm rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
                    <AppIcon name="MessageCircle" className="mx-auto mb-3 h-10 w-10 text-blue-200" />
                    {t('messaging.noMessages')}
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const previous = messages[index - 1]
                    const showDateSeparator = !isSameMessageDay(message, previous)
                    const previousInSameDay = showDateSeparator ? null : previous
                    const showAuthor = shouldShowAuthor(message, previousInSameDay, user)
                    const compact = isSameAuthor(message, previousInSameDay)
                    return (
                      <div key={message.id}>
                        {showDateSeparator && (
                          <DateSeparator label={formatMessageDay(message.dateEnvoi, i18n.language, t)} />
                        )}
                        {isSystemMessage(message) ? (
                          <SystemMessageCard message={message} language={i18n.language} t={t} />
                        ) : (
                          <MessageBubble
                            message={message}
                            currentUser={user}
                            language={i18n.language}
                            showAuthor={showAuthor}
                            compact={compact}
                            t={t}
                          />
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <MessageComposer
                value={nouveauMessage}
                onChange={setNouveauMessage}
                onSubmit={handleEnvoyer}
                placeholder={t('messaging.type_message')}
                sendLabel={t('common.send')}
                emojiLabel={t('messaging.addEmoji')}
                attachmentLabel={t('messaging.addAttachment')}
                attachmentRemoveLabel={t('messaging.removeAttachment')}
                attachmentLocalOnlyLabel={t('messaging.attachmentLocalOnly')}
                attachmentDropLabel={t('messaging.dropAttachment')}
                accent="teal"
              />
            </div>

          </section>
        )}
      </main>
    </div>
  )
}

function MessageBubble({ message, currentUser, language, showAuthor, compact, t }) {
  const estMoi = message.auteurId != null && currentUser?.id != null && Number(message.auteurId) === Number(currentUser.id)
  const handleCopy = async () => {
    try {
      await copyText(message.contenu || '')
      toast.success(t('messaging.copied'))
    } catch {
      toast.error(t('messaging.copyFailed'))
    }
  }

  return (
    <div className={`messaging-message group flex items-end gap-1.5 ${compact ? 'mt-0' : 'mt-1'} ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ${compact ? 'invisible' : ''} ${estMoi ? 'bg-blue-100 text-blue-900' : 'bg-white text-slate-950 ring-1 ring-slate-100'}`}>
        {getInitiales(message.auteurPrenom, message.auteurNom)}
      </div>
      <div className={`relative max-w-[82%] sm:max-w-[70%] md:max-w-[64%] ${estMoi ? 'items-end' : 'items-start'}`}>
        {showAuthor && (
          <div className="mb-px pl-1 text-[11px] font-bold text-slate-500">
            {message.auteurPrenom} {message.auteurNom}
          </div>
        )}
        <div className={`relative transition hover:-translate-y-px hover:shadow-md ${estMoi ? 'bg-blue-50 text-slate-900 ring-1 ring-blue-100' : 'bg-white text-slate-800 ring-1 ring-slate-100'}`} style={{ borderRadius: estMoi ? '18px 18px 5px 18px' : '18px 18px 18px 5px' }}>
          <div className="break-words px-3 py-1.5 pr-12 text-[13px] leading-snug sm:text-sm">
            {message.contenu}
          </div>
          <div className={`pointer-events-none absolute bottom-0.5 right-2 text-[9px] font-semibold leading-none ${estMoi ? 'text-blue-500/80' : 'text-slate-400'}`}>
            {formatTime(message.dateEnvoi, language)}
          </div>
        </div>
        <MessageHoverActions estMoi={estMoi} onCopy={handleCopy} t={t} />
      </div>
    </div>
  )
}

function MessageHoverActions({ estMoi, onCopy, t }) {
  return (
    <div className={`pointer-events-none absolute top-1 flex translate-y-1 items-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 ${estMoi ? 'right-full mr-2' : 'left-full ml-2'}`}>
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-lg shadow-slate-900/10 backdrop-blur">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
          aria-label={t('messaging.copyMessage')}
        >
          <AppIcon name="Copy" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function SystemMessageCard({ message, language, t }) {
  const businessPayload = getBusinessPayload(message)

  return (
    <div className="messaging-message my-2 flex justify-center">
      {businessPayload ? (
        <BusinessMessageCard
          type={businessPayload.type}
          data={businessPayload.data}
          t={t}
          language={language}
        />
      ) : (
        <div className="max-w-lg rounded-xl border border-teal-100 bg-gradient-to-r from-blue-50 to-emerald-50 px-4 py-2 text-center text-xs text-slate-600 shadow-sm">
          <div className="flex items-center justify-center gap-2 font-black text-teal-800">
            <AppIcon name={getSystemIcon(message)} className="h-4 w-4" />
            <span>{message.titre || t('messaging.systemMessage')}</span>
          </div>
          {message.contenu && <p className="mt-1 text-slate-500">{message.contenu}</p>}
          {message.dateEnvoi && <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatTime(message.dateEnvoi, language)}</p>}
        </div>
      )}
    </div>
  )
}

function DateSeparator({ label }) {
  return (
    <div className="messaging-message my-2 flex justify-center">
      <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400 shadow-sm ring-1 ring-slate-100">
        {label}
      </span>
    </div>
  )
}

function getInitiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?'
}

function formatTime(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString(language || 'fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function formatMessageDay(dateStr, language, t) {
  if (!dateStr) return t('messaging.days.earlier')
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return t('messaging.days.earlier')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today)) return t('messaging.days.today')
  if (isSameDay(date, yesterday)) return t('messaging.days.yesterday')
  return date.toLocaleDateString(language || 'fr-BE', { day: '2-digit', month: 'short' })
}

function getGroupInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() || 'G'
}

function isSameAuthor(message, previous) {
  if (!previous) return false
  if (message.auteurId != null && previous.auteurId != null) {
    return Number(message.auteurId) === Number(previous.auteurId)
  }
  return `${message.auteurPrenom || ''}-${message.auteurNom || ''}` === `${previous.auteurPrenom || ''}-${previous.auteurNom || ''}`
}

function isSameMessageDay(message, previous) {
  if (!message || !previous) return false
  const current = new Date(message.dateEnvoi)
  const before = new Date(previous.dateEnvoi)
  if (Number.isNaN(current.getTime()) || Number.isNaN(before.getTime())) return false
  return isSameDay(current, before)
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function shouldShowAuthor(message, previous, currentUser) {
  const estMoi = message.auteurId != null && currentUser?.id != null && Number(message.auteurId) === Number(currentUser.id)
  if (estMoi) return false
  return !isSameAuthor(message, previous)
}

function isSystemMessage(message) {
  const type = String(message.type || message.typeMessage || message.categorie || '').toUpperCase()
  return Boolean(message.systeme || message.system || type.includes('SYSTEM'))
}

function getSystemIcon(message) {
  const type = String(message.type || message.typeMessage || message.categorie || message.titre || '').toUpperCase()
  if (type.includes('ACTIVITE') || type.includes('ACTIVITY')) return 'Calendar'
  if (type.includes('PROJET') || type.includes('PROJECT')) return 'Rocket'
  if (type.includes('MEMBRE') || type.includes('MEMBER')) return 'Users'
  if (type.includes('NOTIFICATION') || type.includes('ALERT')) return 'Bell'
  return 'Sparkles'
}

function countMessageAuthors(messages) {
  const authors = new Set()
  messages.forEach(message => {
    if (message.auteurId != null) {
      authors.add(`id-${message.auteurId}`)
    } else if (message.auteurPrenom || message.auteurNom) {
      authors.add(`${message.auteurPrenom || ''}-${message.auteurNom || ''}`)
    }
  })
  return authors.size
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy failed')
}
