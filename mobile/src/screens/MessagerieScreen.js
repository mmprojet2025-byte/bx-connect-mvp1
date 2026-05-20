import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function MessagerieScreen() {
  const { user } = useAuth();

  const [fils, setFils] = useState([]);
  const [filActif, setFilActif] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [showNouveauFil, setShowNouveauFil] = useState(false);
  const [formFil, setFormFil] = useState({ titre: '', type: 'GENERAL' });
  const [creating, setCreating] = useState(false);
  const [vue, setVue] = useState('liste'); // 'liste' ou 'conversation'

  const messagesEndRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchFils();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && Platform.OS === 'web') {
      messagesEndRef.current.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchFils = async () => {
    try {
      setError('');
      const res = await api.get('/messagerie/fils');
      setFils(res.data);
    } catch {
      setError('Impossible de charger les fils de discussion.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (filId) => {
    setLoadingMessages(true);
    setError('');
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`);
      setMessages(res.data);
    } catch {
      setError('Impossible de charger les messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectFil = (fil) => {
    setFilActif(fil);
    fetchMessages(fil.id);
    setVue('conversation');
  };

  const handleEnvoyer = async () => {
    if (!nouveauMessage.trim()) return;
    try {
      await api.post(`/messagerie/fils/${filActif.id}/messages`, {
        contenu: nouveauMessage.trim(),
      });
      setNouveauMessage('');
      fetchMessages(filActif.id);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi.");
    }
  };

  const handleCreerFil = async () => {
    if (!formFil.titre.trim()) return;
    setCreating(true);
    try {
      await api.post('/messagerie/fils', formFil);
      setShowNouveauFil(false);
      setFormFil({ titre: '', type: 'GENERAL' });
      fetchFils();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const typeBadge = (type) => ({
    ADMIN:     { bg: '#fef2f2', color: '#dc2626' },
    PROJET:    { bg: '#f0fdf4', color: '#16a34a' },
    EVENEMENT: { bg: '#fffbeb', color: '#d97706' },
    GENERAL:   { bg: '#eff6ff', color: '#2563eb' },
  }[type] || { bg: '#eff6ff', color: '#2563eb' });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitiales = (prenom, nom) =>
    ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';

  // ── Vue liste des fils ────────────────────────────────────────────────────
  if (vue === 'liste') {
    return (
      <View style={styles.container}>

        {/* Header liste */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>💬 Messagerie</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.btnNew}
              onPress={() => setShowNouveauFil(!showNouveauFil)}
            >
              <Text style={styles.btnNewText}>{showNouveauFil ? '✕' : '+'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Erreur */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Formulaire nouveau fil */}
        {showNouveauFil && isAdmin && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nouveau fil de discussion</Text>
            <TextInput
              style={styles.input}
              placeholder="Titre du fil..."
              placeholderTextColor="#94a3b8"
              value={formFil.titre}
              onChangeText={(val) => setFormFil({ ...formFil, titre: val })}
            />
            <View style={styles.typesRow}>
              {['GENERAL', 'PROJET', 'EVENEMENT', 'ADMIN'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, formFil.type === t && styles.typeBtnActive]}
                  onPress={() => setFormFil({ ...formFil, type: t })}
                >
                  <Text style={[styles.typeBtnText, formFil.type === t && styles.typeBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btnCreate, creating && styles.btnDisabled]}
              onPress={handleCreerFil}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnCreateText}>Créer le fil</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des fils */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1e3a5f" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : fils.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Aucun fil de discussion disponible.</Text>
          </View>
        ) : (
          <FlatList
            data={fils}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const badge = typeBadge(item.type);
              return (
                <TouchableOpacity
                  style={styles.filItem}
                  onPress={() => handleSelectFil(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.filItemLeft}>
                    <View style={styles.filAvatar}>
                      <Text style={styles.filAvatarText}>
                        {item.titre?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.filInfo}>
                      <Text style={styles.filTitre} numberOfLines={1}>{item.titre}</Text>
                      {item.dernierMessage && (
                        <Text style={styles.filDernierMsg} numberOfLines={1}>
                          {item.dernierMessage}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: badge.color }]}>
                      {item.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // ── Vue conversation ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header conversation */}
      <View style={styles.convHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setVue('liste')}
        >
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.convHeaderInfo}>
          <Text style={styles.convHeaderTitle} numberOfLines={1}>
            {filActif?.titre}
          </Text>
          <Text style={styles.convHeaderSub}>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Erreur */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      {loadingMessages ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>
                Aucun message. Soyez le premier à écrire !
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const estMoi = item.expediteurEmail === user?.email;
            return (
              <View style={[
                styles.messageRow,
                estMoi ? styles.messageRowRight : styles.messageRowLeft,
              ]}>
                {/* Avatar */}
                {!estMoi && (
                  <View style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarText}>
                      {getInitiales(item.expediteurPrenom, item.expediteurNom)}
                    </Text>
                  </View>
                )}

                <View style={styles.msgBubbleContainer}>
                  {!estMoi && (
                    <Text style={styles.msgSender}>
                      {item.expediteurPrenom} {item.expediteurNom}
                    </Text>
                  )}
                  <View style={[
                    styles.msgBubble,
                    estMoi ? styles.msgBubbleMoi : styles.msgBubbleAutre,
                  ]}>
                    <Text style={[
                      styles.msgText,
                      estMoi ? styles.msgTextMoi : styles.msgTextAutre,
                    ]}>
                      {item.contenu}
                    </Text>
                  </View>
                  <Text style={[
                    styles.msgTime,
                    estMoi ? styles.msgTimeRight : styles.msgTimeLeft,
                  ]}>
                    {formatDate(item.dateEnvoi)}
                  </Text>
                </View>

                {estMoi && (
                  <View style={[styles.msgAvatar, styles.msgAvatarMoi]}>
                    <Text style={styles.msgAvatarText}>
                      {getInitiales(user?.prenom, user?.nom)}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Zone de saisie */}
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
          style={[styles.sendBtn, !nouveauMessage.trim() && styles.sendBtnDisabled]}
          onPress={handleEnvoyer}
          disabled={!nouveauMessage.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  // Header liste
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  listHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  btnNew: {
    width: 36, height: 36, backgroundColor: '#1e3a5f',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  btnNewText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },

  // Erreur
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  // Formulaire nouveau fil
  formCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 10,
  },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  typeBtn: {
    borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6,
  },
  typeBtnActive: { borderColor: '#1e3a5f', backgroundColor: '#eff6ff' },
  typeBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  typeBtnTextActive: { color: '#1e3a5f', fontWeight: '700' },
  btnCreate: {
    backgroundColor: '#1e3a5f', paddingVertical: 11,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnCreateText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Liste des fils
  filsList: { padding: 8 },
  filItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  filItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  filAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1e3a5f', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  filAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  filInfo: { flex: 1 },
  filTitre: { fontSize: 15, fontWeight: '600', color: '#1e3a5f', marginBottom: 2 },
  filDernierMsg: { fontSize: 12, color: '#94a3b8' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },

  // Header conversation
  convHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#1e3a5f', borderBottomWidth: 1, borderBottomColor: '#2d4f7c',
  },
  backBtn: { marginRight: 12 },
  backBtnText: { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
  convHeaderInfo: { flex: 1 },
  convHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  convHeaderSub: { color: '#93c5fd', fontSize: 12, marginTop: 1 },

  // Messages
  messagesContent: { padding: 12, paddingBottom: 8 },
  messageRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },

  msgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#e2e8f0', alignItems: 'center',
    justifyContent: 'center', marginHorizontal: 6,
  },
  msgAvatarMoi: { backgroundColor: '#1e3a5f' },
  msgAvatarText: { fontSize: 11, fontWeight: 'bold', color: '#1e3a5f' },

  msgBubbleContainer: { maxWidth: '70%' },
  msgSender: { fontSize: 11, color: '#64748b', marginBottom: 3, paddingLeft: 4 },
  msgBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  msgBubbleMoi: {
    backgroundColor: '#1e3a5f',
    borderBottomRightRadius: 4,
  },
  msgBubbleAutre: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMoi: { color: '#fff' },
  msgTextAutre: { color: '#1e293b' },
  msgTime: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  msgTimeRight: { textAlign: 'right', paddingRight: 4 },
  msgTimeLeft: { paddingLeft: 4 },

  // Zone de saisie
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  messageInput: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', maxHeight: 100, marginRight: 8,
  },
  sendBtn: {
    width: 42, height: 42, backgroundColor: '#1e3a5f',
    borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  sendBtnText: { color: '#fff', fontSize: 16 },

  // États
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
});