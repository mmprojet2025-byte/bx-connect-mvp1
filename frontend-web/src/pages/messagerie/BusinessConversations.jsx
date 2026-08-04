import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import businessConversationsApi from '../../api/businessConversations'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import LoadingState from '../../components/ui/LoadingState'
import AppIcon from '../../components/ui/AppIcons'
import StatusBadge from '../../components/StatusBadge'
import { userFriendlyError } from '../../utils/userFriendlyError'

const ADMIN_REFERENT = 'ADMIN_REFERENT'
const ADMIN_PARTENAIRE = 'ADMIN_PARTENAIRE'
const ARCHIVED = 'ARCHIVED'

async function loadConversations({ t, setConversations, setLoading, setError }) {
  try {
    setLoading(true)
    setError('')
    const response = await businessConversationsApi.list()
    setConversations(Array.isArray(response.data) ? response.data : [])
  } catch (err) {
    setError(userFriendlyError(err, t('businessConversations.errorLoad')))
  } finally {
    setLoading(false)
  }
}

async function loadActiveConversation({
  conversationId,
  t,
  setActiveConversation,
  setMessages,
  setConversations,
  setMessagesLoading,
  setMessagesError,
}) {
  try {
    setMessagesLoading(true)
    setMessagesError('')
    const [conversationResponse, messagesResponse] = await Promise.all([
      businessConversationsApi.get(conversationId),
      businessConversationsApi.getMessages(conversationId),
    ])
    setActiveConversation(conversationResponse.data)
    setMessages(Array.isArray(messagesResponse.data) ? messagesResponse.data : [])
    await businessConversationsApi.markAsRead(conversationId)
    setConversations(current => current.map(conversation => (
      conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
    )))
  } catch (err) {
    setMessagesError(userFriendlyError(err, t('businessConversations.errorMessages')))
  } finally {
    setMessagesLoading(false)
  }
}

async function loadRecipients({
  isSuperAdmin,
  t,
  setRecipients,
  setRecipientsLoading,
  setRecipientsError,
}) {
  try {
    setRecipientsLoading(true)
    setRecipientsError('')
    const endpoints = isSuperAdmin
      ? ['/super-admin/utilisateurs']
      : ['/admin/referents', '/admin/utilisateurs']

    const responses = await Promise.allSettled(endpoints.map(endpoint => api.get(endpoint)))
    const users = responses.flatMap(result => (
      result.status === 'fulfilled' && Array.isArray(result.value.data) ? result.value.data : []
    ))
    const uniqueUsers = deduplicateUsers(users)
      .filter(candidate => ['REFERENT', 'PARTENAIRE'].includes(candidate.role))
      .filter(candidate => candidate.actif !== false)

    setRecipients(uniqueUsers)
    if (responses.every(result => result.status === 'rejected')) {
      setRecipientsError(t('businessConversations.recipientUnavailable'))
    }
  } catch {
    setRecipientsError(t('businessConversations.recipientUnavailable'))
  } finally {
    setRecipientsLoading(false)
  }
}

