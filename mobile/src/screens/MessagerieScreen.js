import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Platform, KeyboardAvoidingView,
  AccessibilityInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

export default function MessagerieScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, isMembre, isReferent, isAdmin, isSuperAdmin } = useAuth();

  const [groupes, setGroupes] = useState([]);
  const [groupeActif, setGroupeActif] = useState(null);
  const [filActif, setFilActif] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [messagesError, setMessagesError] = useState('');
  const [sendError, setSendError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const messagesListRef = useRef(null);

  useEffect(() => {
    initialiserMessagerie();
  }, [isMembre, isReferent, isAdmin, isSuperAdmin]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !loadingMessages && !messagesError) {
      requestAnimationFrame(() => {
        messagesListRef.current?.scrollToEnd({ animated: !reduceMotion });
      });
    }
  }, [messages.length, loadingMessages, messagesError, reduceMotion]);

  async function initialiserMessagerie(preserveDraft = false) {
    setLoading(true);
    setInitialError('');
    setMessagesError('');
    setSendError('');
    setEmptyMessage('');
    setGroupes([]);
    setGroupeActif(null);
    setFilActif(null);
    setMessages([]);
    if (!preserveDraft) setNouveauMessage('');

    if (isAdmin || isSuperAdmin) {
      setLoading(false);
      return;
    }

    if (isMembre) {
      await chargerMessagerieMembre();
      return;
    }

    if (isReferent) {
      await chargerGroupesReferent();
      return;
    }

    setEmptyMessage(t('messaging.groupReserved'));
    setLoading(false);
  }

  const chargerMessagerieMembre = async () => {
    let groupe;
    try {
      const groupeRes = await api.get('/messagerie/mon-groupe');
      groupe = groupeRes.data;
      setGroupeActif(groupe);
    } catch (err) {
      applyConversationLoadError(err, true);
      setLoading(false);
      return;
    }

    try {
      await chargerFilEtMessages(groupe);
    } catch (err) {
      applyConversationLoadError(err, false);
    } finally {
      setLoading(false);
    }
  };

  const chargerGroupesReferent = async () => {
    try {
      const res = await api.get('/referent/groupes');
      setGroupes(res.data);

      if (res.data.length === 0) {
        setEmptyMessage(t('messaging.noAssignedGroups'));
        return;
      }

      await selectionnerGroupe(res.data[0], false);
    } catch (err) {
      setInitialError(getAccessError(err, t, t('messaging.errorGroups')));
    } finally {
      setLoading(false);
    }
  };

  const selectionnerGroupe = async (groupe, showLoader = true) => {
    if (showLoader) {
      setLoadingMessages(true);
    }
    setGroupeActif(groupe);
    setFilActif(null);
    setMessages([]);
    setNouveauMessage('');
    setInitialError('');
    setMessagesError('');
    setSendError('');
    setEmptyMessage('');

    try {
      await chargerFilEtMessages(groupe);
    } catch (err) {
      applyConversationLoadError(err, false);
    } finally {
      if (showLoader) {
        setLoadingMessages(false);
      }
    }
  };

  const chargerFilEtMessages = async (groupe) => {
    const filRes = await api.get(`/messagerie/groupes/${groupe.id}/fil`);
    setFilActif(filRes.data);
    await chargerMessages(filRes.data.id);
  };

  const chargerMessages = async (filId) => {
    setLoadingMessages(true);
    setMessagesError('');
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`);
      setMessages(res.data);
      return true;
    } catch (err) {
      setMessages([]);
      setMessagesError(getAccessError(err, t, t('messaging.errorLoad')));
      return false;
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleEnvoyer = async () => {
    if (!nouveauMessage.trim() || !groupeActif || !filActif || sending) return;

    setSending(true);
    setSendError('');
    try {
      await api.post(`/messagerie/groupes/${groupeActif.id}/messages`, {
        contenu: nouveauMessage.trim(),
        filId: filActif.id,
      });
      setNouveauMessage('');
      const refreshed = await chargerMessages(filActif.id);
      if (refreshed) requestAnimationFrame(() => scrollToLatest());
    } catch (err) {
      setSendError(getAccessError(err, t, t('messaging.errorSend')));
    } finally {
      setSending(false);
    }
  };

  const applyConversationLoadError = (err, loadingMemberGroup) => {
    const status = err.response?.status;
    if (loadingMemberGroup && status === 403) {
      setEmptyMessage(t('messaging.noGroupPendingHint'));
      return;
    }
    if (!loadingMemberGroup && status === 404) {
      setEmptyMessage(t('messaging.threadNotCreated'));
      return;
    }
    setInitialError(getAccessError(
      err,
      t,
      loadingMemberGroup ? t('messaging.errorActiveGroup') : t('messaging.errorThread')
    ));
  };

  const scrollToLatest = () => {
    messagesListRef.current?.scrollToEnd({ animated: !reduceMotion });
  };

  if (isAdmin || isSuperAdmin) {
    return (
      <ForbiddenState
        title={t('messaging.unavailableTitle')}
        text={t('messaging.groupReserved')}
      />
    );
  }

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {isReferent ? (
        <TouchableOpacity
          style={styles.businessConversationsLink}
          onPress={() => navigation.getParent()?.navigate('TabBusinessConversations')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`${t('messaging.businessConversations')}. ${t('messaging.businessConversationsDescription')}`}
          accessibilityHint={t('messaging.businessConversationsHint')}
        >
          <View style={styles.businessConversationsIcon}>
            <AppIcon name="message" size={20} color="#1E3A8A" />
          </View>
          <View style={styles.businessConversationsText}>
            <Text style={styles.businessConversationsTitle}>{t('messaging.businessConversations')}</Text>
            <Text style={styles.businessConversationsDescription}>
              {t('messaging.businessConversationsDescription')}
            </Text>
          </View>
          <AppIcon name="chevron-forward" size={19} color="#64748B" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('messaging.groupMessaging')}</Text>
          <Text style={styles.headerSub}>
            {groupeActif?.nom || t('messaging.groupDiscussionReserved')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => initialiserMessagerie(true)}
          accessibilityRole="button"
          accessibilityLabel={t('messaging.refresh')}
          accessibilityHint={t('messaging.refreshHint')}
        >
          <AppIcon name="refresh" size={18} color="#2563EB" />
          <Text style={styles.refreshButtonText}>{t('messaging.refresh')}</Text>
        </TouchableOpacity>
      </View>

      {isReferent && groupes.length > 0 && (
        <GroupSelector
          groupes={groupes}
          groupeActif={groupeActif}
          onSelect={selectionnerGroupe}
          t={t}
        />
      )}

      {initialError ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={initialError}
          retryLabel={t('common.retry')}
          onRetry={() => initialiserMessagerie(true)}
        />
      ) : emptyMessage ? (
        <SharedEmptyState
          icon="message"
          illustrationSource={require('../assets/images/placeholders/messages.png')}
          title={t('messaging.threadUnavailable')}
          text={emptyMessage}
          actionLabel={t('common.retry')}
          onAction={initialiserMessagerie}
        />
      ) : !filActif ? (
        <SharedEmptyState
          icon="message"
          illustrationSource={require('../assets/images/placeholders/messages.png')}
          title={t('messaging.noThread')}
          text={t('messaging.threadNotCreated')}
          actionLabel={t('common.retry')}
          onAction={initialiserMessagerie}
        />
      ) : (
        <>
          <ConversationHeader fil={filActif} groupe={groupeActif} messagesCount={messages.length} t={t} />

          {loadingMessages ? (
            <View style={styles.messagesLoading}>
              <ActivityIndicator color="#1E3A8A" />
              <Text style={styles.loadingText}>{t('messaging.loadingMessages')}</Text>
            </View>
          ) : messagesError ? (
            <SharedErrorState
              title={t('messaging.messagesErrorTitle')}
              text={messagesError}
              retryLabel={t('common.retry')}
              onRetry={() => chargerMessages(filActif.id)}
            />
          ) : (
            <FlatList
              ref={messagesListRef}
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onContentSizeChange={scrollToLatest}
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Image
                    source={require('../../assets/illustrations/messages.png')}
                    style={styles.emptyMessagesIllustration}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>{t('messaging.noMessages')}</Text>
                </View>
              }
              renderItem={({ item }) => (
                <MessageBubble message={item} currentUser={user} language={i18n.language} />
              )}
            />
          )}

          {!loadingMessages && !messagesError ? (
            <View style={styles.composerCard}>
              {sendError ? (
                <View
                  style={styles.sendErrorBox}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  <AppIcon name="alert" size={18} color="#EF4444" />
                  <Text style={styles.sendErrorText}>{sendError}</Text>
                </View>
              ) : null}
              <TextInput
                style={styles.messageInput}
                placeholder={t('messaging.type_message')}
                placeholderTextColor="#94a3b8"
                value={nouveauMessage}
                onChangeText={(value) => {
                  setNouveauMessage(value);
                  if (sendError) setSendError('');
                }}
                multiline
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel={t('messaging.messageInputLabel')}
              />
              <View style={styles.composerFooter}>
                <Text style={styles.characterCount} accessibilityLiveRegion="polite">
                  {t('messaging.characterCount', { count: nouveauMessage.length, max: 500 })}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!nouveauMessage.trim() || sending) && styles.sendBtnDisabled,
                  ]}
                  onPress={handleEnvoyer}
                  disabled={!nouveauMessage.trim() || sending}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('messaging.sendMessage')}
                  accessibilityState={{ disabled: !nouveauMessage.trim() || sending, busy: sending }}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <AppIcon name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function GroupSelector({ groupes, groupeActif, onSelect, t }) {
  return (
    <View style={styles.groupSelector}>
      <FlatList
        data={groupes}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupSelectorContent}
        renderItem={({ item }) => {
          const actif = item.id === groupeActif?.id;
          return (
            <TouchableOpacity
              style={[styles.groupChip, actif && styles.groupChipActive]}
              onPress={() => onSelect(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={item.nom}
            >
              <Text style={[styles.groupChipTitle, actif && styles.groupChipTitleActive]}>
                {item.nom}
              </Text>
              <Text style={[styles.groupChipSub, actif && styles.groupChipSubActive]}>
                {t('groups.members_count', { count: item.nombreMembres ?? 0 })}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function ConversationHeader({ fil, groupe, messagesCount, t }) {
  return (
    <View style={styles.conversationHeader}>
      <View style={styles.filAvatar}>
        <Text style={styles.filAvatarText}>
          {groupe?.nom?.[0]?.toUpperCase() || fil?.titre?.[0]?.toUpperCase() || 'G'}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {fil?.titre || t('messaging.discussionForGroup', { group: groupe?.nom || t('groups.title') })}
        </Text>
        <Text style={styles.conversationSub}>
          {t('messaging.messagesCount', { count: messagesCount })}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({ message, currentUser, language }) {
  const estMoi =
    (message.auteurPrenom === currentUser?.prenom && message.auteurNom === currentUser?.nom) ||
    message.auteurId === currentUser?.id;

  return (
    <View style={[styles.messageRow, estMoi ? styles.messageRowRight : styles.messageRowLeft]}>
      {!estMoi && (
        <View style={styles.msgAvatar}>
          <Text style={styles.msgAvatarText}>
            {getInitiales(message.auteurPrenom, message.auteurNom)}
          </Text>
        </View>
      )}

      <View style={styles.msgBubbleContainer}>
        {!estMoi && (
          <Text style={styles.msgSender}>
            {message.auteurPrenom} {message.auteurNom}
          </Text>
        )}
        <View style={[styles.msgBubble, estMoi ? styles.msgBubbleMoi : styles.msgBubbleAutre]}>
          <Text style={[styles.msgText, estMoi ? styles.msgTextMoi : styles.msgTextAutre]}>
            {message.contenu}
          </Text>
        </View>
        <Text style={[styles.msgTime, estMoi ? styles.msgTimeRight : styles.msgTimeLeft]}>
          {formatDate(message.dateEnvoi, language)}
        </Text>
      </View>

      {estMoi && (
        <View style={[styles.msgAvatar, styles.msgAvatarMoi]}>
          <Text style={[styles.msgAvatarText, styles.msgAvatarTextMoi]}>
            {getInitiales(currentUser?.prenom, currentUser?.nom)}
          </Text>
        </View>
      )}
    </View>
  );
}

function ForbiddenState({ title, text }) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIconCircle}>
        <AppIcon name="lock" size={34} color="#38BDF8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function getAccessError(err, t, fallback) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('messaging.accessDenied');
  }
  return fallback;
}

function getInitiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';
}

function formatDate(dateStr, language) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString(language || 'fr-BE')} ${d.toLocaleTimeString(language || 'fr-BE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  businessConversationsLink: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  businessConversationsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#EFF6FF',
  },
  businessConversationsText: { flex: 1, paddingRight: 8 },
  businessConversationsTitle: { color: '#1E3A8A', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  businessConversationsDescription: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 2 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerText: { flex: 1, minWidth: 0, paddingRight: 8 },
  headerTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, lineHeight: 16, color: '#64748b', marginTop: 2 },
  refreshButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  refreshButtonText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },

  groupSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  groupSelectorContent: { paddingHorizontal: 10, paddingVertical: 5 },
  groupChip: {
    minWidth: 108,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  groupChipActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  groupChipTitle: { color: '#1E3A8A', fontSize: 12, fontWeight: '800', marginBottom: 1 },
  groupChipTitleActive: { color: '#fff' },
  groupChipSub: { color: '#64748b', fontSize: 10 },
  groupChipSubActive: { color: '#BAE6FD' },

  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  filAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filAvatarText: { color: '#1E3A8A', fontSize: 17, fontWeight: '800' },
  conversationInfo: { flex: 1 },
  conversationTitle: { color: '#111827', fontSize: 16, lineHeight: 21, fontWeight: '800' },
  conversationSub: { color: '#64748b', fontSize: 12, lineHeight: 16, marginTop: 2 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F8FAFC',
  },
  messagesLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 14 },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingHorizontal: 20 },
  emptyMessagesIllustration: { width: 150, height: 118, marginBottom: 8 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  messagesContent: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  msgAvatarMoi: { backgroundColor: '#1E3A8A' },
  msgAvatarText: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' },
  msgAvatarTextMoi: { color: '#FFFFFF' },
  msgBubbleContainer: { maxWidth: '82%', minWidth: 0 },
  msgSender: { fontSize: 12, lineHeight: 16, color: '#374151', fontWeight: '700', marginBottom: 4, marginLeft: 8 },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  msgBubbleMoi: { backgroundColor: '#1E3A8A', borderRadius: 18, borderBottomRightRadius: 5 },
  msgBubbleAutre: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#eef2f7' },
  msgText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  msgTextMoi: { color: '#fff' },
  msgTextAutre: { color: '#1e293b' },
  msgTime: { fontSize: 11, lineHeight: 15, color: '#64748b', marginTop: 4 },
  msgTimeRight: { textAlign: 'right', marginRight: 4 },
  msgTimeLeft: { marginLeft: 4 },

  composerCard: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sendErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  sendErrorText: { flex: 1, color: '#B91C1C', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  messageInput: {
    minHeight: 48,
    maxHeight: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  composerFooter: {
    minHeight: 48,
    marginTop: 6,
    paddingLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterCount: { color: '#64748B', fontSize: 12, lineHeight: 16 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
});
