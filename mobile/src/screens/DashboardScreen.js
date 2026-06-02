import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function DashboardScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, isMembre, role } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(isMembre);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isMembre) {
      chargerDashboard();
    } else {
      setLoading(false);
    }
  }, [isMembre]);

  const chargerDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/membre/dashboard');
      setDashboard(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setError(t('memberDashboard.errorForbidden'));
      } else {
        setError(err.response?.data?.message || t('memberDashboard.errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isMembre) {
    return <RoleDashboard user={user} role={role} navigation={navigation} t={t} />;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={styles.loadingText}>{t('memberDashboard.loadingSpace')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>!</Text>
        <Text style={styles.errorTitle}>{t('memberDashboard.unavailableTitle')}</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={chargerDashboard}>
          <Text style={styles.primaryButtonText}>{t('memberDashboard.buttons.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupe = dashboard?.groupe || null;
  const referent = dashboard?.referent || null;
  const inscriptions = dashboard?.inscriptions || [];
  const projets = dashboard?.projets || [];
  const notifications = dashboard?.notifications || [];
  const messagerieDisponible = !!dashboard?.messagerieDisponible;
  const adhesion = groupe?.statutAdhesion || 'AUCUN_GROUPE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WelcomeCard user={user} t={t} />
      <MemberStatusCard statut={adhesion} t={t} />
      <MemberGroupCard
        groupe={groupe}
        messagerieDisponible={messagerieDisponible}
        navigation={navigation}
        t={t}
      />
      <MemberReferentCard referent={referent} statut={adhesion} t={t} />
      <MemberActivitiesCard inscriptions={inscriptions} navigation={navigation} t={t} language={i18n.language} />
      <MemberNotificationsCard notifications={notifications} navigation={navigation} t={t} />
      <MemberProjectsCard projets={projets} navigation={navigation} t={t} />
      <MemberNextActions
        statut={adhesion}
        hasActivities={inscriptions.length > 0}
        hasProjects={projets.length > 0}
        messagerieDisponible={messagerieDisponible}
        navigation={navigation}
        t={t}
      />
    </ScrollView>
  );
}

function RoleDashboard({ user, role, navigation, t }) {
  const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : t('memberDashboard.userFallback');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WelcomeCard user={user} t={t} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('memberDashboard.mobileSpace')}</Text>
        <Text style={styles.cardText}>
          {t('memberDashboard.mobileLimited', { role: roleLabel })}
        </Text>
        <Text style={styles.cardHint}>
          {t('memberDashboard.mobileAdvancedWeb')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.getParent()?.navigate('TabProfile')}
      >
        <Text style={styles.primaryButtonText}>{t('memberDashboard.openProfile')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function WelcomeCard({ user, t }) {
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {initiales(user?.prenom, user?.nom)}
        </Text>
      </View>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>
          {t('memberDashboard.hello', { name: user?.prenom || t('memberDashboard.memberFallback') })}
        </Text>
        <Text style={styles.welcomeSubtitle}>{t('memberDashboard.welcome')}</Text>
      </View>
    </View>
  );
}

function MemberStatusCard({ statut, t }) {
  const info = statutInfo(statut, t);

  return (
    <View style={[styles.card, { borderLeftColor: info.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('memberDashboard.status.title')}</Text>
        <View style={[styles.badge, { backgroundColor: info.bg }]}>
          <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>
      <Text style={styles.cardText}>{info.description}</Text>
    </View>
  );
}

function MemberGroupCard({ groupe, messagerieDisponible, navigation, t }) {
  if (!groupe) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('memberDashboard.group.title')}</Text>
        <EmptyText text={t('memberDashboard.group.noActiveGroup')} />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.getParent()?.navigate('TabGroupes')}
        >
          <Text style={styles.primaryButtonText}>{t('memberDashboard.buttons.discoverGroups')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {groupe.imageUrl ? (
        <Image source={{ uri: groupe.imageUrl }} style={styles.groupImage} />
      ) : (
        <View style={styles.groupBanner}>
          <Text style={styles.groupBannerText}>{groupe.nom?.[0]?.toUpperCase() || 'G'}</Text>
        </View>
      )}
      <Text style={styles.cardTitle}>{groupe.nom}</Text>
      {groupe.description && <Text style={styles.cardText}>{groupe.description}</Text>}
      <InfoRow label={t('memberDashboard.group.status')} value={translateAdhesion(groupe.statutAdhesion, t)} t={t} />
      <InfoRow label={t('memberDashboard.group.members')} value={`${groupe.nombreMembres || 0}`} t={t} />
      <InfoRow label={t('memberDashboard.group.upcomingActivities')} value={`${groupe.nombreActivitesAVenir || 0}`} t={t} />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.getParent()?.navigate('TabGroupes')}
      >
        <Text style={styles.primaryButtonText}>{t('memberDashboard.buttons.openMyGroup')}</Text>
      </TouchableOpacity>
      <View style={[styles.notice, messagerieDisponible ? styles.noticeOk : styles.noticeMuted]}>
        <Text style={styles.noticeText}>
          {messagerieDisponible
            ? t('memberDashboard.group.messagingAvailable')
            : t('memberDashboard.group.messagingUnavailable')}
        </Text>
      </View>
    </View>
  );
}

function MemberReferentCard({ referent, statut, t }) {
  if (!referent || statut !== 'ACCEPTE') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('memberDashboard.referent.title')}</Text>
        <EmptyText text={t('memberDashboard.referent.availableAfterAcceptance')} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('memberDashboard.referent.title')}</Text>
      <InfoRow label={t('memberDashboard.referent.name')} value={`${referent.prenom || ''} ${referent.nom || ''}`.trim()} t={t} />
      <InfoRow label={t('memberDashboard.referent.email')} value={referent.email || t('memberDashboard.referent.notProvided')} t={t} />
    </View>
  );
}

