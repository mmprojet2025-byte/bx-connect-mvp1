import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import businessConversationsApi from '../api/businessConversations';
import AppIcon from '../components/AppIcon';
import {
  Avatar,
  Badge,
  COLORS,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/MobileUI';

const ARCHIVED = 'ARCHIVED';

export default function BusinessConversationsScreen({ route }) {
  const { t, i18n } = useTranslation();
  const { user, isMembre } = useAuth();
  const initialConversationId = route?.params?.conversationId;
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [threadError, setThreadError] = useState('');

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => timestamp(b.lastMessageAt || b.updatedAt || b.createdAt) - timestamp(a.lastMessageAt || a.updatedAt || a.createdAt));
  }, [conversations]);

  const openConversation = useCallback(async (conversation) => {
    if (!conversation?.id) return;
    setActiveConversation(conversation);
    setMessages([]);
    setDraft('');
    setLoadingMessages(true);
    setThreadError('');
    try {
      const [detailResponse, messagesResponse] = await Promise.all([
        businessConversationsApi.get(conversation.id),
        businessConversationsApi.getMessages(conversation.id),
      ]);
      setActiveConversation(detailResponse.data);
      setMessages(Array.isArray(messagesResponse.data) ? messagesResponse.data : []);
      await businessConversationsApi.markAsRead(conversation.id);
      setConversations(current => current.map(item => (
        item.id === conversation.id ? { ...item, unreadCount: 0 } : item
      )));
    } catch (err) {
      setMessages([]);
      setThreadError(getApiError(err, t, t('businessConversations.errorMessages')));
    } finally {
      setLoadingMessages(false);
    }
  }, [t]);

  const loadConversations = useCallback(async (preferredId) => {
    setLoading(true);
    setError('');
    setThreadError('');
    try {
      const response = await businessConversationsApi.list();
      const list = Array.isArray(response.data) ? response.data : [];
      setConversations(list);
      const preferred = preferredId
        ? list.find(conversation => String(conversation.id) === String(preferredId))
        : null;
      if (preferred) {
        await openConversation(preferred);
      }
    } catch (err) {
      setConversations([]);
      setError(getApiError(err, t, t('businessConversations.errorLoad')));
    } finally {
      setLoading(false);
    }
  }, [openConversation, t]);

  useEffect(() => {
    loadConversations(initialConversationId);
  }, [initialConversationId, loadConversations]);

  const handleSend = async () => {
    const contenu = draft.trim();
    if (!contenu || !activeConversation?.id || activeConversation.status === ARCHIVED || sending) return;

    setSending(true);
    setThreadError('');
    try {
      await businessConversationsApi.sendMessage(activeConversation.id, contenu);
      setDraft('');
      await openConversation(activeConversation);
      refreshConversationList();
    } catch (err) {
      setThreadError(getApiError(err, t, t('businessConversations.errorSend')));
    } finally {
      setSending(false);
    }
  };

  const refreshConversationList = async () => {
    try {
      const response = await businessConversationsApi.list();
      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch {
      // Le fil actif reste lisible si le rafraichissement de la liste echoue.
    }
  };

  if (isMembre) {
    return (
      <EmptyState
        icon="lock"
        title={t('businessConversations.unavailableTitle')}
        text={t('businessConversations.memberDenied')}
      />
    );
  }

  if (loading) {
    return <LoadingState label={t('businessConversations.loading')} />;
  }

  if (error) {
    return (
      <ErrorState
        title={t('common.loadErrorTitle')}
        text={error}
        retryLabel={t('common.retry')}
        onRetry={() => loadConversations(initialConversationId)}
      />
    );
  }

  if (activeConversation) {
    return (
      <ConversationThread
        conversation={activeConversation}
        messages={messages}
        loadingMessages={loadingMessages}
        error={threadError}
        draft={draft}
        setDraft={setDraft}
        sending={sending}
        onBack={() => {
          setActiveConversation(null);
          setMessages([]);
          setThreadError('');
          setDraft('');
        }}
        onSend={handleSend}
        currentUser={user}
        language={i18n.language}
        t={t}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('businessConversations.title')}</Text>
          <Text style={styles.headerSub}>{t('businessConversations.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadConversations(initialConversationId)}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <AppIcon name="refresh" size={18} color={COLORS.bxBlueLight} />
        </TouchableOpacity>
      </View>

      {sortedConversations.length === 0 ? (
        <EmptyState
          icon="message"
          title={t('businessConversations.emptyTitle')}
          text={t('businessConversations.emptyText')}
          actionLabel={t('common.retry')}
          onAction={() => loadConversations(initialConversationId)}
        />
      ) : (
        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => loadConversations(initialConversationId)}
          refreshing={false}
          renderItem={({ item }) => (
            <ConversationCard
              conversation={item}
              onPress={() => openConversation(item)}
              language={i18n.language}
              t={t}
            />
          )}
        />
      )}
    </View>
  );
}

function ConversationCard({ conversation, onPress, language, t }) {
  const unread = Number(conversation.unreadCount || 0);
  const archived = conversation.status === ARCHIVED;
  const title = conversation.titre || t(`businessConversations.types.${conversation.type}`);

  return (
    <TouchableOpacity style={styles.conversationCard} onPress={onPress} activeOpacity={0.84}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.cardType} numberOfLines={1}>{t(`businessConversations.types.${conversation.type}`)}</Text>
        </View>
        {unread > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.preview} numberOfLines={2}>
        {conversation.lastMessagePreview || t('businessConversations.noPreview')}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.dateText}>{formatDate(conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt, language)}</Text>
        {archived ? (
          <Badge label={t('businessConversations.status.ARCHIVED')} color={COLORS.muted} soft />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ConversationThread({
  conversation,
  messages,
  loadingMessages,
  error,
  draft,
  setDraft,
  sending,
  onBack,
  onSend,
  currentUser,
  language,
  t,
}) {
  const archived = conversation.status === ARCHIVED;
  const title = conversation.titre || t(`businessConversations.types.${conversation.type}`);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.threadHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button">
          <AppIcon name="chevron-back" size={22} color={COLORS.bxBlue} />
        </TouchableOpacity>
        <View style={styles.threadTitleBlock}>
          <Text style={styles.threadTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.threadSub} numberOfLines={1}>{participantsLabel(conversation.participants, t)}</Text>
        </View>
        {archived ? <Badge label={t('businessConversations.status.ARCHIVED')} color={COLORS.muted} soft /> : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {archived ? (
        <View style={styles.archivedBox}>
          <Text style={styles.archivedText}>{t('businessConversations.archivedNotice')}</Text>
        </View>
      ) : null}

      {loadingMessages ? (
        <View style={styles.messagesLoading}>
          <ActivityIndicator color={COLORS.bxBlueLight} />
          <Text style={styles.loadingText}>{t('businessConversations.loadingMessages')}</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <AppIcon name="message" size={34} color={COLORS.info} />
              <Text style={styles.emptyMessagesText}>{t('businessConversations.noMessages')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} currentUser={currentUser} language={language} t={t} />
          )}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.messageInput}
          placeholder={archived ? t('businessConversations.archivedPlaceholder') : t('businessConversations.messagePlaceholder')}
          placeholderTextColor="#94a3b8"
          value={draft}
          onChangeText={setDraft}
          editable={!archived && !sending}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!draft.trim() || archived || sending) && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!draft.trim() || archived || sending}
          activeOpacity={0.82}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <AppIcon name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, currentUser, language, t }) {
  const own = isCurrentUserMessage(message, currentUser);

  return (
    <View style={[styles.messageRow, own ? styles.messageRowRight : styles.messageRowLeft]}>
      {!own ? (
        <Avatar prenom={message.auteurPrenom} nom={message.auteurNom} size={34} color={COLORS.info} />
      ) : null}
      <View style={styles.messageColumn}>
        {!own ? (
          <Text style={styles.senderName}>{messageAuthor(message, t)}</Text>
        ) : null}
        <View style={[styles.messageBubble, own ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, own ? styles.messageTextOwn : styles.messageTextOther]}>
            {message.contenu}
          </Text>
        </View>
        <Text style={[styles.messageTime, own ? styles.messageTimeRight : styles.messageTimeLeft]}>
          {formatDateTime(message.createdAt, language)}
        </Text>
      </View>
      {own ? (
        <Avatar prenom={currentUser?.prenom} nom={currentUser?.nom} size={34} color={COLORS.bxBlue} />
      ) : null}
    </View>
  );
}

