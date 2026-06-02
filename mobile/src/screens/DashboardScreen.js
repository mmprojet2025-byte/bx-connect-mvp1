import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function DashboardScreen({ navigation }) {
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
        setError('Session expirée. Reconnectez-vous.');
      } else if (err.response?.status === 403) {
        setError('Accès non autorisé au dashboard membre.');
      } else {
        setError(err.response?.data?.message || 'Impossible de charger votre dashboard.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isMembre) {
    return <RoleDashboard user={user} role={role} navigation={navigation} />;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={styles.loadingText}>Chargement de votre espace...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>!</Text>
        <Text style={styles.errorTitle}>Dashboard indisponible</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={chargerDashboard}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
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
      <WelcomeCard user={user} />
      <MemberStatusCard statut={adhesion} />
      <MemberGroupCard
        groupe={groupe}
        messagerieDisponible={messagerieDisponible}
        navigation={navigation}
      />
      <MemberReferentCard referent={referent} statut={adhesion} />
      <MemberActivitiesCard inscriptions={inscriptions} navigation={navigation} />
      <MemberNotificationsCard notifications={notifications} navigation={navigation} />
      <MemberProjectsCard projets={projets} navigation={navigation} />
      <MemberNextActions
        statut={adhesion}
        hasActivities={inscriptions.length > 0}
        hasProjects={projets.length > 0}
        messagerieDisponible={messagerieDisponible}
        navigation={navigation}
      />
    </ScrollView>
  );
}

function RoleDashboard({ user, role, navigation }) {
  const roleLabel = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role || 'Utilisateur';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WelcomeCard user={user} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Espace mobile V1</Text>
        <Text style={styles.cardText}>
          Vous êtes connecté avec le rôle {roleLabel}. Sur mobile V1, cet espace reste volontairement limité.
        </Text>
        <Text style={styles.cardHint}>
          La gestion avancée se fait depuis le back-office web.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.getParent()?.navigate('TabProfile')}
      >
        <Text style={styles.primaryButtonText}>Ouvrir mon profil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function WelcomeCard({ user }) {
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {initiales(user?.prenom, user?.nom)}
        </Text>
      </View>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Bonjour, {user?.prenom || 'membre'}</Text>
        <Text style={styles.welcomeSubtitle}>Votre espace BX-Connect</Text>
      </View>
    </View>
  );
}

function MemberStatusCard({ statut }) {
  const info = statutInfo(statut);

  return (
    <View style={[styles.card, { borderLeftColor: info.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Mon statut</Text>
        <View style={[styles.badge, { backgroundColor: info.bg }]}>
          <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>
      <Text style={styles.cardText}>{info.description}</Text>
    </View>
  );
}

function MemberGroupCard({ groupe, messagerieDisponible, navigation }) {
  if (!groupe) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon groupe</Text>
        <EmptyText text="Vous n'avez pas encore de groupe actif." />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.getParent()?.navigate('TabGroupes')}
        >
          <Text style={styles.primaryButtonText}>Découvrir les groupes</Text>
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
      <InfoRow label="Statut" value={translateAdhesion(groupe.statutAdhesion)} />
      <InfoRow label="Membres" value={`${groupe.nombreMembres || 0}`} />
      <InfoRow label="Activités à venir" value={`${groupe.nombreActivitesAVenir || 0}`} />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.getParent()?.navigate('TabGroupes')}
      >
        <Text style={styles.primaryButtonText}>Ouvrir mon groupe</Text>
      </TouchableOpacity>
      <View style={[styles.notice, messagerieDisponible ? styles.noticeOk : styles.noticeMuted]}>
        <Text style={styles.noticeText}>
          {messagerieDisponible
            ? 'Messagerie disponible pour votre groupe.'
            : 'Messagerie disponible après acceptation dans un groupe.'}
        </Text>
      </View>
    </View>
  );
}

function MemberReferentCard({ referent, statut }) {
  if (!referent || statut !== 'ACCEPTE') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon référent</Text>
        <EmptyText text="Le référent sera affiché lorsque votre adhésion sera acceptée." />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mon référent</Text>
      <InfoRow label="Nom" value={`${referent.prenom || ''} ${referent.nom || ''}`.trim()} />
      <InfoRow label="Email" value={referent.email || 'Non renseigné'} />
    </View>
  );
}