function MemberActivitiesCard({ inscriptions, navigation, t, language }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('memberDashboard.activities.title')}</Text>
        <Text style={styles.counter}>{inscriptions.length}</Text>
      </View>
      {inscriptions.length === 0 ? (
        <EmptyText text={t('memberDashboard.activities.empty')} />
      ) : (
        inscriptions.slice(0, 3).map((inscription) => (
          <ListItem
            key={inscription.id}
            title={inscription.activiteTitre || t('memberDashboard.activities.fallbackTitle')}
            subtitle={formatDate(inscription.activiteDateDebut, inscription.activiteLieu, language, t)}
            badge={translateInscription(inscription.statut, t)}
            color={statusColor(inscription.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabActivities')}
      >
        <Text style={styles.secondaryButtonText}>{t('memberDashboard.buttons.viewActivities')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberNotificationsCard({ notifications, navigation, t }) {
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('memberDashboard.notifications.title')}</Text>
        <Text style={styles.counter}>{t('memberDashboard.notifications.unreadCount', { count: nonLues })}</Text>
      </View>
      {notifications.length === 0 ? (
        <EmptyText text={t('memberDashboard.notifications.empty')} />
      ) : (
        notifications.slice(0, 3).map((notification) => (
          <ListItem
            key={notification.id}
            title={notification.titre || t('memberDashboard.notifications.fallbackTitle')}
            subtitle={notification.message || t('memberDashboard.notifications.fallbackMessage')}
            badge={notification.lue ? t('memberDashboard.notifications.read') : t('memberDashboard.notifications.new')}
            color={notification.lue ? '#64748b' : '#2563eb'}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabNotifications')}
      >
        <Text style={styles.secondaryButtonText}>{t('memberDashboard.buttons.viewNotifications')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberProjectsCard({ projets, navigation, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('memberDashboard.projects.title')}</Text>
        <Text style={styles.counter}>{projets.length}</Text>
      </View>
      {projets.length === 0 ? (
        <EmptyText text={t('memberDashboard.projects.empty')} />
      ) : (
        projets.slice(0, 3).map((projet) => (
          <ListItem
            key={projet.id}
            title={projet.titre || t('memberDashboard.projects.fallbackTitle')}
            subtitle={t('memberDashboard.projects.proposed')}
            badge={translateProjet(projet.statut, t)}
            color={statusColor(projet.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabProjects')}
      >
        <Text style={styles.secondaryButtonText}>{t('memberDashboard.buttons.viewProjects')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation, t }) {
  const actions = buildNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation, t });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('memberDashboard.nextActions.title')}</Text>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.actionRow}
          onPress={action.onPress}
          disabled={!action.onPress}
        >
          <View style={[styles.actionDot, action.done && styles.actionDotDone]} />
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function buildNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation, t }) {
  if (!statut || statut === 'AUCUN_GROUPE') {
    return [
      {
        label: t('memberDashboard.nextActions.joinGroup'),
        description: t('memberDashboard.nextActions.joinGroupDescription'),
        onPress: () => navigation.getParent()?.navigate('TabGroupes'),
      },
      {
        label: t('memberDashboard.nextActions.discoverActivities'),
        description: t('memberDashboard.nextActions.discoverActivitiesDescription'),
        onPress: () => navigation.getParent()?.navigate('TabActivities'),
      },
    ];
  }

  if (statut === 'EN_ATTENTE') {
    return [
      {
        label: t('memberDashboard.status.pendingTitle'),
        description: t('memberDashboard.nextActions.requestPendingDescription'),
      },
      {
        label: t('memberDashboard.nextActions.exploreActivities'),
        description: t('memberDashboard.nextActions.exploreActivitiesDescription'),
        onPress: () => navigation.getParent()?.navigate('TabActivities'),
      },
    ];
  }

  return [
    {
      label: t('memberDashboard.nextActions.groupJoined'),
      description: t('memberDashboard.nextActions.groupJoinedDescription'),
      done: true,
    },
    {
      label: hasActivities ? t('memberDashboard.nextActions.trackRegistrations') : t('memberDashboard.nextActions.joinActivity'),
      description: hasActivities ? t('memberDashboard.nextActions.trackRegistrationsDescription') : t('memberDashboard.nextActions.joinActivityDescription'),
      onPress: () => navigation.getParent()?.navigate('TabActivities'),
    },
    {
      label: messagerieDisponible ? t('memberDashboard.nextActions.useMessaging') : t('memberDashboard.nextActions.messagingUnavailable'),
      description: messagerieDisponible ? t('memberDashboard.nextActions.useMessagingDescription') : t('memberDashboard.nextActions.messagingUnavailableDescription'),
      onPress: messagerieDisponible ? () => navigation.getParent()?.navigate('TabMessagerie') : null,
    },
    {
      label: hasProjects ? t('memberDashboard.nextActions.trackProjects') : t('memberDashboard.nextActions.proposeProject'),
      description: hasProjects ? t('memberDashboard.nextActions.trackProjectsDescription') : t('memberDashboard.nextActions.proposeProjectDescription'),
      onPress: () => navigation.getParent()?.navigate('TabProjects'),
    },
  ];
}

function InfoRow({ label, value, t }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || t('memberDashboard.referent.notProvided')}</Text>
    </View>
  );
}

function ListItem({ title, subtitle, badge, color }) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listText}>
        <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.listSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <View style={[styles.smallBadge, { backgroundColor: color }]}>
        <Text style={styles.smallBadgeText}>{badge}</Text>
      </View>
    </View>
  );
}

function EmptyText({ text }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function initiales(prenom, nom) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';
}

function statutInfo(statut, t) {
  if (statut === 'ACCEPTE') {
    return {
      label: t('memberDashboard.status.acceptedLabel'),
      description: t('memberDashboard.status.acceptedMessagingAvailable'),
      color: '#16a34a',
      bg: '#dcfce7',
    };
  }
  if (statut === 'EN_ATTENTE') {
    return {
      label: t('memberDashboard.status.pendingTitle'),
      description: t('memberDashboard.status.pendingGeneric'),
      color: '#d97706',
      bg: '#fef3c7',
    };
  }
  return {
    label: t('memberDashboard.status.noGroupLabel'),
    description: t('memberDashboard.status.noGroupDescription'),
    color: '#2563eb',
    bg: '#dbeafe',
  };
}

function translateAdhesion(statut, t) {
  switch (statut) {
    case 'ACCEPTE': return t('memberDashboard.status.acceptedLabel');
    case 'EN_ATTENTE': return t('memberDashboard.status.pendingTitle');
    case 'REFUSE': return t('memberDashboard.status.refusedLabel');
    default: return t('memberDashboard.status.noGroupLabel');
  }
}

function translateInscription(statut, t) {
  return t(`memberDashboard.statuses.subscription.${statut}`, {
    defaultValue: statut || t('memberDashboard.statuses.unknown'),
  });
}

function translateProjet(statut, t) {
  return t(`memberDashboard.statuses.project.${statut}`, {
    defaultValue: statut || t('memberDashboard.statuses.unknown'),
  });
}

function statusColor(statut) {
  switch (statut) {
    case 'CONFIRMEE':
    case 'APPROUVE':
    case 'ACCEPTE':
      return '#16a34a';
    case 'EN_ATTENTE':
    case 'EN_ATTENTE_PAIEMENT':
    case 'SOUMIS':
      return '#d97706';
    case 'EN_COURS':
      return '#2563eb';
    case 'ANNULEE':
    case 'REJETE':
    case 'REFUSE':
      return '#dc2626';
    case 'TERMINE':
      return '#64748b';
    default:
      return '#64748b';
  }
}

function formatDate(dateStr, lieu, language, t) {
  const fragments = [];
  if (dateStr) {
    fragments.push(new Date(dateStr).toLocaleDateString(language || 'fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }));
  }
  if (lieu) fragments.push(lieu);
  return fragments.length > 0 ? fragments.join(' · ') : t('memberDashboard.activities.dateToConfirm');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f0f4f8',
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  errorTitle: { color: '#1e3a5f', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  welcomeCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  welcomeContent: { flex: 1 },
  welcomeTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  welcomeSubtitle: { color: '#bfdbfe', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e3a5f', marginBottom: 8 },
  cardText: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 10 },
  cardHint: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  counter: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  groupImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  groupBanner: {
    height: 110,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupBannerText: { color: '#1e3a5f', fontSize: 36, fontWeight: '900' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { color: '#64748b', fontSize: 12 },
  infoValue: { color: '#1e3a5f', fontSize: 12, fontWeight: '700', maxWidth: '58%', textAlign: 'right' },
  primaryButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  secondaryButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { color: '#2563eb', fontWeight: '800', fontSize: 13 },
  notice: { borderRadius: 10, padding: 10, marginTop: 10 },
  noticeOk: { backgroundColor: '#dcfce7' },
  noticeMuted: { backgroundColor: '#f1f5f9' },
  noticeText: { color: '#334155', fontSize: 12, lineHeight: 17 },
  emptyBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8 },
  emptyIcon: { fontSize: 34, color: '#dc2626', marginBottom: 10 },
  emptyText: { color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listText: { flex: 1, marginRight: 10 },
  listTitle: { color: '#1e3a5f', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  listSubtitle: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  smallBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  smallBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginTop: 4,
    marginRight: 10,
  },
  actionDotDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  actionTextWrap: { flex: 1 },
  actionLabel: { color: '#1e3a5f', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  actionDescription: { color: '#64748b', fontSize: 12, lineHeight: 17 },
});
