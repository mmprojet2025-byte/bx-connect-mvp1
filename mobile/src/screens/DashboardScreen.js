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

const PARTNER_CONTACT_EMAIL = 'contact@bxconnect.be';

export default function DashboardScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, isMembre, isReferent, isAdmin, isSuperAdmin, isPartenaire, role } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [referentDashboard, setReferentDashboard] = useState(null);
  const [roleDashboard, setRoleDashboard] = useState(null);
  const [loading, setLoading] = useState(isMembre || isReferent || isAdmin || isPartenaire);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isMembre) {
      chargerDashboard();
    } else if (isReferent) {
      chargerReferentDashboard();
    } else if (isAdmin) {
      chargerAdminDashboard();
    } else if (isPartenaire) {
      chargerPartenaireDashboard();
    } else {
      setLoading(false);
    }
  }, [isMembre, isReferent, isAdmin, isPartenaire]);

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

  const chargerReferentDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, groupesRes, notificationsRes] = await Promise.all([
        api.get('/referent/dashboard'),
        api.get('/referent/groupes'),
        api.get('/notifications').catch(() => ({ data: [] })),
      ]);
      setReferentDashboard({
        ...dashboardRes.data,
        groupes: groupesRes.data || [],
        notifications: notificationsRes.data || [],
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setError(t('memberDashboard.errorForbidden'));
      } else {
        setError(t('referentDashboard.errorLoad', { defaultValue: 'Impossible de charger le dashboard référent.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerAdminDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, groupesRes, groupesAttenteRes, referentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/groupes'),
        api.get('/admin/groupes/en-attente'),
        api.get('/admin/referents'),
      ]);
      setRoleDashboard({
        type: 'ADMIN',
        stats: statsRes.data || {},
        groupes: groupesRes.data || [],
        groupesEnAttente: groupesAttenteRes.data || [],
        referents: referentsRes.data || [],
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setError(t('errors.forbidden'));
      } else {
        setError(t('adminMobile.dashboardLoadError', { defaultValue: 'Impossible de charger le dashboard administrateur.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const chargerPartenaireDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, soutiensRes, projetsRes, activitesRes, profilRes] = await Promise.all([
        api.get('/partenaire/statistiques'),
        api.get('/partenaire/mes-soutiens'),
        api.get('/partenaire/projets-ouverts'),
        api.get('/partenaire/activites-ouvertes'),
        api.get('/partenaire/profil'),
      ]);
      setRoleDashboard({
        type: 'PARTENAIRE',
        stats: statsRes.data || {},
        soutiens: soutiensRes.data || [],
        projetsOuverts: projetsRes.data || [],
        activitesOuvertes: activitesRes.data || [],
        profil: profilRes.data || null,
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('errors.session_expired'));
      } else if (err.response?.status === 403) {
        setError(t('errors.forbidden'));
      } else {
        setError(t('partner.dashboardLoadError', { defaultValue: 'Impossible de charger le dashboard partenaire.' }));
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
            <Text style={styles.loadingText}>Chargement de l’espace référent...</Text>
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
          user={user}
          dashboard={referentDashboard}
          navigation={navigation}
          t={t}
          language={i18n.language}
        />
      );
    }

    if ((isAdmin || isPartenaire) && loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    if ((isAdmin || isPartenaire) && error) {
      return (
        <View style={styles.centered}>
          <AppIcon name="warning" size={42} color="#EF4444" style={styles.emptyIcon} />
          <Text style={styles.errorTitle}>{t('memberDashboard.unavailableTitle')}</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isAdmin ? chargerAdminDashboard : chargerPartenaireDashboard}
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

function ReferentDashboard({ user, dashboard, navigation, t, language }) {
  const groupes = dashboard?.groupes || [];
  const activites = dashboard?.mesActivites || [];
  const projets = dashboard?.projetsSoumisListe || [];
  const notifications = dashboard?.notifications || [];
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WelcomeCard user={user} role="REFERENT" t={t} />

      <DashboardSectionTitle
        title={t('referentDashboard.mobileTitle', { defaultValue: 'Mon espace référent' })}
        subtitle={t('referentDashboard.mobileDescription', {
          defaultValue: 'Suivez vos groupes, activités et projets en un coup d’œil.',
        })}
      />

      <View style={styles.metricGrid}>
        <MetricCard label={t('referentDashboard.assignedGroups', { defaultValue: 'Groupes assignés' })} value={groupes.length} color="#38BDF8" icon="group" />
        <MetricCard label={t('navigation.activities', { defaultValue: 'Activités' })} value={dashboard?.totalActivites ?? activites.length} color="#0f766e" icon="activity" />
        <MetricCard label={t('navigation.projects', { defaultValue: 'Projets' })} value={dashboard?.projetsSoumis ?? projets.length} color="#7c3aed" icon="project" />
        <MetricCard label={t('referentDashboard.unreadNotifications', { defaultValue: 'Notifications non lues' })} value={nonLues} color="#d97706" icon="bell" />
      </View>

      <ReferentGroupsCard groupes={groupes} navigation={navigation} t={t} />
      <ReferentActivitiesCard activites={activites} navigation={navigation} language={language} t={t} />
      <ReferentProjectsCard projets={projets} navigation={navigation} t={t} />
      <ReferentNotificationsCard notifications={notifications} navigation={navigation} t={t} />
      <ReferentQuickActions navigation={navigation} t={t} />
    </ScrollView>
  );
}

function MetricCard({ label, value, color, icon }) {
  return <StatCard label={label} value={value} color={color} icon={icon} />;
}

function ReferentGroupsCard({ groupes, navigation, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('referentDashboard.assignedGroups', { defaultValue: 'Groupes assignés' })}</Text>
        <Text style={styles.counter}>{groupes.length}</Text>
      </View>
      {groupes.length === 0 ? (
        <EmptyText text={t('referentDashboard.noAssignedGroups', { defaultValue: 'Aucun groupe assigné pour le moment.' })} />
      ) : (
        groupes.slice(0, 3).map((groupe) => (
          <ListItem
            key={groupe.id}
            title={groupe.nom || t('groups.title', { defaultValue: 'Groupe' })}
            subtitle={groupe.description || t('common.notAvailable', { defaultValue: 'Description non disponible' })}
            badge={groupe.statut || 'GROUPE'}
            color="#38BDF8"
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewMyGroups', { defaultValue: 'Voir mes groupes' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentActivitiesCard({ activites, navigation, language, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.activities', { defaultValue: 'Activités' })}</Text>
        <Text style={styles.counter}>{activites.length}</Text>
      </View>
      {activites.length === 0 ? (
        <EmptyText text={t('referentDashboard.noActivities', { defaultValue: 'Aucune activité référent pour le moment.' })} />
      ) : (
        activites.slice(0, 3).map((activite) => (
          <ListItem
            key={activite.id}
            title={activite.titre || t('navigation.activities', { defaultValue: 'Activité' })}
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
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewMyActivities', { defaultValue: 'Voir mes activités' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentProjectsCard({ projets, navigation, t }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.projects', { defaultValue: 'Projets' })}</Text>
        <Text style={styles.counter}>{projets.length}</Text>
      </View>
      {projets.length === 0 ? (
        <EmptyText text={t('referentDashboard.noProjects', { defaultValue: 'Aucun projet dans vos groupes pour le moment.' })} />
      ) : (
        projets.slice(0, 3).map((projet) => (
          <ListItem
            key={projet.id}
            title={projet.titre || t('navigation.projects', { defaultValue: 'Projet' })}
            subtitle={projet.groupeNom || t('referentDashboard.groupNotSpecified', { defaultValue: 'Groupe non précisé' })}
            badge={projet.statut || 'PROJET'}
            color={statusColor(projet.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewProjects', { defaultValue: 'Voir les projets' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentNotificationsCard({ notifications, navigation, t }) {
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t('navigation.notifications', { defaultValue: 'Notifications' })}</Text>
        <Text style={styles.counter}>{t('referentDashboard.unreadCount', { count: nonLues, defaultValue: `${nonLues} non lue(s)` })}</Text>
      </View>
      {notifications.length === 0 ? (
        <EmptyText text={t('referentDashboard.noNotifications', { defaultValue: 'Aucune notification pour le moment.' })} />
      ) : (
        notifications.slice(0, 3).map((notification) => (
          <ListItem
            key={notification.id}
            title={notification.titre || t('navigation.notifications', { defaultValue: 'Notification' })}
            subtitle={notification.message || ''}
            badge={notification.lue ? t('notifications.read', { defaultValue: 'Lue' }) : t('notifications.unread', { defaultValue: 'Nouvelle' })}
            color={notification.lue ? '#64748b' : '#38BDF8'}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigateAccess(navigation, 'TabNotifications')}
      >
        <Text style={styles.secondaryButtonText}>{t('referentDashboard.viewNotifications', { defaultValue: 'Voir les notifications' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReferentQuickActions({ navigation, t }) {
  return (
    <View style={styles.dashboardSection}>
      <DashboardSectionTitle
        title={t('referentDashboard.quickActions', { defaultValue: 'Accès rapides' })}
        subtitle={t('referentDashboard.mobileDescription', {
          defaultValue: 'Les outils essentiels de vos groupes.',
        })}
      />
      <View style={styles.actionGrid}>
      <ActionCard
        label={t('referentMobile.requestsTitle', { defaultValue: 'Demandes d’adhésion' })}
        description={t('referentMobile.requestsAction', { defaultValue: 'Accepter ou refuser les demandes de vos groupes.' })}
        icon="warning"
        color="#d97706"
        onPress={() => navigation.navigate('ReferentRequestsAccess')}
        compact
      />
      <ActionCard
        label={t('referentMobile.membersTitle', { defaultValue: 'Membres des groupes' })}
        description={t('referentMobile.membersAction', { defaultValue: 'Consulter les membres acceptés de vos groupes.' })}
        icon="group"
        color="#0f766e"
        onPress={() => navigation.navigate('ReferentMembersAccess')}
        compact
      />
      <ActionCard
        label={t('referentDashboard.openMessaging', { defaultValue: 'Ouvrir la messagerie' })}
        description={t('referentMobile.messagingAction', { defaultValue: 'Échanger avec les groupes que vous encadrez.' })}
        icon="message"
        color={COLORS.info}
        onPress={() => navigateAccess(navigation, 'TabMessagerie')}
        compact
      />
      <ActionCard
        label={t('referentDashboard.viewProjects', { defaultValue: 'Consulter les projets' })}
        description={t('referentMobile.projectsAction', { defaultValue: 'Voir les projets liés à vos groupes.' })}
        icon="project"
        color={COLORS.impactOrange}
        onPress={() => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')}
        compact
      />
      </View>
    </View>
  );
}

function RoleDashboard({ user, role, isAdmin, isSuperAdmin, isPartenaire, dashboard, navigation, t }) {
  const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : t('memberDashboard.userFallback');
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
      <View style={styles.roleHero}>
        <View style={styles.roleBrandRow}>
          <View style={styles.brandIcon}>
            <AppIcon name="group" size={17} color="#fff" />
          </View>
          <Text style={styles.brandName}>BX-CONNECT</Text>
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
    return {
      title: t('superAdmin.mobile.title', { defaultValue: 'Pilotage plateforme' }),
      subtitle: t('superAdmin.mobile.subtitle', { defaultValue: 'Indicateurs essentiels et suivi de la sécurité BX-Connect.' }),
      sectionTitle: t('superAdmin.mobile.sectionTitle', { defaultValue: 'Vue synthétique' }),
      sectionText: t('superAdmin.mobile.sectionText', { defaultValue: 'Suivez les comptes clés, les administrateurs et les signaux importants de la plateforme.' }),
      stats: [
        stat(t('users.title', { defaultValue: 'Utilisateurs' }), 'Suivi', 'group', COLORS.info),
        stat(t('superAdmin.admins', { defaultValue: 'Administrateurs' }), 'Admin', 'shield', COLORS.bxBlue),
        stat(t('navigation.notifications', { defaultValue: 'Notifications' }), 'Alertes', 'bell', COLORS.impactOrange),
        stat(t('profile.security', { defaultValue: 'Sécurité' }), 'Actif', 'lock', COLORS.success),
      ],
      actions: [
        action(t('navigation.users', { defaultValue: 'Utilisateurs' }), t('superAdmin.mobile.usersAction', { defaultValue: 'Consulter les administrateurs plateforme.' }), 'group', COLORS.info, () => navigateAccess(navigation, 'TabUsers')),
        action(t('navigation.notifications', { defaultValue: 'Notifications' }), t('superAdmin.mobile.notificationsAction', { defaultValue: 'Consulter les alertes importantes.' }), 'bell', COLORS.impactOrange, () => navigateAccess(navigation, 'TabNotifications')),
        action(t('navigation.profile', { defaultValue: 'Profil' }), t('superAdmin.mobile.profileAction', { defaultValue: 'Gérer vos informations et votre sécurité.' }), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
      ],
    };
  }

  if (isAdmin) {
    const stats = dashboard?.stats || {};
    const groupes = dashboard?.groupes || [];
    const groupesEnAttente = dashboard?.groupesEnAttente || [];
    const referents = dashboard?.referents || [];

    return {
      title: t('admin.mobile.title', { defaultValue: 'Tableau de bord administrateur' }),
      subtitle: t('admin.mobile.subtitle', { defaultValue: 'Pilotage mobile : consultez les indicateurs essentiels et suivez l’activité de la plateforme.' }),
      sectionTitle: t('admin.mobile.sectionTitle', { defaultValue: 'Pilotage rapide' }),
      sectionText: t('admin.mobile.sectionText', { defaultValue: 'Gardez une vue claire sur les utilisateurs, groupes, activités et projets de BX-Jeunes Impact.' }),
      stats: [
        stat(t('navigation.users', { defaultValue: 'Utilisateurs' }), pickNumber(stats, ['utilisateurs', 'totalUtilisateurs', 'users', 'totalUsers']), 'group', COLORS.info),
        stat(t('navigation.activities', { defaultValue: 'Activités' }), pickNumber(stats, ['activites', 'totalActivites', 'activities', 'totalActivities']), 'activity', COLORS.success),
        stat(t('navigation.groups', { defaultValue: 'Groupes' }), pickNumber(stats, ['groupes', 'totalGroupes', 'groups', 'totalGroups'], groupes.length), 'group', COLORS.bxBlue),
        stat(t('adminMobile.pendingGroups', { defaultValue: 'Groupes en attente' }), groupesEnAttente.length, 'warning', '#d97706'),
        stat(t('navigation.mentors', { defaultValue: 'Référents' }), referents.length, 'profile', '#0f766e'),
      ],
      actions: [
        action(t('navigation.users', { defaultValue: 'Utilisateurs' }), t('adminMobile.usersAction', { defaultValue: 'Consulter les comptes métier.' }), 'group', COLORS.info, () => navigateAccess(navigation, 'TabUsers')),
        action(t('navigation.groups', { defaultValue: 'Groupes' }), t('adminMobile.groupsAction', { defaultValue: 'Suivre les groupes et leurs référents.' }), 'group', COLORS.bxBlue, () => navigateAccess(navigation, 'TabGroupes', 'GroupesAccess')),
        action(t('adminMobile.pendingGroupsTitle', { defaultValue: 'Groupes en attente' }), t('adminMobile.pendingGroupsAction', { defaultValue: 'Valider ou refuser les groupes proposés.' }), 'warning', '#d97706', () => navigation.navigate('AdminPendingGroupsAccess')),
        action(t('navigation.activities', { defaultValue: 'Activités' }), t('adminMobile.activitiesAction', { defaultValue: 'Voir les activités de l’association.' }), 'activity', COLORS.success, () => navigateAccess(navigation, 'TabActivities')),
        action(t('navigation.projects', { defaultValue: 'Projets' }), t('adminMobile.projectsAction', { defaultValue: 'Voir les projets suivis par l’association.' }), 'project', COLORS.impactOrange, () => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')),
        action(t('navigation.notifications', { defaultValue: 'Notifications' }), t('admin.mobile.notificationsAction', { defaultValue: 'Suivre les alertes et demandes importantes.' }), 'bell', COLORS.impactOrange, () => navigateAccess(navigation, 'TabNotifications')),
        action(t('navigation.profile', { defaultValue: 'Profil' }), t('admin.mobile.profileAction', { defaultValue: 'Mettre à jour vos informations et préférences.' }), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
      ],
    };
  }

  if (isPartenaire) {
    const stats = dashboard?.stats || {};
    const soutiens = dashboard?.soutiens || [];

    return {
      title: t('partner.mobile.title', { defaultValue: 'Espace partenaire' }),
      subtitle: t('partner.mobile.subtitle', { defaultValue: 'Découvrez les initiatives, suivez les projets et restez connecté à la communauté.' }),
      sectionTitle: t('partner.mobile.sectionTitle', { defaultValue: 'Initiatives à suivre' }),
      sectionText: t('partner.mobile.sectionText', { defaultValue: 'Une vue claire pour soutenir les projets, suivre les activités et collaborer avec BX-Jeunes Impact.' }),
      stats: [
        stat(t('partner.projectsSupported', { defaultValue: 'Projets soutenus' }), pickNumber(stats, ['projetsSoutenus'], 0), 'project', COLORS.impactOrange),
        stat(t('partner.activitiesSupported', { defaultValue: 'Activités soutenues' }), pickNumber(stats, ['activitesSoutenues'], 0), 'activity', COLORS.success),
        stat(t('partner.totalSupports', { defaultValue: 'Soutiens' }), pickNumber(stats, ['totalSoutiens', 'soutiens'], soutiens.length), 'wallet', COLORS.info),
        stat(t('partner.totalAmount', { defaultValue: 'Montant total' }), `${pickNumber(stats, ['totalMontant', 'montantTotal'], 0)} €`, 'payment', COLORS.bxBlue),
      ],
      actions: [
        action(t('partner.mobile.discoverProjects', { defaultValue: 'Découvrir les projets' }), t('partner.mobile.discoverProjectsText', { defaultValue: 'Explorer les initiatives portées par les jeunes.' }), 'project', COLORS.impactOrange, () => navigateAccess(navigation, 'TabProjects', 'ProjectsAccess')),
        action(t('partner.mobile.followInitiatives', { defaultValue: 'Suivre les initiatives' }), t('partner.mobile.followInitiativesText', { defaultValue: 'Voir les activités et temps forts de la communauté.' }), 'activity', COLORS.success, () => navigateAccess(navigation, 'TabActivities')),
        action(t('partner.supports', { defaultValue: 'Mes soutiens' }), t('partner.supportsAction', { defaultValue: 'Consulter les soutiens déclarés.' }), 'wallet', COLORS.info, () => navigateAccess(navigation, 'TabSupports', 'SupportsAccess')),
        action(
          t('partner.mobile.contactTeam', { defaultValue: 'Contacter l’équipe' }),
          t('partner.mobile.contactTeamText', { defaultValue: `Écrire à ${PARTNER_CONTACT_EMAIL}.` }),
          'message',
          COLORS.info,
          () => Linking.openURL(`mailto:${PARTNER_CONTACT_EMAIL}?subject=Contact%20partenaire%20BX-Connect`).catch(() => {}),
        ),
      ],
    };
  }

  return {
    title: t('memberDashboard.mobileSpace', { defaultValue: 'Espace mobile' }),
    subtitle: t('memberDashboard.mobileOverview', { defaultValue: 'Vue synthétique de votre espace BX-Connect.' }),
    sectionTitle: t('memberDashboard.status.title', { defaultValue: 'Indicateurs essentiels' }),
    sectionText: roleLabel,
    stats: [
      stat(t('navigation.notifications', { defaultValue: 'Notifications' }), 'Infos', 'bell', COLORS.info),
      stat(t('navigation.profile', { defaultValue: 'Profil' }), 'Compte', 'profile', COLORS.bxBlue),
    ],
    actions: [
      action(t('navigation.profile', { defaultValue: 'Profil' }), t('memberDashboard.openProfile', { defaultValue: 'Ouvrir mon profil' }), 'profile', COLORS.info, () => navigateAccess(navigation, 'TabProfile')),
    ],
  };
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
          {t(`partner.types.${profile.typePartenaire || 'AUTRE'}`, { defaultValue: profile.typePartenaire || 'Partenaire' })}
        </Text>
        {profile.personneContact ? (
          <Text style={styles.partnerInstitutionContact} numberOfLines={1}>
            {t('partner.contactPerson', { defaultValue: 'Contact' })} : {profile.personneContact}
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

function navigateAccess(navigation, tabName, stackRoute) {
  const parent = navigation.getParent?.();
  const parentRoutes = parent?.getState?.()?.routeNames || [];

  if (parentRoutes.includes(tabName)) {
    parent.navigate(tabName);
    return;
  }

  if (stackRoute) {
    navigation.navigate(stackRoute);
  }
}

function WelcomeCard({ user, role, t }) {
  const roleLabel = t(`roles.${role}`, { defaultValue: role });

  return (
    <View style={styles.welcomeCard}>
      <View style={styles.roleBrandRow}>
        <View style={styles.brandIcon}>
          <AppIcon name="group" size={17} color="#fff" />
        </View>
        <Text style={styles.brandName}>BX-CONNECT</Text>
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
  return fragments.length > 0 ? fragments.join(' · ') : t('activities.to_confirm', { defaultValue: 'Date à confirmer' });
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
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  brandName: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0 },
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