function participantsLabel(participants = [], t) {
  if (!participants.length) return t('businessConversations.participant');
  return participants.map(participant => displayUser(participant, t)).join(' · ');
}

function displayUser(user, t) {
  const name = `${user?.prenom || ''} ${user?.nom || ''}`.trim();
  const role = t(`roles.${user?.role}`, { defaultValue: user?.role || '' });
  return name || role || t('businessConversations.participant');
}

function messageAuthor(message, t) {
  const name = `${message.auteurPrenom || ''} ${message.auteurNom || ''}`.trim();
  return name || t(`roles.${message.auteurRole}`, { defaultValue: t('businessConversations.participant') });
}

function isCurrentUserMessage(message, user) {
  if (message.auteurId && user?.id) return String(message.auteurId) === String(user.id);
  const sameName = message.auteurPrenom === user?.prenom && message.auteurNom === user?.nom;
  return sameName && message.auteurRole === user?.role;
}

function formatDate(value, language) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value, language) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(language || 'fr-BE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timestamp(value) {
  return value ? new Date(value).getTime() : 0;
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) return t('errors.session_expired');
  if (err.response?.status === 403) return t('errors.forbidden');
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.page },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  headerText: { flex: 1, paddingRight: 12 },
  headerTitle: { color: COLORS.text, fontSize: 18, lineHeight: 23, fontWeight: '800' },
  headerSub: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softBlue,
  },
  listContent: { padding: 12, paddingBottom: 28 },
  conversationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  cardType: { color: COLORS.muted, fontSize: 12, lineHeight: 16, marginTop: 2, fontWeight: '600' },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bxBlueLight,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  preview: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 10 },
  cardBottom: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softBlue,
  },
  threadTitleBlock: { flex: 1 },
  threadTitle: { color: COLORS.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  threadSub: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  errorBox: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  archivedBox: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.softYellow,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  archivedText: { color: '#92400E', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  messagesLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginTop: 8 },
  messagesContent: { padding: 12, paddingBottom: 16, flexGrow: 1 },
  emptyMessages: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyMessagesText: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginTop: 10 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 8 },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageColumn: { maxWidth: '76%' },
  senderName: { color: COLORS.muted, fontSize: 11, lineHeight: 15, fontWeight: '800', marginBottom: 3 },
  messageBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  messageBubbleOwn: { backgroundColor: COLORS.bxBlueLight, borderBottomRightRadius: 5 },
  messageBubbleOther: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: COLORS.borderSoft },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextOwn: { color: '#fff' },
  messageTextOther: { color: COLORS.text },
  messageTime: { fontSize: 10, color: '#94A3B8', marginTop: 3 },
  messageTimeRight: { textAlign: 'right' },
  messageTimeLeft: { textAlign: 'left' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 112,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    lineHeight: 19,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bxBlueLight,
  },
  sendButtonDisabled: { backgroundColor: '#CBD5E1' },
});