export default function BusinessConversations({ mode = 'referent' }) {
  const { t, i18n } = useTranslation()
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const canCreate = mode === 'admin' && (isAdmin || isSuperAdmin)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState('')
  const [messagesError, setMessagesError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [recipients, setRecipients] = useState([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [recipientsError, setRecipientsError] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    type: ADMIN_REFERENT,
    destinataireId: '',
    titre: '',
    messageInitial: '',
  })

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => timestamp(b.lastMessageAt || b.updatedAt || b.createdAt) - timestamp(a.lastMessageAt || a.updatedAt || a.createdAt))
  }, [conversations])

  const filteredRecipients = useMemo(() => {
    const expectedRole = form.type === ADMIN_PARTENAIRE ? 'PARTENAIRE' : 'REFERENT'
    return recipients.filter(recipient => recipient.role === expectedRole)
  }, [form.type, recipients])

  const pageTitle = t(`businessConversations.${mode}Title`)
  const pageDescription = t(`businessConversations.${mode}Description`)

  useEffect(() => {
    loadConversations({ t, setConversations, setLoading, setError })
  }, [t])

  useEffect(() => {
    if (!canCreate) return
    loadRecipients({ isSuperAdmin, t, setRecipients, setRecipientsLoading, setRecipientsError })
  }, [canCreate, isSuperAdmin, t])

  useEffect(() => {
    if (!activeId) return
    loadActiveConversation({
      conversationId: activeId,
      t,
      setActiveConversation,
      setMessages,
      setConversations,
      setMessagesLoading,
      setMessagesError,
    })
  }, [activeId, t])

  useEffect(() => {
    if (sortedConversations.length === 0) {
      setActiveId(null)
      setActiveConversation(null)
      setMessages([])
      return
    }
    if (!activeId || !sortedConversations.some(conversation => conversation.id === activeId)) {
      setActiveId(sortedConversations[0].id)
    }
  }, [activeId, sortedConversations])

  const handleSendMessage = async (event) => {
    event.preventDefault()
    const contenu = draft.trim()
    if (!activeId || !contenu || activeConversation?.status === ARCHIVED) return

    try {
      setSending(true)
      setMessagesError('')
      await businessConversationsApi.sendMessage(activeId, contenu)
      setDraft('')
      await Promise.all([
        loadConversations({ t, setConversations, setLoading, setError }),
        loadActiveConversation({
          conversationId: activeId,
          t,
          setActiveConversation,
          setMessages,
          setConversations,
          setMessagesLoading,
          setMessagesError,
        }),
      ])
    } catch (err) {
      setMessagesError(userFriendlyError(err, t('businessConversations.errorSend')))
    } finally {
      setSending(false)
    }
  }

  const handleCreateConversation = async (event) => {
    event.preventDefault()
    if (!canCreate || !form.destinataireId) return

    const payload = {
      destinataireId: Number(form.destinataireId),
      titre: form.titre.trim() || null,
      messageInitial: form.messageInitial.trim() || null,
    }

    try {
      setCreating(true)
      setCreateError('')
      const response = form.type === ADMIN_PARTENAIRE
        ? await businessConversationsApi.createAdminPartenaire(payload)
        : await businessConversationsApi.createAdminReferent(payload)
      setForm({
        type: ADMIN_REFERENT,
        destinataireId: '',
        titre: '',
        messageInitial: '',
      })
      await loadConversations({ t, setConversations, setLoading, setError })
      setActiveId(response.data?.id || null)
    } catch (err) {
      setCreateError(userFriendlyError(err, t('businessConversations.createError')))
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow={t('businessConversations.eyebrow')}
          title={pageTitle}
          description={pageDescription}
        />

        {loading ? (
          <LoadingState label={t('businessConversations.loading')} />
        ) : error ? (
          <ErrorState
            title={t('businessConversations.errorTitle')}
            description={error}
            actionLabel={t('common.retry')}
            action={() => loadConversations({ t, setConversations, setLoading, setError })}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4">
              {canCreate && (
                <CreateConversationPanel
                  form={form}
                  setForm={setForm}
                  recipients={filteredRecipients}
                  loading={recipientsLoading}
                  error={recipientsError || createError}
                  creating={creating}
                  onSubmit={handleCreateConversation}
                  onReloadRecipients={() => loadRecipients({ isSuperAdmin, t, setRecipients, setRecipientsLoading, setRecipientsError })}
                />
              )}

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-black text-slate-950">{t('businessConversations.listTitle')}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {t('businessConversations.listCount', { count: sortedConversations.length })}
                  </p>
                </div>

                {sortedConversations.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon="Inbox"
                      title={t('businessConversations.emptyTitle')}
                      description={t(`businessConversations.emptyDescription.${mode}`)}
                    />
                  </div>
                ) : (
                  <div className="max-h-[680px] overflow-y-auto p-2">
                    {sortedConversations.map(conversation => (
                      <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        active={conversation.id === activeId}
                        onSelect={() => setActiveId(conversation.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </aside>

            <section className="min-h-[640px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {!activeId ? (
                <div className="flex h-full min-h-[640px] items-center justify-center p-6">
                  <EmptyState
                    icon="MessagesSquare"
                    title={t('businessConversations.selectTitle')}
                    description={t('businessConversations.selectDescription')}
                  />
                </div>
              ) : messagesLoading ? (
                <div className="p-6">
                  <LoadingState label={t('businessConversations.loadingMessages')} />
                </div>
              ) : (
                <ConversationThread
                  conversation={activeConversation}
                  messages={messages}
                  messagesError={messagesError}
                  draft={draft}
                  setDraft={setDraft}
                  sending={sending}
                  currentUserId={user?.id}
                  onSubmit={handleSendMessage}
                  locale={i18n.language}
                />
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

function CreateConversationPanel({
  form,
  setForm,
  recipients,
  loading,
  error,
  creating,
  onSubmit,
  onReloadRecipients,
}) {
  const { t } = useTranslation()

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <AppIcon name="MessageSquarePlus" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-950">{t('businessConversations.createTitle')}</h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            {t('businessConversations.createDescription')}
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase text-slate-500">{t('businessConversations.createType')}</span>
          <select
            value={form.type}
            onChange={event => setForm(current => ({ ...current, type: event.target.value, destinataireId: '' }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value={ADMIN_REFERENT}>{t('businessConversations.types.ADMIN_REFERENT')}</option>
            <option value={ADMIN_PARTENAIRE}>{t('businessConversations.types.ADMIN_PARTENAIRE')}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase text-slate-500">{t('businessConversations.createRecipient')}</span>
          <select
            value={form.destinataireId}
            onChange={event => setForm(current => ({ ...current, destinataireId: event.target.value }))}
            disabled={loading || recipients.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{loading ? t('businessConversations.recipientLoading') : t('businessConversations.chooseRecipient')}</option>
            {recipients.map(recipient => (
              <option key={recipient.id} value={recipient.id}>
                {displayUser(recipient)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase text-slate-500">{t('businessConversations.createOptionalTitle')}</span>
          <input
            value={form.titre}
            onChange={event => setForm(current => ({ ...current, titre: event.target.value }))}
            maxLength={160}
            placeholder={t('businessConversations.titlePlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase text-slate-500">{t('businessConversations.createInitialMessage')}</span>
          <textarea
            value={form.messageInitial}
            onChange={event => setForm(current => ({ ...current, messageInitial: event.target.value }))}
            maxLength={4000}
            rows={3}
            placeholder={t('businessConversations.initialMessagePlaceholder')}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error && (
          <p className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            {error}
          </p>
        )}

        {!loading && recipients.length === 0 && !error && (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            {t('businessConversations.recipientEmpty')}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={creating || loading || !form.destinataireId}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <AppIcon name="Plus" className="h-4 w-4" />
            {creating ? t('businessConversations.creating') : t('businessConversations.createSubmit')}
          </button>
          {error && (
            <button
              type="button"
              onClick={onReloadRecipients}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
              title={t('common.retry')}
              aria-label={t('common.retry')}
            >
              <AppIcon name="RefreshCw" className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

function ConversationListItem({ conversation, active, onSelect }) {
  const { t, i18n } = useTranslation()
  const unreadCount = Number(conversation.unreadCount || 0)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-blue-200 bg-blue-50 shadow-sm'
          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{conversationTitle(conversation, t)}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {t(`businessConversations.types.${conversation.type}`)}
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
        {conversation.lastMessagePreview || t('businessConversations.lastMessageFallback')}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400">
          {formatDate(conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt, i18n.language)}
        </span>
        {conversation.status === ARCHIVED && (
          <StatusBadge status="ARCHIVE">{t('businessConversations.status.ARCHIVED')}</StatusBadge>
        )}
      </div>
    </button>
  )
}

function ConversationThread({
  conversation,
  messages,
  messagesError,
  draft,
  setDraft,
  sending,
  currentUserId,
  onSubmit,
  locale,
}) {
  const { t } = useTranslation()
  const archived = conversation?.status === ARCHIVED

  if (!conversation) {
    return (
      <div className="flex h-full min-h-[640px] items-center justify-center p-6">
        <EmptyState
          icon="MessagesSquare"
          title={t('businessConversations.selectTitle')}
          description={t('businessConversations.selectDescription')}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[640px] flex-col">
      <header className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">{conversationTitle(conversation, t)}</h2>
              <StatusBadge status={archived ? 'ARCHIVE' : 'PUBLIEE'}>
                {archived ? t('businessConversations.status.ARCHIVED') : t('businessConversations.status.ACTIVE')}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {t(`businessConversations.types.${conversation.type}`)}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs font-black uppercase text-slate-400">{t('businessConversations.participants')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {participantsLabel(conversation.participants, t)}
            </p>
          </div>
        </div>
      </header>

      {messagesError && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
          {messagesError}
        </div>
      )}

      {archived && (
        <div className="border-b border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700">
          {t('businessConversations.archivedNotice')}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-5">
        {messages.length === 0 ? (
          <EmptyState
            icon="MessageCircle"
            title={t('businessConversations.noMessagesTitle')}
            description={t('businessConversations.noMessagesDescription')}
          />
        ) : (
          <div className="space-y-3">
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                own={String(message.auteurId) === String(currentUserId)}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>

      <form className="border-t border-slate-100 bg-white p-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="business-message-draft">
            {t('businessConversations.messageLabel')}
          </label>
          <textarea
            id="business-message-draft"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            disabled={archived || sending}
            maxLength={4000}
            rows={2}
            placeholder={archived ? t('businessConversations.archivedPlaceholder') : t('businessConversations.messagePlaceholder')}
            className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={archived || sending || !draft.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <AppIcon name="Send" className="h-4 w-4" />
            {sending ? t('businessConversations.sending') : t('businessConversations.send')}
          </button>
        </div>
      </form>
    </div>
  )
}

function MessageBubble({ message, own, locale }) {
  const { t } = useTranslation()

  return (
    <article className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[min(720px,85%)] rounded-2xl px-4 py-3 shadow-sm ${
        own
          ? 'bg-blue-700 text-white'
          : message.systemMessage
            ? 'border border-slate-200 bg-white text-slate-700'
            : 'bg-white text-slate-800'
      }`}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black">
          <span>{messageAuthor(message, t)}</span>
          <span className={own ? 'text-blue-100' : 'text-slate-400'}>{formatDateTime(message.createdAt, locale)}</span>
        </div>
        <p className={`whitespace-pre-wrap text-sm leading-relaxed ${own ? 'text-white' : 'text-slate-700'}`}>
          {message.contenu}
        </p>
      </div>
    </article>
  )
}

function conversationTitle(conversation, t) {
  return conversation?.titre || t(`businessConversations.types.${conversation?.type || ADMIN_REFERENT}`)
}

function participantsLabel(participants = [], t) {
  if (!participants.length) return t('businessConversations.participantsUnknown')
  return participants.map(participant => displayUser(participant, t)).join(', ')
}

function messageAuthor(message, t) {
  const name = `${message.auteurPrenom || ''} ${message.auteurNom || ''}`.trim()
  return name || t(`roles.${message.auteurRole}`, { defaultValue: t('businessConversations.participantsUnknown') })
}

function displayUser(user, t) {
  const name = `${user?.prenom || ''} ${user?.nom || ''}`.trim()
  const role = t ? t(`roles.${user?.role}`, { defaultValue: user?.role || '' }) : user?.role
  if (name && user?.email) return `${name} · ${user.email}`
  if (name) return role ? `${name} · ${role}` : name
  return user?.email || role || ''
}

function formatDate(value, locale) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale || 'fr-BE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value, locale) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale || 'fr-BE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function timestamp(value) {
  return value ? new Date(value).getTime() : 0
}

function deduplicateUsers(users) {
  const byId = new Map()
  users.forEach(user => {
    if (user?.id && !byId.has(user.id)) byId.set(user.id, user)
  })
  return Array.from(byId.values())
}