function MemberActivitiesCard({ inscriptions, navigation }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Mes activités</Text>
        <Text style={styles.counter}>{inscriptions.length}</Text>
      </View>
      {inscriptions.length === 0 ? (
        <EmptyText text="Aucune inscription pour le moment." />
      ) : (
        inscriptions.slice(0, 3).map((inscription) => (
          <ListItem
            key={inscription.id}
            title={inscription.activiteTitre || 'Activité'}
            subtitle={formatDate(inscription.activiteDateDebut, inscription.activiteLieu)}
            badge={translateInscription(inscription.statut)}
            color={statusColor(inscription.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabActivities')}
      >
        <Text style={styles.secondaryButtonText}>Voir les activités</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberNotificationsCard({ notifications, navigation }) {
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <Text style={styles.counter}>{nonLues} non lue{nonLues > 1 ? 's' : ''}</Text>
      </View>
      {notifications.length === 0 ? (
        <EmptyText text="Aucune notification pour le moment." />
      ) : (
        notifications.slice(0, 3).map((notification) => (
          <ListItem
            key={notification.id}
            title={notification.titre || 'Notification'}
            subtitle={notification.message || 'Nouvelle information disponible.'}
            badge={notification.lue ? 'Lue' : 'Nouvelle'}
            color={notification.lue ? '#64748b' : '#2563eb'}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabNotifications')}
      >
        <Text style={styles.secondaryButtonText}>Ouvrir les notifications</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberProjectsCard({ projets, navigation }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Mes projets</Text>
        <Text style={styles.counter}>{projets.length}</Text>
      </View>
      {projets.length === 0 ? (
        <EmptyText text="Aucun projet proposé pour le moment." />
      ) : (
        projets.slice(0, 3).map((projet) => (
          <ListItem
            key={projet.id}
            title={projet.titre || 'Projet'}
            subtitle="Projet proposé"
            badge={translateProjet(projet.statut)}
            color={statusColor(projet.statut)}
          />
        ))
      )}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.getParent()?.navigate('TabProjects')}
      >
        <Text style={styles.secondaryButtonText}>Voir les projets</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation }) {
  const actions = buildNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mes prochaines actions</Text>
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

function buildNextActions({ statut, hasActivities, hasProjects, messagerieDisponible, navigation }) {
  if (!statut || statut === 'AUCUN_GROUPE') {
    return [
      {
        label: 'Rejoindre un groupe',
        description: 'Choisissez un groupe pour commencer votre parcours.',
        onPress: () => navigation.getParent()?.navigate('TabGroupes'),
      },
      {
        label: 'Découvrir les activités',
        description: 'Consultez les activités disponibles.',
        onPress: () => navigation.getParent()?.navigate('TabActivities'),
      },
    ];
  }

  if (statut === 'EN_ATTENTE') {
    return [
      {
        label: 'Demande en attente',
        description: 'Votre référent ou l’équipe admin doit encore valider votre adhésion.',
      },
      {
        label: 'Explorer les activités',
        description: 'Vous pouvez déjà découvrir ce qui est proposé.',
        onPress: () => navigation.getParent()?.navigate('TabActivities'),
      },
    ];
  }

  return [
    {
      label: 'Groupe rejoint',
      description: 'Votre accès groupe est actif.',
      done: true,
    },
    {
      label: hasActivities ? 'Suivre mes inscriptions' : 'Participer à une activité',
      description: hasActivities ? 'Gardez un oeil sur vos activités.' : 'Inscrivez-vous à une première activité.',
      onPress: () => navigation.getParent()?.navigate('TabActivities'),
    },
    {
      label: messagerieDisponible ? 'Utiliser la messagerie' : 'Messagerie indisponible',
      description: messagerieDisponible ? 'Échangez avec votre groupe.' : 'La messagerie sera disponible après acceptation.',
      onPress: messagerieDisponible ? () => navigation.getParent()?.navigate('TabMessagerie') : null,
    },
    {
      label: hasProjects ? 'Suivre mes projets' : 'Proposer un projet',
      description: hasProjects ? 'Consultez l’avancement de vos projets.' : 'Partagez une idée avec votre groupe.',
      onPress: () => navigation.getParent()?.navigate('TabProjects'),
    },
  ];
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Non renseigné'}</Text>
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

function statutInfo(statut) {
  if (statut === 'ACCEPTE') {
    return {
      label: 'Membre accepté',
      description: 'Vous faites partie d’un groupe actif et pouvez accéder à sa messagerie.',
      color: '#16a34a',
      bg: '#dcfce7',
    };
  }
  if (statut === 'EN_ATTENTE') {
    return {
      label: 'Demande en attente',
      description: 'Votre demande d’adhésion est en cours de validation.',
      color: '#d97706',
      bg: '#fef3c7',
    };
  }
  return {
    label: 'Aucun groupe',
    description: 'Rejoignez un groupe pour accéder à l’expérience complète BX-Connect.',
    color: '#2563eb',
    bg: '#dbeafe',
  };
}

function translateAdhesion(statut) {
  switch (statut) {
    case 'ACCEPTE': return 'Membre accepté';
    case 'EN_ATTENTE': return 'Demande en attente';
    case 'REFUSE': return 'Demande refusée';
    default: return 'Aucun groupe';
  }
}

function translateInscription(statut) {
  switch (statut) {
    case 'CONFIRMEE': return 'Confirmée';
    case 'EN_ATTENTE_PAIEMENT': return 'Paiement en attente';
    case 'ANNULEE': return 'Annulée';
    case 'EN_ATTENTE': return 'En attente';
    default: return statut || 'Inconnue';
  }
}

function translateProjet(statut) {
  switch (statut) {
    case 'BROUILLON': return 'Brouillon';
    case 'SOUMIS': return 'Soumis';
    case 'APPROUVE': return 'Approuvé';
    case 'EN_COURS': return 'En cours';
    case 'TERMINE': return 'Terminé';
    case 'REJETE': return 'Rejeté';
    default: return statut || 'Inconnu';
  }
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

function formatDate(dateStr, lieu) {
  const fragments = [];
  if (dateStr) {
    fragments.push(new Date(dateStr).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }));
  }
  if (lieu) fragments.push(lieu);
  return fragments.length > 0 ? fragments.join(' · ') : 'Date à confirmer';
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
