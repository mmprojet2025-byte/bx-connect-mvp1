import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
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

export default function GroupesScreen() {
  const { t } = useTranslation();
  const {
    isAuthenticated,
    isMembre,
    isReferent,
    isAdmin,
    isSuperAdmin,
  } = useAuth();

  const [groupes, setGroupes] = useState([]);
  const [adhesions, setAdhesions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerGroupes();
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin]);

  const chargerGroupes = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      if (isAdmin) {
        const res = await api.get('/admin/groupes');
        setGroupes(res.data);
        setAdhesions([]);
      } else if (isReferent) {
        const res = await api.get('/referent/groupes');
        setGroupes(res.data);
        setAdhesions([]);
      } else {
        let groupesData = [];
        try {
          const groupesRes = await api.get('/groupes');
          groupesData = groupesRes.data || [];
        } catch (err) {
          if (!isMembre || err.response?.status !== 403) throw err;

          try {
            const groupesMembreRes = await api.get('/groupes/mes-groupes');
            groupesData = groupesMembreRes.data || [];
          } catch (fallbackError) {
            throw fallbackError;
          }
        }
        setGroupes(groupesData);

        if (isMembre) {
          try {
            const adhesionsRes = await api.get('/groupes/mes-adhesions');
            setAdhesions(adhesionsRes.data || []);
          } catch {
            setAdhesions([]);
          }
        } else {
          setAdhesions([]);
        }
      }
    } catch (err) {
      if (isMembre && err.response?.status === 403) {
        setGroupes([]);
        setAdhesions([]);
        setError('');
      } else {
        setError(getApiError(err, t, t('groups.error_load')));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRejoindre = async (groupeId) => {
    if (!isMembre || hasActiveOrPendingAdhesion) return;

    setActionLoadingId(groupeId);
    setError('');
    setMessage('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      setMessage(t('groups.request_sent_pending'));
      await chargerGroupes();
    } catch (err) {
      setError(getApiError(err, t, t('groups.error_join_request')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuitter = async (groupeId) => {
    if (!isMembre) return;

    Alert.alert(
      t('groups.leave_btn'),
      t('groups.confirm_leave'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.leave_btn'),
          style: 'destructive',
          onPress: () => quitterGroupe(groupeId),
        },
      ],
    );
  };

  const quitterGroupe = async (groupeId) => {
    setActionLoadingId(groupeId);
    setError('');
    setMessage('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      setMessage(t('groups.success_leave'));
      await chargerGroupes();
    } catch (err) {
      setError(getApiError(err, t, t('groups.error_leave')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const adhesionAcceptee = adhesions.find((adhesion) => adhesion.statut === 'ACCEPTE') || null;
  const adhesionEnAttente = adhesions.find((adhesion) => adhesion.statut === 'EN_ATTENTE') || null;
  const hasActiveOrPendingAdhesion = !!adhesionAcceptee || !!adhesionEnAttente;

  const groupesFiltres = groupes.filter((groupe) => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.theme || ''}`;
    return texte.toLowerCase().includes(recherche.toLowerCase());
  });

  if (isSuperAdmin) {
    return (
      <RoleBlockedState
        title={t('groups.business_groups')}
        text={t('groups.mobile_super_admin_no_access')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('groups.search')}
          placeholderTextColor="#94a3b8"
          value={recherche}
          onChangeText={setRecherche}
        />
        <TouchableOpacity style={styles.retrySmall} onPress={chargerGroupes}>
          <Text style={styles.retrySmallText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>

      {isMembre && (
        <MemberStatus
          adhesionAcceptee={adhesionAcceptee}
          adhesionEnAttente={adhesionEnAttente}
          t={t}
        />
      )}

      {!isAuthenticated && (
        <InfoBox text={t('groups.login_to_join')} />
      )}

      {isReferent && (
        <InfoBox text={t('groups.referent_mobile_info')} />
      )}

      {isAdmin && (
        <InfoBox text={t('adminMobile.groupsReadOnly', { defaultValue: 'Vue mobile de suivi des groupes, référents et statuts.' })} />
      )}

      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}

      {error !== '' && groupes.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error !== '' && groupes.length === 0 ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={error || t('common.loadErrorDescription')}
          retryLabel={t('common.retry')}
          onRetry={chargerGroupes}
        />
      ) : groupesFiltres.length === 0 ? (
        <SharedEmptyState
          icon="group"
          illustrationSource={require('../assets/images/placeholders/groupes.png')}
          title={recherche ? t('groups.no_search_results') : t('groups.no_groups')}
          text={isReferent
            ? t('groups.no_referent_groups')
            : t('groups.available_will_appear')}
          actionLabel={t('common.retry')}
          onAction={chargerGroupes}
        />
      ) : (
        <FlatList
          data={groupesFiltres}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <GroupeCard
              groupe={item}
              isAuthenticated={isAuthenticated}
              isMembre={isMembre}
              isReferent={isReferent}
              adhesion={adhesions.find((a) => a.groupeId === item.id)}
              hasActiveOrPendingAdhesion={hasActiveOrPendingAdhesion}
              actionLoading={actionLoadingId === item.id}
              onRejoindre={() => handleRejoindre(item.id)}
              onQuitter={() => handleQuitter(item.id)}
              t={t}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={chargerGroupes}
          refreshing={false}
        />
      )}
    </View>
  );
}

function MemberStatus({ adhesionAcceptee, adhesionEnAttente, t }) {
  let title = t('statuses.AUCUN_GROUPE', { defaultValue: t('memberDashboard.status.noGroupLabel') });
  let text = t('groups.can_request_group');
  let color = '#38BDF8';
  let bg = '#E0F2FE';

  if (adhesionEnAttente) {
    title = t('statuses.EN_ATTENTE');
    text = t('groups.request_waiting_validation', { group: adhesionEnAttente.groupeNom });
    color = '#d97706';
    bg = '#fef3c7';
  }

  if (adhesionAcceptee) {
    title = t('statuses.ACCEPTE');
    text = t('groups.member_of', { group: adhesionAcceptee.groupeNom });
    color = '#22C55E';
    bg = '#dcfce7';
  }

  return (
    <View style={[styles.statusCard, { backgroundColor: bg, borderLeftColor: color }]}>
      <Text style={[styles.statusTitle, { color }]}>{title}</Text>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

function GroupeCard({
  groupe,
  isAuthenticated,
  isMembre,
  isReferent,
  adhesion,
  hasActiveOrPendingAdhesion,
  actionLoading,
  onRejoindre,
  onQuitter,
  t,
}) {
  const acceptedHere = adhesion?.statut === 'ACCEPTE';
  const pendingHere = adhesion?.statut === 'EN_ATTENTE';
  const refusedHere = adhesion?.statut === 'REFUSE';
  const canRequest = isMembre && !hasActiveOrPendingAdhesion;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: acceptedHere ? '#dcfce7' : '#E0F2FE' }]}>
          <AppIcon name="group" size={20} color={acceptedHere ? '#22C55E' : '#38BDF8'} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>{groupe.nom}</Text>
          <Text style={styles.cardSub}>
            {t('groups.members_count', { count: groupe.nombreMembres ?? 0 })}
          </Text>
        </View>
        <StatusBadge label={translateGroupeStatut(groupe.statut, t)} color={groupe.statut === 'VALIDE' ? '#22C55E' : '#d97706'} />
      </View>

      {groupe.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{groupe.description}</Text>
      )}

      <View style={styles.metaBox}>
        {groupe.theme && <MetaRow label={t('groups.theme')} value={groupe.theme} />}
        {groupe.categorie && <MetaRow label={t('groups.category')} value={groupe.categorie} />}
        <MetaRow
          label={t('groups.referent')}
          value={groupe.referentPrenom || groupe.referentNom
            ? `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim()
            : t('groups.not_assigned')}
        />
      </View>

      {isReferent && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {t('groups.referent_web_members_requests')}
          </Text>
        </View>
      )}

      {!isAuthenticated && (
        <Text style={styles.visitorHint}>{t('groups.login_to_join')}</Text>
      )}

      {isMembre && (
        <View style={styles.actions}>
          {acceptedHere && (
            <TouchableOpacity
              style={[styles.btnDanger, actionLoading && styles.btnDisabled]}
              onPress={onQuitter}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnDangerText}>{t('groups.leave_btn')}</Text>
              }
            </TouchableOpacity>
          )}

          {pendingHere && (
            <StatusLine text={t('groups.pending_for_group')} color="#d97706" />
          )}

          {refusedHere && !hasActiveOrPendingAdhesion && (
            <StatusLine text={t('groups.previous_refused')} color="#EF4444" />
          )}

          {!acceptedHere && !pendingHere && (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRequest || actionLoading) && styles.btnDisabled]}
              onPress={onRejoindre}
              disabled={!canRequest || actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnPrimaryText}>
                    {canRequest ? t('groups.request_to_join') : t('groups.already_in_group')}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function RoleBlockedState({ title, text }) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIconCircle}>
        <AppIcon name="group" size={34} color="#38BDF8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function InfoBox({ text }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoBoxText}>{text}</Text>
    </View>
  );
}

function StatusBadge({ label, color }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

function StatusLine({ text, color }) {
  return <Text style={[styles.statusLine, { color }]}>{text}</Text>;
}

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function translateGroupeStatut(statut, t) {
  return t(`statuses.${statut}`, { defaultValue: statut || t('groups.title') });
}

function getApiError(err, t, fallback) {
  if (err.response?.status === 401) {
    return t('errors.session_expired');
  }
  if (err.response?.status === 403) {
    return t('errors.forbidden');
  }
  return fallback;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retrySmall: {
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retrySmallText: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },

  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statusTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  statusText: { color: '#334155', fontSize: 13, lineHeight: 18 },

  infoBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoBoxText: { color: '#1e40af', fontSize: 13, lineHeight: 18 },

  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  successText: { color: '#15803d', fontSize: 13 },
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

  listContent: { padding: 14, paddingBottom: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A', marginBottom: 3, lineHeight: 21 },
  cardSub: { color: '#64748b', fontSize: 12 },
  cardDesc: { color: '#475569', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  metaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  metaLabel: { color: '#64748b', fontSize: 11 },
  metaValue: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: '58%',
    textAlign: 'right',
  },

  notice: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 2 },
  noticeText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  visitorHint: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginTop: 4 },

  actions: { marginTop: 4 },
  btnPrimary: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnDanger: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDangerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnDisabled: { backgroundColor: '#cbd5e1' },
  statusLine: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
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
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
