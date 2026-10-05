export function buildMemberActivityItems({ dashboard, groupe, t, language }) {
  const notifications = (dashboard.notifications || []).map(notification => ({
    key: `notification-${notification.id}`,
    icon: notification.lue ? 'Bell' : 'TriangleAlert',
    title: notification.titre || t('nav.notifications'),
    description: notification.message,
    date: notification.dateCreation,
    to: '/notifications',
  }))

  const inscriptions = (dashboard.inscriptions || []).map(inscription => ({
    key: `inscription-${inscription.id || inscription.activiteId || inscription.titre}`,
    icon: 'Calendar',
    title: inscription.titre || inscription.activiteTitre || t('memberDashboard.activities.title'),
    description: inscription.activiteStatut === 'ANNULEE'
      ? t('activities.cancelledActivity')
      : (inscription.activiteDateDebut || inscription.dateDebut)
      ? t('activityFeed.activityDate', { date: new Date(inscription.activiteDateDebut || inscription.dateDebut).toLocaleDateString(language || 'fr-BE') })
      : t('memberDashboard.activities.dateToConfirm'),
    date: inscription.dateInscription || inscription.dateCreation || inscription.activiteDateDebut || inscription.dateDebut,
    to: '/activites',
  }))

  const projets = (dashboard.projets || []).map(projet => ({
    key: `projet-${projet.id || projet.titre}`,
    icon: 'Rocket',
    title: projet.titre || t('nav.projects'),
    description: projet.statut ? t(`statuses.${projet.statut}`, { defaultValue: projet.statut }) : t('activityFeed.projectTracked'),
    date: projet.dateModification || projet.dateCreation,
    to: projet.id ? `/projets/${projet.id}` : '/projets',
  }))

  const groupItem = groupe && {
    key: `groupe-${groupe.id || groupe.nom}`,
    icon: 'Users',
    title: t('activityFeed.currentGroup'),
    description: groupe.nom,
    date: groupe.dateAdhesion || groupe.dateCreation,
    to: groupe.id ? `/groupes/${groupe.id}` : '/groupes',
  }

  return [groupItem, ...notifications, ...inscriptions, ...projets].filter(Boolean)
}
