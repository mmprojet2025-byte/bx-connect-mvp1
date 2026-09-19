import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { getReadOnlyCache, saveReadOnlyCache } from '../services/readOnlyCache';
import {
  EmptyState as SharedEmptyState,
  ErrorState as SharedErrorState,
  LoadingState,
} from '../components/MobileUI';

const PUBLIC_GROUPS_CACHE_KEY = 'groups:public';

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
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [adhesionsStatus, setAdhesionsStatus] = useState(isMembre ? 'loading' : 'idle');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [groupsError, setGroupsError] = useState('');
  const [adhesionsError, setAdhesionsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [cacheNotice, setCacheNotice] = useState('');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    void Promise.resolve().then(() => chargerGroupes());
  }, [isAuthenticated, isMembre, isReferent, isAdmin, isSuperAdmin]);

  async function chargerGroupes() {
    setGroupsLoading(true);
    setGroupsError('');
    setActionError('');
    setMessage('');
    setCacheNotice('');

    if (isSuperAdmin) {
      setGroupsLoading(false);
      setAdhesionsStatus('idle');
      return;
    }

    const membershipsRequest = isMembre ? chargerAdhesions() : Promise.resolve();

    try {
      if (isAdmin) {
        const res = await api.get('/admin/groupes');
        setGroupes(res.data || []);
        setAdhesions([]);
        setAdhesionsStatus('idle');
      } else if (isReferent) {
        const res = await api.get('/referent/groupes');
        setGroupes(res.data || []);
        setAdhesions([]);
        setAdhesionsStatus('idle');
      } else {
        let groupesData = [];
        try {
          const groupesRes = await api.get('/groupes');
          groupesData = groupesRes.data || [];
          await saveReadOnlyCache(PUBLIC_GROUPS_CACHE_KEY, groupesData);
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
        if (!isMembre) {
          setAdhesions([]);
          setAdhesionsStatus('idle');
        }
      }
    } catch (err) {
      const canUsePublicCache = !isAdmin && !isReferent && !isSuperAdmin
        && err.response?.status !== 403;
      const cachedGroups = canUsePublicCache
        ? await getReadOnlyCache(PUBLIC_GROUPS_CACHE_KEY)
        : null;

      if (cachedGroups?.length) {
        setGroupes(cachedGroups);
        setCacheNotice(t('common.cache_notice'));
        setGroupsError('');
        return;
      }

      if (isMembre && err.response?.status === 403) {
        setGroupes([]);
        setGroupsError('');
      } else {
        setGroupes([]);
        setGroupsError(getApiError(err, t, t('groups.error_load')));
      }
    } finally {
      setGroupsLoading(false);
      await membershipsRequest;
    }
  }

  async function chargerAdhesions() {
    if (!isMembre) {
      setAdhesions([]);
      setAdhesionsStatus('idle');
      setAdhesionsError('');
      return;
    }

    setAdhesionsStatus('loading');
    setAdhesionsError('');
    try {
      const response = await api.get('/groupes/mes-adhesions');
      setAdhesions(response.data || []);
      setAdhesionsStatus('success');
    } catch (err) {
      setAdhesions([]);
      setAdhesionsStatus('error');
      setAdhesionsError(getApiError(err, t, t('groups.membership_error')));
    }
  }

  const handleRejoindre = async (groupeId) => {
    if (!isMembre || adhesionsStatus !== 'success' || hasActiveOrPendingAdhesion || cacheNotice !== '') return;

    setActionLoadingId(groupeId);
    setActionError('');
    setMessage('');
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`);
      await chargerGroupes();
      setMessage(t('groups.request_sent_pending'));
    } catch (err) {
      setActionError(getApiError(err, t, t('groups.error_join_request')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuitter = async (groupeId) => {
    if (!isMembre || adhesionsStatus !== 'success' || cacheNotice !== '') return;

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
    setActionError('');
    setMessage('');
    try {
      await api.delete(`/groupes/${groupeId}/quitter`);
      await chargerGroupes();
      setMessage(t('groups.success_leave'));
    } catch (err) {
      setActionError(getApiError(err, t, t('groups.error_leave')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const adhesionAcceptee = adhesions.find((adhesion) => adhesion.statut === 'ACCEPTE') || null;
  const adhesionEnAttente = adhesions.find((adhesion) => adhesion.statut === 'EN_ATTENTE') || null;
  const hasActiveOrPendingAdhesion = !!adhesionAcceptee || !!adhesionEnAttente;

  const groupesFiltres = groupes.filter((groupe) => {
    const texte = `${groupe.nom || ''} ${groupe.description || ''} ${groupe.theme || ''} ${groupe.categorie || ''} ${groupe.commune || ''}`;
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
        <View style={styles.searchField}>
          <AppIcon name="search" size={19} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('groups.search')}
            placeholderTextColor="#94A3B8"
            value={recherche}
            onChangeText={setRecherche}
            accessibilityLabel={t('groups.search')}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void chargerGroupes()}
          disabled={groupsLoading}
          accessibilityRole="button"
          accessibilityLabel={t('groups.refresh')}
        >
          {groupsLoading
            ? <ActivityIndicator size="small" color="#2563EB" />
            : <AppIcon name="refresh" size={20} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      {isMembre && adhesionsStatus === 'success' && (
        <MemberStatus
          adhesionAcceptee={adhesionAcceptee}
          adhesionEnAttente={adhesionEnAttente}
          t={t}
        />
      )}

      {isMembre && adhesionsStatus === 'loading' && !groupsLoading ? (
        <MembershipState
          loading
          title={t('groups.membership_loading')}
          text={t('groups.membership_loading_text')}
        />
      ) : null}

      {isMembre && adhesionsStatus === 'error' && !groupsLoading ? (
        <MembershipState
          title={t('groups.membership_error_title')}
          text={adhesionsError}
          actionLabel={t('common.retry')}
          onAction={() => void chargerAdhesions()}
        />
      ) : null}

      {!isAuthenticated && (
        <InfoBox text={t('groups.login_to_join')} />
      )}

      {isReferent && (
        <InfoBox text={t('groups.referent_mobile_info')} />
      )}

      {isAdmin && (
        <InfoBox text={t('adminMobile.groupsReadOnly')} />
      )}

      {cacheNotice !== '' && (
        <InfoBox text={cacheNotice} />
      )}

      {message !== '' && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}

      {actionError !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      {groupsLoading ? (
        <LoadingState label={t('groups.loading')} />
      ) : groupsError !== '' ? (
        <SharedErrorState
          title={t('common.loadErrorTitle')}
          text={groupsError}
          retryLabel={t('common.retry')}
          onRetry={() => void chargerGroupes()}
        />
      ) : groupesFiltres.length === 0 ? (
        <SharedEmptyState
          icon="group"
          illustrationSource={require('../assets/images/placeholders/groupes.png')}
          title={recherche ? t('groups.no_search_results') : t('groups.no_groups')}
          text={isReferent
            ? t('groups.no_referent_groups')
            : t('groups.available_will_appear')}
          actionLabel={recherche ? undefined : t('common.retry')}
          onAction={recherche ? undefined : () => void chargerGroupes()}
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
              readOnly={cacheNotice !== '' || adhesionsStatus !== 'success'}
              readOnlyText={cacheNotice !== ''
                ? t('common.cache_read_only')
                : t('groups.membership_unknown_read_only')}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => void chargerGroupes()}
          refreshing={groupsLoading}
        />
      )}
    </View>
  );
}

function MemberStatus({ adhesionAcceptee, adhesionEnAttente, t }) {
  let title = t('statuses.AUCUN_GROUPE');
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
    title = t('groups.member_status');
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

function MembershipState({ loading = false, title, text, actionLabel, onAction }) {
  return (
    <View style={[styles.membershipState, !loading && styles.membershipStateError]} accessibilityRole={loading ? 'progressbar' : 'alert'}>
      <View style={styles.membershipStateHeader}>
        {loading
          ? <ActivityIndicator size="small" color="#2563EB" />
          : <AppIcon name="warning" size={20} color="#EF4444" />}
        <Text style={styles.membershipStateTitle}>{title}</Text>
      </View>
      <Text style={styles.membershipStateText}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.membershipRetry}
          onPress={onAction}
          accessibilityRole="button"
        >
          <AppIcon name="refresh" size={17} color="#2563EB" />
          <Text style={styles.membershipRetryText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  readOnly,
  readOnlyText,
}) {
  const acceptedHere = adhesion?.statut === 'ACCEPTE';
  const pendingHere = adhesion?.statut === 'EN_ATTENTE';
  const refusedHere = adhesion?.statut === 'REFUSE';
  const canRequest = !readOnly && isMembre && !hasActiveOrPendingAdhesion;
  const itineraryUrl = buildMapsUrl({
    latitude: groupe.latitude,
    longitude: groupe.longitude,
    addressParts: [groupe.adresseReunion, groupe.commune],
  });

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
        {groupe.statut ? (
          <StatusBadge
            label={translateGroupeStatut(groupe.statut, t)}
            color={groupe.statut === 'VALIDE' ? '#22C55E' : '#F59E0B'}
          />
        ) : null}
      </View>

      {groupe.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{groupe.description}</Text>
      )}

      <View style={styles.metaBox}>
        {groupe.theme && <MetaRow label={t('groups.theme')} value={groupe.theme} />}
        {groupe.categorie && <MetaRow label={t('groups.category')} value={groupe.categorie} />}
        {groupe.adresseReunion && (
          <MetaRow label={t('geo.meetingAddress')} value={groupe.adresseReunion} />
        )}
        {groupe.commune && (
          <MetaRow label={t('geo.commune')} value={groupe.commune} />
        )}
        <MetaRow
          label={t('groups.referent')}
          value={groupe.referentPrenom || groupe.referentNom
            ? `${groupe.referentPrenom || ''} ${groupe.referentNom || ''}`.trim()
            : t('groups.not_assigned')}
        />
      </View>

      {itineraryUrl ? (
        <TouchableOpacity
          style={styles.itineraryButton}
          onPress={() => openItinerary(itineraryUrl, t)}
          accessibilityRole="link"
        >
          <AppIcon name="location-outline" size={16} color="#2563EB" />
          <Text style={styles.itineraryButtonText}>
            {t('geo.viewItinerary')}
          </Text>
        </TouchableOpacity>
      ) : null}

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
          {acceptedHere ? (
            <StatusLine text={t('groups.member_status')} color="#15803D" icon="check" />
          ) : null}

          {acceptedHere && (
            <TouchableOpacity
              style={[styles.btnDanger, actionLoading && styles.btnDisabled]}
              onPress={onQuitter}
              disabled={readOnly || actionLoading}
              accessibilityRole="button"
            >
              {actionLoading
                ? <ActivityIndicator color="#DC2626" size="small" />
                : <Text style={styles.btnDangerText}>{t('groups.leave_btn')}</Text>
              }
            </TouchableOpacity>
          )}

          {pendingHere && (
            <StatusLine text={t('groups.pending_for_group')} color="#B45309" icon="time-outline" />
          )}

          {refusedHere && (
            <StatusLine text={t('groups.previous_refused')} color="#DC2626" icon="close" />
          )}

          {readOnly && (
            <StatusLine text={readOnlyText} color="#64748B" icon="lock" />
          )}

          {!readOnly && !acceptedHere && !pendingHere && (
            <TouchableOpacity
              style={[styles.btnPrimary, (!canRequest || actionLoading) && styles.btnDisabled]}
              onPress={onRejoindre}
              disabled={!canRequest || actionLoading}
              accessibilityRole="button"
            >
              {actionLoading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
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

function StatusLine({ text, color, icon }) {
  return (
    <View style={[styles.statusLine, { backgroundColor: `${color}12` }]}>
      {icon ? <AppIcon name={icon} size={17} color={color} /> : null}
      <Text style={[styles.statusLineText, { color }]}>{text}</Text>
    </View>
  );
}

function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function translateGroupeStatut(statut, t) {
  return t(`statuses.${statut}`);
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

function buildMapsUrl({ latitude, longitude, addressParts }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }

  const query = (addressParts || [])
    .filter((part) => part && String(part).trim())
    .join(' ');

  return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : null;
}

async function openItinerary(url, t) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      t('geo.openErrorTitle'),
      t('geo.openErrorText'),
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusCard: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statusTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', marginBottom: 3 },
  statusText: { color: '#334155', fontSize: 13, lineHeight: 18 },

  membershipState: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
  },
  membershipStateError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  membershipStateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  membershipStateTitle: { flex: 1, color: '#111827', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  membershipStateText: { color: '#64748B', fontSize: 13, lineHeight: 18, marginTop: 6 },
  membershipRetry: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    marginTop: 4,
  },
  membershipRetryText: { color: '#2563EB', fontSize: 13, lineHeight: 18, fontWeight: '800' },

  infoBox: {
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
  },
  infoBoxText: { color: '#1e40af', fontSize: 13, lineHeight: 18 },

  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  successText: { color: '#15803d', fontSize: 13 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    width: 'auto',
    maxWidth: 448,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  listContent: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 16, paddingTop: 12, paddingBottom: 28 },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1, minWidth: 0, marginRight: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2, lineHeight: 20 },
  cardSub: { color: '#64748B', fontSize: 12, lineHeight: 16 },
  cardDesc: { color: '#475569', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  statusBadge: { maxWidth: 92, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontWeight: '800' },

  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  metaLabel: { flexShrink: 0, color: '#64748B', fontSize: 12, lineHeight: 17, marginRight: 8 },
  metaValue: {
    color: '#1E3A8A',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    flexShrink: 1,
    maxWidth: '62%',
    textAlign: 'right',
  },
  itineraryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
  },
  itineraryButtonText: { color: '#2563EB', fontSize: 13, lineHeight: 18, fontWeight: '800' },

  notice: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 2 },
  noticeText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  visitorHint: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginTop: 4 },

  actions: { marginTop: 2, gap: 8 },
  btnPrimary: {
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  btnDanger: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerText: { color: '#DC2626', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  btnDisabled: { backgroundColor: '#E5E7EB', borderColor: '#E5E7EB', shadowOpacity: 0 },
  statusLine: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusLineText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800' },

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
