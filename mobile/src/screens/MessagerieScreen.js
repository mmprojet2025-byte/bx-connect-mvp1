import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Platform, KeyboardAvoidingView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { EmptyState as SharedEmptyState, LoadingState } from '../components/MobileUI';

export default function MessagerieScreen() {
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
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');

  useEffect(() => {
    initialiserMessagerie();
  }, [isMembre, isReferent, isAdmin, isSuperAdmin]);

  const initialiserMessagerie = async () => {
    setLoading(true);
    setError('');
    setEmptyMessage('');
    setGroupes([]);
    setGroupeActif(null);
    setFilActif(null);
    setMessages([]);
    setNouveauMessage('');

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
  };

  const chargerMessagerieMembre = async () => {
    try {
      const groupeRes = await api.get('/messagerie/mon-groupe');
      setGroupeActif(groupeRes.data);
      await chargerFilEtMessages(groupeRes.data);
    } catch (err) {
      setEmptyMessage(getMemberEmptyMessage(err, t));
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
      setError(getAccessError(err, t, t('messaging.errorGroups')));
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
    setError('');
    setEmptyMessage('');

    try {
      await chargerFilEtMessages(groupe);
    } catch (err) {
      setEmptyMessage(getFilEmptyMessage(err, t));
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
    setError('');
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`);
      setMessages(res.data);
    } catch (err) {
      setMessages([]);
      setError(getAccessError(err, t, t('messaging.errorLoad')));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleEnvoyer = async () => {
    if (!nouveauMessage.trim() || !groupeActif || !filActif || sending) return;

    setSending(true);
    setError('');
    try {
      await api.post(`/messagerie/groupes/${groupeActif.id}/messages`, {
        contenu: nouveauMessage.trim(),
        filId: filActif.id,
      });
      setNouveauMessage('');
      await chargerMessages(filActif.id);
    } catch (err) {
      setError(getAccessError(err, t, t('messaging.errorSend')));
    } finally {
      setSending(false);
    }
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('messaging.groupMessaging')}</Text>
          <Text style={styles.headerSub}>
            {groupeActif?.nom || t('messaging.groupDiscussionReserved')}
          </Text>
        </View>
        <TouchableOpacity style={styles.retrySmall} onPress={initialiserMessagerie}>
          <Text style={styles.retrySmallText}>{t('common.retry')}</Text>
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

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {emptyMessage ? (
        <SharedEmptyState
          icon="message"
          illustrationSource={require('../../assets/illustrations/messages.png')}
          title={t('messaging.threadUnavailable')}
          text={emptyMessage}
          actionLabel={t('common.retry')}
          onAction={initialiserMessagerie}
        />
      ) : !filActif ? (
        <SharedEmptyState
          icon="message"
          illustrationSource={require('../../assets/illustrations/messages.png')}
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
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
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

          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              placeholder={t('messaging.type_message')}
              placeholderTextColor="#94a3b8"
              value={nouveauMessage}
              onChangeText={setNouveauMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!nouveauMessage.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleEnvoyer}
              disabled={!nouveauMessage.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <AppIcon name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
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
          <Text style={styles.msgAvatarText}>
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

function getMemberEmptyMessage(err, t) {
  if (err.response?.status === 403) {
    return t('messaging.noGroupPendingHint');
  }
  return getAccessError(err, t, t('messaging.errorActiveGroup'));
}

function getFilEmptyMessage(err, t) {
  if (err.response?.status === 403) {
    return t('messaging.accessDenied');
  }
  return t('messaging.threadNotCreated');
}

function getAccessError(err, t, fallback) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('messaging.accessDenied');
  }
  return err.response?.data?.message || fallback;
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1E3A8A' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 3 },
  retrySmall: {
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retrySmallText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  groupSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  groupSelectorContent: { paddingHorizontal: 14, paddingVertical: 10 },
  groupChip: {
    minWidth: 130,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  groupChipActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  groupChipTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  groupChipTitleActive: { color: '#fff' },
  groupChipSub: { color: '#64748b', fontSize: 11 },
  groupChipSubActive: { color: '#BAE6FD' },

  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  filAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filAvatarText: { color: '#1E3A8A', fontSize: 16, fontWeight: '900' },
  conversationInfo: { flex: 1 },
  conversationTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900' },
  conversationSub: { color: '#64748b', fontSize: 12, marginTop: 2 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

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

  messagesContent: { flexGrow: 1, padding: 14, paddingBottom: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  msgAvatarMoi: { backgroundColor: '#1E3A8A' },
  msgAvatarText: { color: '#1E3A8A', fontSize: 11, fontWeight: '900' },
  msgBubbleContainer: { maxWidth: '74%' },
  msgSender: { fontSize: 11, color: '#64748b', marginBottom: 3, marginLeft: 4 },
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
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMoi: { color: '#fff' },
  msgTextAutre: { color: '#1e293b' },
  msgTime: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  msgTimeRight: { textAlign: 'right', marginRight: 4 },
  msgTimeLeft: { marginLeft: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
});
