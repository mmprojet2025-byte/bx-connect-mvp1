import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';

const TYPES = ['ANIMATION', 'LOGISTIQUE', 'COMMUNICATION', 'FORMATION', 'AUTRE'];

export default function PrestationsMobileScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, isReferent, isAdmin } = useAuth();
  const [prestations, setPrestations] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [onglet, setOnglet] = useState('mes'); // 'mes' ou 'valider'
  const [form, setForm] = useState({
    titre: '', type: 'ANIMATION', datePrestation: '',
    dureeHeures: '', description: '', groupeId: null
  });

  const peutValider = isReferent || isAdmin;

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrestations();
      fetchMesGroupes();
    } else {
      setLoading(false);
    }
  }, [onglet]);

  const fetchPrestations = async () => {
    setLoading(true);
    try {
      setError('');
      if (onglet === 'mes') {
        const res = await api.get('/prestations/mes-prestations');
        setPrestations(res.data);
      } else if (peutValider && mesGroupes.length > 0) {
        const res = await api.get(`/prestations/groupe/${mesGroupes[0].id}`);
        setPrestations(res.data);
      }
    } catch {
      setError(t('prestations.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMesGroupes = async () => {
    try {
      const res = await api.get('/groupes/mes-groupes');
      setMesGroupes(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, groupeId: res.data[0].id }));
    } catch {}
  };

  const handleEncoder = async () => {
    if (!form.titre || !form.datePrestation || !form.dureeHeures) {
      setError(t('prestations.requiredFields'));
      return;
    }
    try {
      setError('');
      await api.post('/prestations', {
        ...form,
        dureeHeures: parseFloat(form.dureeHeures),
        groupeId: form.groupeId,
      });
      setMessage(t('prestations.created'));
      setShowForm(false);
      fetchPrestations();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setError(t('errors.generic'));
    }
  };

  const handleValider = async (id) => {
    try {
      await api.patch(`/prestations/${id}/valider`, { commentaire: t('prestations.approvedComment') });
      setMessage(t('prestations.approved'));
      fetchPrestations();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('prestations.approveError')); }
  };

  const handleRefuser = async (id) => {
    try {
      await api.patch(`/prestations/${id}/refuser`, { commentaire: t('prestations.rejectedComment') });
      setMessage(t('prestations.rejected'));
      fetchPrestations();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(t('prestations.rejectError')); }
  };

  const statutColor = (s) => ({
    VALIDEE:    { bg: '#dcfce7', color: '#22C55E' },
    REFUSEE:    { bg: '#fef2f2', color: '#EF4444' },
    EN_ATTENTE: { bg: '#fef9c3', color: '#d97706' },
  }[s] || { bg: '#f1f5f9', color: '#64748b' });

  const totalHeures = prestations
    .filter(p => p.statut === 'VALIDEE')
    .reduce((sum, p) => sum + (p.dureeHeures || 0), 0);

  const renderPrestation = ({ item }) => {
    const sc = statutColor(item.statut);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.titre}</Text>
            <Text style={styles.cardMeta}>
              {item.datePrestation} · {item.dureeHeures} h · {item.type}
            </Text>
            {onglet === 'valider' && item.membrePrenom && (
              <Text style={styles.cardMeta}>{item.membrePrenom} {item.membreNom}</Text>
            )}
          </View>
          <View style={[styles.statutBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statutText, { color: sc.color }]}>{item.statut}</Text>
          </View>
        </View>
        {item.commentaire && (
          <Text style={styles.commentaire}>{item.commentaire}</Text>
        )}
        {onglet === 'valider' && item.statut === 'EN_ATTENTE' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnValider} onPress={() => handleValider(item.id)}>
              <AppIcon name="check" size={15} color="#22C55E" />
              <Text style={styles.btnValiderText}>{t('prestations.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnRefuser} onPress={() => handleRefuser(item.id)}>
              <AppIcon name="close" size={15} color="#EF4444" />
              <Text style={styles.btnRefuserText}>{t('prestations.reject')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}>
          <AppIcon name="lock" size={32} color="#38BDF8" />
        </View>
        <Text style={styles.emptyText}>{t('prestations.loginRequired')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('prestations.volunteeringTitle')}</Text>
          <Text style={styles.headerSub}>{t('prestations.totalApproved', { hours: totalHeures.toFixed(1) })}</Text>
        </View>
        <TouchableOpacity style={styles.btnNew} onPress={() => setShowForm(true)}>
          <Text style={styles.btnNewText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      {peutValider && (
        <View style={styles.onglets}>
          {[
            { id: 'mes',    label: t('prestations.myServices') },
            { id: 'valider', label: t('prestations.toApprove') },
          ].map(o => (
            <TouchableOpacity key={o.id} style={[styles.onglet, onglet === o.id && styles.ongletActive]}
              onPress={() => setOnglet(o.id)}>
              <Text style={[styles.ongletText, onglet === o.id && styles.ongletTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      {message !== '' && (
        <View style={styles.successBox}><Text style={styles.successText}>{message}</Text></View>
      )}
      {error !== '' && (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : prestations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyText}>{t('prestations.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={prestations}
          keyExtractor={item => item.id.toString()}
          renderItem={renderPrestation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchPrestations}
          refreshing={false}
        />
      )}

      {/* Modal formulaire */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('prestations.encodeTitle')}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <AppIcon name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('prestations.titleRequired')}</Text>
              <TextInput style={styles.input} value={form.titre}
                onChangeText={v => setForm({...form, titre: v})} placeholder={t('prestations.titlePlaceholder')}
                placeholderTextColor="#94a3b8" />

              <Text style={styles.label}>{t('prestations.typeRequired')}</Text>
              <View style={styles.typesRow}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                    onPress={() => setForm({...form, type: t})}>
                    <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('prestations.dateRequired')}</Text>
              <TextInput style={styles.input} value={form.datePrestation}
                onChangeText={v => setForm({...form, datePrestation: v})}
                placeholder={t('prestations.datePlaceholder')} placeholderTextColor="#94a3b8" />

              <Text style={styles.label}>{t('prestations.durationRequired')}</Text>
              <TextInput style={styles.input} value={form.dureeHeures}
                onChangeText={v => setForm({...form, dureeHeures: v})}
                keyboardType="numeric" placeholder={t('prestations.durationPlaceholder')} placeholderTextColor="#94a3b8" />

              <Text style={styles.label}>{t('common.description')}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.description} onChangeText={v => setForm({...form, description: v})}
                multiline placeholder={t('prestations.descriptionPlaceholder')} placeholderTextColor="#94a3b8" />

              <TouchableOpacity style={styles.btnCreate} onPress={handleEncoder}>
                <Text style={styles.btnCreateText}>{t('prestations.encodeButton')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E3A8A' },
  headerSub: { fontSize: 12, color: '#22C55E', marginTop: 2 },
  btnNew: {
    width: 36, height: 36, backgroundColor: '#1E3A8A',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  btnNewText: { color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  onglets: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  onglet: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  ongletActive: { borderBottomWidth: 2, borderBottomColor: '#1E3A8A' },
  ongletText: { fontSize: 13, color: '#64748b' },
  ongletTextActive: { color: '#1E3A8A', fontWeight: '700' },
  successBox: {
    backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#22C55E',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#EF4444',
    marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statutText: { fontSize: 10, fontWeight: '600' },
  commentaire: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  btnValider: {
    flex: 1, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  btnValiderText: { color: '#22C55E', fontWeight: '600', fontSize: 12 },
  btnRefuser: {
    flex: 1, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  btnRefuserText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E3A8A' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 14,
  },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  typeBtn: {
    borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6,
  },
  typeBtnActive: { borderColor: '#1E3A8A', backgroundColor: '#F0F9FF' },
  typeBtnText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  typeBtnTextActive: { color: '#1E3A8A', fontWeight: '700' },
  btnCreate: {
    backgroundColor: '#1E3A8A', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  btnCreateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
