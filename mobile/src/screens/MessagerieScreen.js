import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function MessagerieScreen() {
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

    setEmptyMessage('La messagerie groupe est réservée aux membres et référents.');
    setLoading(false);
  };

  const chargerMessagerieMembre = async () => {
    try {
      const groupeRes = await api.get('/messagerie/mon-groupe');
      setGroupeActif(groupeRes.data);
      await chargerFilEtMessages(groupeRes.data);
    } catch (err) {
      setEmptyMessage(getMemberEmptyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const chargerGroupesReferent = async () => {
    try {
      const res = await api.get('/referent/groupes');
      setGroupes(res.data);

      if (res.data.length === 0) {
        setEmptyMessage('Aucun groupe ne vous est assigné pour le moment.');
        return;
      }

      await selectionnerGroupe(res.data[0], false);
    } catch (err) {
      setError(getAccessError(err, 'Impossible de charger vos groupes.'));
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
      setEmptyMessage(getFilEmptyMessage(err));
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
      setError(getAccessError(err, 'Impossible de charger les messages.'));
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
      setError(getAccessError(err, "Erreur lors de l'envoi du message."));
    } finally {
      setSending(false);
    }
  };

  if (isAdmin || isSuperAdmin) {
    return (
      <ForbiddenState
        title="Messagerie indisponible"
        text="La messagerie groupe est réservée aux membres et référents."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={styles.loadingText}>Chargement de la messagerie...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messagerie de groupe</Text>
          <Text style={styles.headerSub}>
            {groupeActif?.nom || 'Discussion réservée à votre groupe'}
          </Text>
        </View>
        <TouchableOpacity style={styles.retrySmall} onPress={initialiserMessagerie}>
          <Text style={styles.retrySmallText}>Réessayer</Text>
        </TouchableOpacity>
      </View>

      {isReferent && groupes.length > 0 && (
        <GroupSelector
          groupes={groupes}
          groupeActif={groupeActif}
          onSelect={selectionnerGroupe}
        />
      )}

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {emptyMessage ? (
        <EmptyState
          title="Discussion indisponible"
          text={emptyMessage}
          onRetry={initialiserMessagerie}
        />
      ) : !filActif ? (
        <EmptyState
          title="Aucun fil de discussion"
          text="Le fil de discussion de ce groupe n'est pas encore créé."
          onRetry={initialiserMessagerie}
        />
      ) : (
        <>
          <ConversationHeader fil={filActif} groupe={groupeActif} messagesCount={messages.length} />

          {loadingMessages ? (
            <View style={styles.messagesLoading}>
              <ActivityIndicator color="#1e3a5f" />
              <Text style={styles.loadingText}>Chargement des messages...</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyText}>Aucun message dans ce groupe.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <MessageBubble message={item} currentUser={user} />
              )}
            />
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.messageInput}
              placeholder="Écrire un message..."
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
                <Text style={styles.sendBtnText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function GroupSelector({ groupes, groupeActif, onSelect }) {
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
                {item.nombreMembres ?? 0} membre{(item.nombreMembres ?? 0) > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function ConversationHeader({ fil, groupe, messagesCount }) {
  return (
    <View style={styles.conversationHeader}>
      <View style={styles.filAvatar}>
        <Text style={styles.filAvatarText}>
          {groupe?.nom?.[0]?.toUpperCase() || fil?.titre?.[0]?.toUpperCase() || 'G'}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {fil?.titre || `Discussion - ${groupe?.nom || 'Groupe'}`}
        </Text>
        <Text style={styles.conversationSub}>
          {messagesCount} message{messagesCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({ message, currentUser }) {
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
          {formatDate(message.dateEnvoi)}
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
      <Text style={styles.forbiddenIcon}>🔒</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, text, onRetry }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

function getMemberEmptyMessage(err) {
  if (err.response?.status === 403) {
    return "Vous n'avez pas encore de groupe actif. Si une demande est en attente, la messagerie sera disponible après acceptation.";
  }
  return getAccessError(err, 'Impossible de charger votre groupe actif.');
}

function getFilEmptyMessage(err) {
  if (err.response?.status === 403) {
    return 'Accès non autorisé à cette messagerie.';
  }
  return "Le fil de discussion de ce groupe n'est pas encore créé.";
}

function getAccessError(err, fallback) {
  if (err.response?.status === 401) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (err.response?.status === 403) {
    return 'Accès non autorisé à cette messagerie.';
  }
  return err.response?.data?.message || fallback;
}

function getInitiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('fr-BE')} ${d.toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 3 },
  retrySmall: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retrySmallText: { color: '#2563eb', fontSize: 12, fontWeight: '700' },

  groupSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupSelectorContent: { paddingHorizontal: 12, paddingVertical: 10 },
  groupChip: {
    minWidth: 130,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  groupChipActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  groupChipTitle: { color: '#1e3a5f', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  groupChipTitleActive: { color: '#fff' },
  groupChipSub: { color: '#64748b', fontSize: 11 },
  groupChipSubActive: { color: '#bfdbfe' },

  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filAvatarText: { color: '#1e3a5f', fontSize: 16, fontWeight: '900' },
  conversationInfo: { flex: 1 },
  conversationTitle: { color: '#1e3a5f', fontSize: 15, fontWeight: '800' },
  conversationSub: { color: '#64748b', fontSize: 12, marginTop: 2 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f0f4f8',
  },
  messagesLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 14 },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  forbiddenIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: {
    color: '#1e3a5f',
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
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  messagesContent: { padding: 14, paddingBottom: 18 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  msgAvatarMoi: { backgroundColor: '#1e3a5f' },
  msgAvatarText: { color: '#1e3a5f', fontSize: 11, fontWeight: '900' },
  msgBubbleContainer: { maxWidth: '74%' },
  msgSender: { fontSize: 11, color: '#64748b', marginBottom: 3, marginLeft: 4 },
  msgBubble: { paddingHorizontal: 13, paddingVertical: 9 },
  msgBubbleMoi: { backgroundColor: '#1e3a5f', borderRadius: 14, borderBottomRightRadius: 3 },
  msgBubbleAutre: { backgroundColor: '#fff', borderRadius: 14, borderBottomLeftRadius: 3 },
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
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    marginRight: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', paddingLeft: 2 },
});
