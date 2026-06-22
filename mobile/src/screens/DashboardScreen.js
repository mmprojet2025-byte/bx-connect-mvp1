import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';
import { ActionCard, Avatar, COLORS, StatCard } from '../components/MobileUI';
import { trackDashboardView } from '../services/analytics';

const PARTNER_CONTACT_EMAIL = 'contact@bxconnect.be';

export default function DashboardScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, role } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [referentDashboard, setReferentDashboard] = useState(null);
  const [roleDashboard, setRoleDashboard] = useState(null);
  const [loading, setLoading] = useState(isMembre || isReferent || isAdmin || isSuperAdmin || isPartenaire);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (role) {
      trackDashboardView(role);
    }

    if (isMembre) {
      chargerDashboard();
    } else if (isReferent) {
      chargerReferentDashboard();
    } else if (isAdmin) {
      chargerAdminDashboard();
    } else if (isSuperAdmin) {
      chargerSuperAdminDashboard();
    } else if (isPartenaire) {
      chargerPartenaireDashboard();
    } else {
      setLoading(false);
    }
  }, [isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, role]);

  const chargerDashboard = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await api.get('/membre/dashboard');
      setDashboard(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setDashboard({});
        setNotice(t('dashboard.partialData'));
      } else {
        setError(t('memberDashboard.errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerReferentDashboard = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const results = await Promise.allSettled([
        api.get('/referent/dashboard'),
        api.get('/referent/groupes'),
        api.get('/notifications'),
      ]);
      const [dashboardRes, groupesRes, notificationsRes] = results;
      if (allRejected(results)) {
        const reason = firstRejection(results);
        if (reason?.response?.status !== 403) throw reason;
      }
      const groupes = settledData(groupesRes, []);
      const demandesAdhesion = await chargerDemandesAdhesionReferent(groupes);
      setReferentDashboard({
        ...settledData(dashboardRes, {}),
        groupes,
        notifications: settledData(notificationsRes, []),
        demandesAdhesion,
      });
      if (results.some(result => result.status === 'rejected')) {
        setNotice(t('dashboard.partialData'));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setReferentDashboard({ groupes: [], notifications: [] });
        setNotice(t('dashboard.partialData'));
      } else {
        setError(t('referentDashboard.errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerAdminDashboard = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const results = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/admin/referents'),
        api.get('/annonces/admin/opportunites'),
        api.get('/partenaire/admin/tous'),
        api.get('/projets/admin/soumis'),
      ]);
      const [statsRes, groupesRes, groupesAttenteRes, referentsRes, opportunitesRes, soutiensRes, projetsSoumisRes] = results;
      if (allRejected(results)) {
        const reason = firstRejection(results);
        if (reason?.response?.status !== 403) throw reason;
      }
      setRoleDashboard({
        type: 'ADMIN',
        stats: settledData(statsRes, {}),
        groupes: settledData(groupesRes, []),
        groupesEnAttente: settledData(groupesAttenteRes, []),
        referents: settledData(referentsRes, []),
        opportunites: settledData(opportunitesRes, []),
        soutiens: settledData(soutiensRes, []),
        projetsSoumis: settledData(projetsSoumisRes, []),
      });
      if (results.some(result => result.status === 'rejected')) {
        setNotice(t('dashboard.partialData'));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setRoleDashboard({ type: 'ADMIN', stats: {}, groupes: [], groupesEnAttente: [], referents: [], opportunites: [], soutiens: [], projetsSoumis: [] });
        setNotice(t('dashboard.partialData'));
      } else {
        setError(t('adminMobile.dashboardLoadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerPartenaireDashboard = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const results = await Promise.allSettled([
        api.get('/partenaire/statistiques'),
        api.get('/partenaire/mes-soutiens'),
        api.get('/annonces/partenaire/mes-opportunites'),
        api.get('/partenaire/projets-ouverts'),
        api.get('/partenaire/activites-ouvertes'),
        api.get('/partenaire/profil'),
      ]);
      const [statsRes, soutiensRes, opportunitesRes, projetsRes, activitesRes, profilRes] = results;
      if (results.every(result => result.status === 'rejected')) {
        const reason = firstRejection(results);
        if (reason?.response?.status !== 403) throw reason;
      }
      setRoleDashboard({
        type: 'PARTENAIRE',
        stats: settledData(statsRes, {}),
        soutiens: settledData(soutiensRes, []),
        opportunites: settledData(opportunitesRes, []),
        projetsOuverts: settledData(projetsRes, []),
        activitesOuvertes: settledData(activitesRes, []),
        profil: settledData(profilRes, null),
      });
      if (results.some(result => result.status === 'rejected')) {
        setNotice(t('dashboard.partialData'));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setRoleDashboard({
          type: 'PARTENAIRE',
          stats: {},
          soutiens: [],
          opportunites: [],
          projetsOuverts: [],
          activitesOuvertes: [],
          profil: null,
        });
        setNotice(t('dashboard.partialData'));
      } else {
        setError(t('partner.dashboardLoadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerSuperAdminDashboard = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.get('/super-admin/dashboard');
      setRoleDashboard({
        type: 'SUPER_ADMIN',
        stats: response.data || {},
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setRoleDashboard({ type: 'SUPER_ADMIN', stats: {} });
        setNotice(t('dashboard.partialData'));
      } else {
        setError(t('superAdmin.mobile.dashboardLoadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isMembre) {
    if (isReferent) {
      if (loading) {
        return (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>{t('referentDashboard.loading')}</Text>
          </View>
        );
      }

      if (error) {
        return (
          <View style={styles.centered}>
            <AppIcon name="warning" size={42} color="#EF4444" style={styles.emptyIcon} />
            <Text style={styles.errorTitle}>{t('memberDashboard.unavailableTitle')}</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={chargerReferentDashboard}>
              <Text style={styles.primaryButtonText}>{t('memberDashboard.buttons.retry')}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <ReferentDashboard
          dashboard={referentDashboard}
          navigation={navigation}
          t={t}
          language={i18n.language}
          notice={notice}
        />
      );
    }

    if ((isAdmin || isSuperAdmin || isPartenaire) && loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    if ((isAdmin || isSuperAdmin || isPartenaire) && error) {
      return (
        <View style={styles.centered}>
          <AppIcon name="warning" size={42} color="#EF4444" style={styles.emptyIcon} />
          <Text style={styles.errorTitle}>{t('memberDashboard.unavailableTitle')}</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isAdmin
              ? chargerAdminDashboard
              : isSuperAdmin
                ? chargerSuperAdminDashboard
                : chargerPartenaireDashboard}
          >
            <Text style={styles.primaryButtonText}>{t('memberDashboard.buttons.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <RoleDashboard
        user={user}
        role={role}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        isPartenaire={isPartenaire}
        dashboard={roleDashboard}
        navigation={navigation}
        t={t}
        notice={notice}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E3A8A" />
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
      <WelcomeCard user={user} role={user?.role || 'MEMBRE'} t={t} />
      <DashboardNotice text={notice} />
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

function ReferentDashboard({ dashboard, navigation, t, language, notice }) {
  const groupes = dashboard?.groupes || [];
  const activites = dashboard?.mesActivites || [];
  const projets = dashboard?.projetsSoumisListe || [];
  const notifications = dashboard?.notifications || [];
  const demandesAdhesion = dashboard?.demandesAdhesion || [];
  const nonLues = notifications.filter((notification) => !notification.lue).length;
  const activitesAPublier = activites.filter((activite) => activite.statut === 'BROUILLON');
  const projetsASuivre = projets.filter((projet) => !['TERMINE', 'REJETE'].includes(projet.statut));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DashboardNotice text={notice} />

      <GlobalSearchAccess navigation={navigation} t={t} />

      <DashboardSectionTitle
        title={t('referentDashboard.mobileTitle')}
        subtitle={t('referentDashboard.mobileDescription')}
      />

      <ReferentPriorityActions
        demandesCount={demandesAdhesion.length}
        projetsCount={projetsASuivre.length || projets.length}
        activitesCount={activitesAPublier.length}
        navigation={navigation}
        t={t}
      />

      <View style={styles.metricGrid}>
        <MetricCard label={t('referentDashboard.assignedGroups')} value={groupes.length} color="#38BDF8" icon="group" />
        <MetricCard label={t('navigation.activities')} value={dashboard?.totalActivites ?? activites.length} color="#0f766e" icon="activity" />
        <MetricCard label={t('navigation.projects')} value={dashboard?.projetsSoumis ?? projets.length} color="#7c3aed" icon="project" />
        <MetricCard label={t('referentDashboard.unreadNotifications')} value={nonLues} color="#d97706" icon="bell" />
      </View>

      <ReferentGroupsCard groupes={groupes} navigation={navigation} t={t} />
      <ReferentActivitiesCard activites={activites} navigation={navigation} language={language} t={t} />
      <ReferentProjectsCard projets={projets} navigation={navigation} t={t} />
      <ReferentNotificationsCard notifications={notifications} navigation={navigation} t={t} />
      <ReferentQuickActions navigation={navigation} t={t} />
    </ScrollView>
  );
}

function ReferentPriorityActions({ demandesCount, projetsCount, activitesCount, navigation, t }) {
  return (
    <View style={styles.priorityCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('referentDashboard.priorityTitle')}</Text>
      </View>
      <View style={styles.priorityGrid}>
        <PriorityButton
          label={t('referentMobile.requestsTitle')}
          count={demandesCount}
          icon="warning"
          color="#d97706"
          onPress={() => navigation.navigate('ReferentRequestsAccess')}
        />
        <PriorityButton
          label={t('referentDashboard.projectsToFollow')}
          count={projetsCount}
          icon="project"
          color={COLORS.impactOrange}
          onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
        />
        <PriorityButton
          label={t('referentDashboard.activitiesToPublish')}
          count={activitesCount}
          icon="activity"
          color="#0f766e"
          onPress={() => navigateAccess(navigation, 'TabActivities')}
        />
      </View>
    </View>
  );
}

function PriorityButton({ label, count, icon, color, onPress }) {
  const hasWork = count > 0;
  return (
    <TouchableOpacity
      style={[styles.priorityButton, hasWork && { borderColor: color, backgroundColor: `${color}12` }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <View style={[styles.priorityIcon, { backgroundColor: `${color}18` }]}>
        <AppIcon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.priorityCount, { color }]}>{count}</Text>
      <Text style={styles.priorityLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function AdminModerationCard({ dashboard, navigation, t }) {
  const opportunitesEnAttente = (dashboard?.opportunites || [])
    .filter((opportunity) => opportunity.statutModeration === 'EN_ATTENTE').length;
  const soutiensEnAttente = (dashboard?.soutiens || [])
    .filter((support) => support.statutPaiement === 'EN_ATTENTE').length;
  const projetsSoumis = dashboard?.projetsSoumis?.length || 0;
  const groupesEnAttente = dashboard?.groupesEnAttente?.length || 0;

  return (
    <View style={styles.priorityCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('adminMobile.toModerate')}</Text>
      </View>
      <View style={styles.priorityGrid}>
        <PriorityButton
          label={t('adminMobile.opportunitiesShort')}
          count={opportunitesEnAttente}
          icon="alert"
          color="#d97706"
          onPress={() => navigation.navigate('AdminOpportunitiesAccess')}
        />
        <PriorityButton
          label={t('partner.supports')}
          count={soutiensEnAttente}
          icon="wallet"
          color={COLORS.info}
          onPress={() => navigation.navigate('AdminPartnerSupportsAccess')}
        />
        <PriorityButton
          label={t('navigation.projects')}
          count={projetsSoumis}
          icon="project"
          color={COLORS.impactOrange}
          onPress={() => navigation.navigate('AdminSubmittedProjectsAccess')}
        />
        <PriorityButton
          label={t('navigation.groups')}
          count={groupesEnAttente}
          icon="group"
          color="#0f766e"
          onPress={() => navigation.navigate('AdminPendingGroupsAccess')}
        />
      </View>
    </View>
  );
}

function PartnerQuickAccess({ dashboard, navigation, t }) {
  const soutiens = dashboard?.soutiens || [];
  const opportunites = dashboard?.opportunites || [];
  const projets = dashboard?.projets || [];
  const activites = dashboard?.activites || [];
  const profile = dashboard?.profil || {};
  const soutiensEnAttente = soutiens.filter((support) => support.statutPaiement === 'EN_ATTENTE').length;
  const opportunitesEnAttente = opportunites.filter((opportunity) => opportunity.statutModeration === 'EN_ATTENTE').length;
  const profileComplete = !!profile.nomOrganisation && !!profile.description;

  return (
    <View style={styles.priorityCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('partner.mobile.quickAccess')}</Text>
      </View>
      <View style={styles.priorityGrid}>
        <PriorityButton
          label={t('partnerInstitution.profileTitle')}
          count={profileComplete ? 1 : 0}
          icon="building"
          color={profileComplete ? COLORS.success : COLORS.warning}
          onPress={() => navigation.navigate('PartnerProfileAccess')}
        />
        <PriorityButton
          label={t('partner.supports')}
          count={soutiensEnAttente}
          icon="wallet"
          color={COLORS.info}
          onPress={() => navigateAccess(navigation, 'TabSupports', 'SupportsAccess')}
        />
        <PriorityButton
          label={t('partner.opportunities')}
          count={opportunitesEnAttente}
          icon="alert"
          color={COLORS.impactOrange}
          onPress={() => navigateAccess(navigation, 'TabSupports', 'SupportsAccess', { tab: 'opportunities' })}
        />
        <PriorityButton
          label={t('partner.openProjects')}
          count={projets.length}
          icon="project"
          color={COLORS.impactOrange}
          onPress={() => navigateAccess(navigation, 'TabProjects')}
        />
        <PriorityButton
          label={t('partner.openActivities')}
          count={activites.length}
          icon="activity"
          color={COLORS.success}
          onPress={() => navigateAccess(navigation, 'TabActivities')}
        />
      </View>
    </View>
  );
}

function MetricCard({ label, value, color, icon }) {
  return <StatCard label={label} value={value} color={color} icon={icon} />;
}

function ReferentGroupsCard({ groupes, navigation, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('referentDashboard.assignedGroups')}</Text>
        <Text style={styles.counter}>{groupes.length}</Text>
      </View>
      {groupes.length === 0 ? (
        <EmptyText text={t('referentDashboard.noAssignedGroups')} />
      ) : (
        groupes.slice(0, 3).map((groupe) => (
          <ListItem
            key={groupe.id}
            title={groupe.nom || t('groups.title')}
            subtitle={groupe.description || t('common.notAvailable')}
            badge={groupe.statut || 'GROUPE'}
            color="#38BDF8"
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewMyGroups')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentActivitiesCard({ activites, navigation, language, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.activities')}</Text>
        <Text style={styles.counter}>{activites.length}</Text>
      </View>
      {activites.length === 0 ? (
        <EmptyText text={t('referentDashboard.noActivities')} />
      ) : (
        activites.slice(0, 3).map((activite) => (
          <ListItem
            key={activite.id}
            title={activite.titre || t('navigation.activities')}
            subtitle={formatReferentDate(activite.dateDebut, activite.lieu, language, t)}
            badge={activite.statut || 'ACTIVITE'}
            color={statusColor(activite.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabActivities')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewMyActivities')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentProjectsCard({ projets, navigation, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.projects')}</Text>
        <Text style={styles.counter}>{projets.length}</Text>
      </View>
      {projets.length === 0 ? (
        <EmptyText text={t('referentDashboard.noProjects')} />
      ) : (
        projets.slice(0, 3).map((projet) => (
          <ListItem
            key={projet.id}
            title={projet.titre || t('navigation.projects')}
            subtitle={projet.groupeNom || t('referentDashboard.groupNotSpecified')}
            badge={projet.statut || 'PROJET'}
            color={statusColor(projet.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewProjects')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentNotificationsCard({ notifications, navigation, t }) {
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.notifications')}</Text>
        <Text style={styles.counter}>{t('notifications.unreadCount', { count: nonLues })}</Text>
      </View>
      {notifications.length === 0 ? (
        <EmptyText text={t('referentDashboard.noNotifications')} />
      ) : (
        notifications.slice(0, 3).map((notification) => (
          <ListItem
            key={notification.id}
            title={notification.titre || t('navigation.notifications')}
            subtitle={notification.message || ''}
            badge={notification.lue ? t('notifications.read') : t('notifications.unread')}
            color={notification.lue ? '#64748b' : '#38BDF8'}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabNotifications')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewNotifications')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentQuickActions({ navigation, t }) {
  return (
    <View style={styles.dashboardSection}>
      <DashboardSectionTitle
        title={t('referentDashboard.quickActions')}
        subtitle={t('referentDashboard.mobileDescription')}
      />
      <View style={styles.actionGrid}>
      <ActionCard
        label={t('referentMobile.requestsTitle')}
        description={t('referentMobile.requestsAction')}
        icon="warning"
        color="#d97706"
        onPress={() => navigation.navigate('ReferentRequestsAccess')}
        compact
      />
      <ActionCard
        label={t('referentMobile.membersTitle')}
        description={t('referentMobile.membersAction')}
        icon="group"
        color="#0f766e"
        onPress={() => navigation.navigate('ReferentMembersAccess')}
        compact
      />
      <ActionCard
        label={t('referentDashboard.openMessaging')}
        description={t('referentMobile.messagingAction')}
        icon="message"
        color={COLORS.info}
        onPress={() => navigateAccess(navigation, 'TabMessagerie')}
        compact
      />
      <ActionCard
        label={t('referentMobile.myGroupProjects')}
        description={t('referentMobile.projectsAction')}
        icon="project"
        color={COLORS.impactOrange}
        onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
        compact
      />
      </View>
    </View>
  );
}

function RoleDashboard({ user, role, isAdmin, isSuperAdmin, isPartenaire, dashboard, navigation, t, notice }) {
  const roleLabel = role ? t(`roles.${role}`) : t('memberDashboard.userFallback');
  const config = roleDashboardConfig({
    roleLabel,
    isAdmin,
    isSuperAdmin,
    isPartenaire,
    dashboard,
    navigation,
    t,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DashboardNotice text={notice} />
      <View style={styles.roleHero}>
        <View style={styles.roleBrandRow}>
          <Image
            source={require('../../assets/images/logo-bx-connect.png')}
            style={styles.brandLogoCompact}
            resizeMode="contain"
          />
          <Text style={styles.brandSlogan}>{t('brand.slogan')}</Text>
        </View>
        <View style={styles.roleHeroMain}>
          <Avatar prenom={user?.prenom} nom={user?.nom} size={46} color="rgba(255,255,255,0.18)" />
        <View style={styles.roleHeroText}>
            <Text style={styles.roleHeroTitle}>
              {t('memberDashboard.hello', {
                name: user?.prenom || t('memberDashboard.userFallback'),
              })}
            </Text>
          <Text style={styles.roleHeroMeta}>{roleLabel}</Text>
        </View>
        </View>
        <Text style={styles.roleHeroSubtitle} numberOfLines={2}>{config.subtitle}</Text>
      </View>

      {isPartenaire && dashboard?.profil ? (
        <PartnerInstitutionCard profile={dashboard.profil} t={t} />
      ) : null}

      <GlobalSearchAccess navigation={navigation} t={t} />

      {isPartenaire ? (
        <PartnerQuickAccess dashboard={dashboard} navigation={navigation} t={t} />
      ) : null}

      {isAdmin ? (
        <AdminModerationCard dashboard={dashboard} navigation={navigation} t={t} />
      ) : null}

      <DashboardSectionTitle title={config.title} />
      <View style={styles.metricGrid}>
        {config.stats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            color={stat.color}
            icon={stat.icon}
          />
        ))}
      </View>

      <DashboardSectionTitle title={config.sectionTitle} subtitle={config.sectionText} />
      <View style={styles.actionGrid}>
        {config.actions.map((action) => (
          <ActionCard
            key={action.label}
            label={action.label}
            description={action.description}
            icon={action.icon}
            color={action.color}
            onPress={action.onPress}
            compact
          />
        ))}
      </View>
    </ScrollView>
  );
}

function roleDashboardConfig({ roleLabel, isAdmin, isSuperAdmin, isPartenaire, dashboard, navigation, t }) {
  if (isSuperAdmin) {
    const stats = dashboard?.stats || {};
    return {
      title: t('superAdmin.mobile.title'),
      subtitle: t('superAdmin.mobile.subtitle'),
      sectionTitle: t('superAdmin.mobile.sectionTitle'),
      sectionText: t('superAdmin.mobile.sectionText'),
      stats: [
        stat(t('superAdmin.mobile.activeAdmins'), stats.adminsActifs ?? '—', 'shield', COLORS.success),
        stat(t('superAdmin.mobile.inactiveAdmins'), stats.adminsInactifs ?? '—', 'group', COLORS.info),
        stat(t('superAdmin.mobile.criticalActions'), stats.totalActionsCritiques ?? '—', 'lock', COLORS.impactOrange),
      ],
      actions: [
        action(t('navigation.users'), t('superAdmin.mobile.usersAction'), 'group', COLORS.info, () => navigateAccess(navigation, 'TabUsers')),
        action(t('superAdmin.logsTitle'), t('superAdmin.logsAction'), 'lock', COLORS.impactOrange, () => navigation.navigate('SuperAdminLogsAccess')),
        action(t('navigation.notifications'), t('superAdmin.mobile.notificationsAction'), 'bell', COLORS.impactOrange, () => navigateAccess(navigation, 'TabNotifications')),
        action(t('navigation.profile'), t('superAdmin.mobile.profileAction'), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
      ],
    };
  }

  if (isAdmin) {
    const stats = dashboard?.stats || {};
    const groupes = dashboard?.groupes || [];
    const groupesEnAttente = dashboard?.groupesEnAttente || [];
    const referents = dashboard?.referents || [];

    return {
      title: t('admin.mobile.title'),
      subtitle: t('admin.mobile.subtitle'),
      sectionTitle: t('admin.mobile.sectionTitle'),
      sectionText: t('admin.mobile.sectionText'),
      stats: [
        stat(t('navigation.users'), pickNumber(stats, ['utilisateurs', 'totalUtilisateurs', 'users', 'totalUsers']), 'group', COLORS.info),
        stat(t('navigation.activities'), pickNumber(stats, ['activites', 'totalActivites', 'activities', 'totalActivities']), 'activity', COLORS.success),
        stat(t('navigation.groups'), pickNumber(stats, ['groupes', 'totalGroupes', 'groups', 'totalGroups'], groupes.length), 'group', COLORS.bxBlue),
        stat(t('adminMobile.pendingGroups'), groupesEnAttente.length, 'warning', '#d97706'),
        stat(t('navigation.mentors'), referents.length, 'profile', '#0f766e'),
      ],
      actions: [
        action(t('adminMobile.referentsTitle'), t('adminMobile.referentsAction'), 'profile', '#0f766e', () => navigation.navigate('AdminReferentsAccess')),
        action(t('adminMobile.partnerSupportsTitle'), t('adminMobile.partnerSupportsAction'), 'wallet', COLORS.info, () => navigation.navigate('AdminPartnerSupportsAccess')),
        action(t('adminMobile.submittedProjects'), t('adminMobile.submittedProjectsAction'), 'project', COLORS.impactOrange, () => navigation.navigate('AdminSubmittedProjectsAccess')),
        action(t('adminMobile.opportunitiesTitle'), t('adminMobile.opportunitiesAction'), 'alert', '#d97706', () => navigation.navigate('AdminOpportunitiesAccess')),
        action(t('adminMobile.pendingGroupsTitle'), t('adminMobile.pendingGroupsAction'), 'warning', '#d97706', () => navigation.navigate('AdminPendingGroupsAccess')),
        action(t('navigation.users'), t('adminMobile.usersAction'), 'group', COLORS.info, () => navigateAccess(navigation, 'TabUsers')),
        action(t('navigation.groups'), t('adminMobile.groupsAction'), 'group', COLORS.bxBlue, () => navigateAccess(navigation, 'TabUsers', 'GroupesAccess')),
        action(t('navigation.activities'), t('adminMobile.activitiesAction'), 'activity', COLORS.success, () => navigateAccess(navigation, 'TabActivities')),
        action(t('navigation.projects'), t('adminMobile.projectsAction'), 'project', COLORS.impactOrange, () => navigateAccess(navigation, 'TabUsers', 'ProjectsAccess')),
        action(t('navigation.notifications'), t('admin.mobile.notificationsAction'), 'bell', COLORS.impactOrange, () => navigateAccess(navigation, 'TabNotifications')),
        action(t('navigation.profile'), t('admin.mobile.profileAction'), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
      ],
    };
  }

  if (isPartenaire) {
    const stats = dashboard?.stats || {};
    const soutiens = dashboard?.soutiens || [];

    return {
      title: t('partner.mobile.title'),
      subtitle: t('partner.mobile.subtitle'),
      sectionTitle: t('partner.mobile.sectionTitle'),
      sectionText: t('partner.mobile.sectionText'),
      stats: [
        stat(t('partner.projectsSupported'), pickNumber(stats, ['projetsSoutenus'], 0), 'project', COLORS.impactOrange),
        stat(t('partner.activitiesSupported'), pickNumber(stats, ['activitesSoutenues'], 0), 'activity', COLORS.success),
        stat(t('partner.totalSupports'), pickNumber(stats, ['totalSoutiens', 'soutiens'], soutiens.length), 'wallet', COLORS.info),
        stat(t('partner.totalAmount'), `${pickNumber(stats, ['totalMontant', 'montantTotal'], 0)} €`, 'payment', COLORS.bxBlue),
      ],
      actions: [
        action(t('partnerInstitution.profileTitle'), t('partnerInstitution.profileAction'), 'building', COLORS.bxBlue, () => navigation.navigate('PartnerProfileAccess')),
        action(t('partner.supports'), t('partner.supportsAction'), 'wallet', COLORS.info, () => navigateAccess(navigation, 'TabSupports', 'SupportsAccess')),
        action(t('partner.opportunities'), t('partner.opportunitiesAction'), 'alert', COLORS.impactOrange, () => navigateAccess(navigation, 'TabSupports', 'SupportsAccess', { tab: 'opportunities' })),
        action(t('partner.mobile.discoverProjects'), t('partner.mobile.discoverProjectsText'), 'project', COLORS.impactOrange, () => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')),
        action(t('partner.mobile.followInitiatives'), t('partner.mobile.followInitiativesText'), 'activity', COLORS.success, () => navigateAccess(navigation, 'TabActivities')),
        action(
          t('partner.mobile.contactTeam'),
          t('partner.mobile.contactTeamText'),
          'message',
          COLORS.info,
          () => Linking.openURL(`mailto:${PARTNER_CONTACT_EMAIL}?subject=Contact%20partenaire%20BX-Connect`).catch(() => {}),
        ),
      ],
    };
  }

  return {
    title: t('memberDashboard.mobileSpace'),
    subtitle: t('memberDashboard.mobileOverview'),
    sectionTitle: t('memberDashboard.status.title'),
    sectionText: roleLabel,
    stats: [
      stat(t('navigation.notifications'), 'Infos', 'bell', COLORS.info),
      stat(t('navigation.profile'), 'Compte', 'profile', COLORS.bxBlue),
    ],
    actions: [
      action(t('navigation.profile'), t('memberDashboard.openProfile'), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
    ],
  };
}

function settledData(result, fallback) {
  return result.status === 'fulfilled' ? (result.value.data ?? fallback) : fallback;
}

async function chargerDemandesAdhesionReferent(groupes) {
  if (!Array.isArray(groupes) || groupes.length === 0) return [];

  const results = await Promise.allSettled(
    groupes.map(async (groupe) => {
      const response = await api.get(`/referent/groupes/${groupe.id}/demandes`);
      return (response.data || []).map((demande) => ({
        ...demande,
        groupeId: groupe.id,
        groupeNom: groupe.nom,
      }));
    }),
  );

  return results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);
}

function allRejected(results) {
  return results.every(result => result.status === 'rejected');
}

function firstRejection(results) {
  return results.find(result => result.status === 'rejected')?.reason;
}

function DashboardNotice({ text }) {
  if (!text) return null;
  return (
    <View style={styles.noticeBox}>
      <AppIcon name="information-circle-outline" size={18} color="#1D4ED8" />
      <Text style={styles.dashboardNoticeText}>{text}</Text>
    </View>
  );
}

function GlobalSearchAccess({ navigation, t }) {
  return (
    <TouchableOpacity
      style={styles.searchAccessCard}
      onPress={() => navigation.navigate('GlobalSearch')}
      activeOpacity={0.82}
      accessibilityRole="button"
    >
      <View style={styles.searchAccessIcon}>
        <AppIcon name="search" size={20} color={COLORS.info} />
      </View>
      <View style={styles.searchAccessText}>
        <Text style={styles.searchAccessTitle}>{t('search.title')}</Text>
        <Text style={styles.searchAccessSubtitle} numberOfLines={1}>
          {t('search.startText')}
        </Text>
      </View>
      <AppIcon name="chevron-forward" size={18} color="#64748b" />
    </TouchableOpacity>
  );
}

function PartnerInstitutionCard({ profile, t }) {
  return (
    <View style={styles.partnerInstitutionCard}>
      {profile.logoUrl ? (
        <Image source={{ uri: profile.logoUrl }} style={styles.partnerLogo} resizeMode="contain" />
      ) : (
        <View style={styles.partnerLogoFallback}>
          <AppIcon name="building" size={25} color={COLORS.impactOrange} />
        </View>
      )}
      <View style={styles.partnerInstitutionText}>
        <Text style={styles.partnerInstitutionName} numberOfLines={2}>
          {profile.nomOrganisation}
        </Text>
        <Text style={styles.partnerInstitutionType}>
          {t(`partner.types.${profile.typePartenaire || 'AUTRE'}`)}
        </Text>
        {profile.personneContact ? (
          <Text style={styles.partnerInstitutionContact} numberOfLines={1}>
            {t('partner.contactPerson')} : {profile.personneContact}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function pickNumber(source, keys, fallback = 0) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

function stat(label, value, icon, color) {
  return { label, value, icon, color };
}

function action(label, description, icon, color, onPress) {
  return { label, description, icon, color, onPress };
}

function navigateAccess(navigation, tabName, stackRoute, params) {
  const parent = navigation.getParent?.();
  const parentRoutes = parent?.getState?.()?.routeNames || [];

  if (parentRoutes.includes(tabName)) {
    if (['TabProjects', 'TabSupports'].includes(tabName)) {
      parent.navigate(tabName, params ? { screen: 'Main', params } : undefined);
      return;
    }
    parent.navigate(tabName, stackRoute ? { screen: stackRoute, params } : undefined);
    return;
  }

  if (stackRoute) {
    navigation.navigate(stackRoute, params);
  }
}

function WelcomeCard({ user, role, t }) {
  const roleLabel = t(`roles.${role}`);

  return (
    <View style={styles.welcomeCard}>
      <View style={styles.roleBrandRow}>
        <Image
          source={require('../../assets/images/logo-bx-connect.png')}
          style={styles.brandLogoCompact}
          resizeMode="contain"
        />
        <Text style={styles.brandSlogan}>{t('brand.slogan')}</Text>
      </View>
      <View style={styles.welcomeMain}>
        <Avatar prenom={user?.prenom} nom={user?.nom} size={46} color="rgba(255,255,255,0.18)" />
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>
            {t('memberDashboard.hello', { name: user?.prenom || t('memberDashboard.memberFallback') })}
          </Text>
          <Text style={styles.welcomeRole}>{roleLabel}</Text>
          <Text style={styles.welcomeSubtitle}>{t('memberDashboard.welcome')}</Text>
        </View>
      </View>
    </View>
  );
}

function DashboardSectionTitle({ title, subtitle }) {
  return (
    <View style={styles.dashboardSectionTitle}>
      <Text style={styles.dashboardSectionHeading}>{title}</Text>
      {subtitle ? <Text style={styles.dashboardSectionSubtitle}>{subtitle}</Text> : null}
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
          onPress={() => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess')}
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
        onPress={() => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess')}
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
        onPress={() => navigateAccess(navigation, 'TabActivities')}
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
            color={notification.lue ? '#64748b' : '#38BDF8'}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabNotifications')}
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
        onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
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
        onPress: () => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess'),
      },
      {
        label: t('memberDashboard.nextActions.discoverActivities'),
        description: t('memberDashboard.nextActions.discoverActivitiesDescription'),
        onPress: () => navigateAccess(navigation, 'TabActivities'),
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
        onPress: () => navigateAccess(navigation, 'TabActivities'),
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
      onPress: () => navigateAccess(navigation, 'TabActivities'),
    },
    {
      label: messagerieDisponible ? t('memberDashboard.nextActions.useMessaging') : t('memberDashboard.nextActions.messagingUnavailable'),
      description: messagerieDisponible ? t('memberDashboard.nextActions.useMessagingDescription') : t('memberDashboard.nextActions.messagingUnavailableDescription'),
      onPress: messagerieDisponible ? () => navigateAccess(navigation, 'TabMessagerie') : null,
    },
    {
      label: hasProjects ? t('memberDashboard.nextActions.trackProjects') : t('memberDashboard.nextActions.proposeProject'),
      description: hasProjects ? t('memberDashboard.nextActions.trackProjectsDescription') : t('memberDashboard.nextActions.proposeProjectDescription'),
      onPress: () => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess'),
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

function statutInfo(statut, t) {
  if (statut === 'ACCEPTE') {
    return {
      label: t('memberDashboard.status.acceptedLabel'),
      description: t('memberDashboard.status.acceptedMessagingAvailable'),
      color: '#22C55E',
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
    color: '#38BDF8',
    bg: '#E0F2FE',
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
  return t(`memberDashboard.statuses.subscription.${statut}`);
}

function translateProjet(statut, t) {
  return t(`memberDashboard.statuses.project.${statut}`);
}

function statusColor(statut) {
  switch (statut) {
    case 'CONFIRMEE':
    case 'APPROUVE':
    case 'ACCEPTE':
      return '#22C55E';
    case 'EN_ATTENTE':
    case 'EN_ATTENTE_PAIEMENT':
    case 'SOUMIS':
      return '#d97706';
    case 'EN_COURS':
      return '#38BDF8';
    case 'ANNULEE':
    case 'REJETE':
    case 'REFUSE':
      return '#EF4444';
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

function formatReferentDate(dateStr, lieu, language, t) {
  const fragments = [];
  if (dateStr) {
    fragments.push(new Date(dateStr).toLocaleDateString(language || 'fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }));
  }
  if (lieu) fragments.push(lieu);
  return fragments.length > 0 ? fragments.join(' · ') : t('activities.to_confirm');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 12, paddingBottom: 24 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  dashboardNoticeText: { flex: 1, color: '#1E40AF', fontSize: 12, lineHeight: 17 },
  searchAccessCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 11,
    marginBottom: 12,
  },
  searchAccessIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  searchAccessText: { flex: 1, minWidth: 0 },
  searchAccessTitle: { color: '#1E3A8A', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  searchAccessSubtitle: { color: '#64748b', fontSize: 11, lineHeight: 15, marginTop: 1 },
  errorTitle: { color: '#1E3A8A', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  welcomeCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  welcomeMain: { flexDirection: 'row', alignItems: 'center' },
  welcomeContent: { flex: 1, marginLeft: 11 },
  welcomeTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 1, lineHeight: 22 },
  welcomeRole: { color: '#fff', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  welcomeSubtitle: { color: '#BAE6FD', fontSize: 11, lineHeight: 15 },
  roleHero: {
    backgroundColor: '#1E3A8A',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  roleBrandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  brandLogoCompact: { width: 104, height: 30, marginRight: 8 },
  brandSlogan: { flex: 1, color: '#BAE6FD', fontSize: 9, textAlign: 'right' },
  roleHeroMain: { flexDirection: 'row', alignItems: 'center' },
  roleHeroText: { flex: 1, marginLeft: 11 },
  roleHeroTitle: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22, marginBottom: 4 },
  roleHeroSubtitle: { color: '#DBEAFE', fontSize: 11, lineHeight: 16, marginTop: 9 },
  roleHeroMeta: {
    alignSelf: 'flex-start',
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  partnerInstitutionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff',
    padding: 13,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerLogo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffedd5',
    backgroundColor: '#fff',
  },
  partnerLogoFallback: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
  },
  partnerInstitutionText: { flex: 1 },
  partnerInstitutionName: { color: '#1E3A8A', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  partnerInstitutionType: { color: COLORS.impactOrange, fontSize: 11, fontWeight: '900', marginTop: 3 },
  partnerInstitutionContact: { color: '#64748b', fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 0,
    borderLeftColor: '#e2e8f0',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A', marginBottom: 7, lineHeight: 21 },
  cardText: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 8 },
  cardHint: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricValue: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  metricLabel: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  counter: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  priorityCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minWidth: '31%',
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  priorityIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  priorityCount: { fontSize: 20, lineHeight: 24, fontWeight: '900' },
  priorityLabel: { color: '#334155', fontSize: 11, lineHeight: 14, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  groupImage: {
    width: '100%',
    height: 104,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  groupBanner: {
    height: 96,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupBannerText: { color: '#1E3A8A', fontSize: 36, fontWeight: '900' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { color: '#64748b', fontSize: 12 },
  infoValue: { color: '#1E3A8A', fontSize: 12, fontWeight: '700', maxWidth: '58%', textAlign: 'right' },
  primaryButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  secondaryButton: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { color: '#38BDF8', fontWeight: '800', fontSize: 13 },
  notice: { borderRadius: 10, padding: 10, marginTop: 10 },
  noticeOk: { backgroundColor: '#dcfce7' },
  noticeMuted: { backgroundColor: '#f1f5f9' },
  noticeText: { color: '#334155', fontSize: 12, lineHeight: 17 },
  emptyBox: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#eef2f7' },
  emptyIcon: { fontSize: 34, color: '#EF4444', marginBottom: 10 },
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
  listTitle: { color: '#1E3A8A', fontSize: 14, fontWeight: '900', marginBottom: 3 },
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
    borderColor: '#38BDF8',
    marginTop: 4,
    marginRight: 10,
  },
  actionDotDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  actionTextWrap: { flex: 1 },
  actionLabel: { color: '#1E3A8A', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  actionDescription: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  dashboardSection: { marginBottom: 8 },
  dashboardSectionTitle: { marginTop: 2, marginBottom: 8, paddingHorizontal: 2 },
  dashboardSectionHeading: { color: '#1E3A8A', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  dashboardSectionSubtitle: { color: '#64748b', fontSize: 11, lineHeight: 15, marginTop: 2 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
});
