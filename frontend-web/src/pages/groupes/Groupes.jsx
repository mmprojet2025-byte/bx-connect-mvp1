import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'

const STATUS_LABELS = {
  ACCEPTE: 'Mon groupe',
  EN_ATTENTE: 'Demande en attente',
  REFUSE: 'Demande refusée',
}

export default function Groupes() {
  const { isAuthenticated, isMembre } = useAuth()
  const { t } = useTranslation()

  const [groupes, setGroupes] = useState([])
  const [adhesions, setAdhesions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [recherche, setRecherche] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchGroupes()
  }, [])

  useEffect(() => {
    if (isAuthenticated && isMembre) fetchAdhesions()
  }, [isAuthenticated, isMembre])

  const fetchGroupes = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/groupes')
      setGroupes(res.data)
    } catch {
      setError(t('groups.error_load'))
    } finally {
      setLoading(false)
    }
  }

  const fetchAdhesions = async () => {
    try {
      const res = await api.get('/groupes/mes-adhesions')
      setAdhesions(res.data)
    } catch {
      setAdhesions([])
    }
  }

  const handleRejoindre = async (groupeId) => {
    setMessage('')
    setError('')
    setActionLoading(groupeId)
    try {
      await api.post(`/groupes/${groupeId}/rejoindre`)
      setMessage('Votre demande a été envoyée au référent du groupe.')
      await Promise.all([fetchGroupes(), fetchAdhesions()])
    } catch (err) {
      setError(err.response?.data?.message || t('groups.error_load'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleQuitter = async (groupeId) => {
    setMessage('')
    setError('')
    setActionLoading(groupeId)
    try {
      await api.delete(`/groupes/${groupeId}/quitter`)
      setMessage(t('groups.success_leave'))
      await Promise.all([fetchGroupes(), fetchAdhesions()])
    } catch (err) {
      setError(err.response?.data?.message || t('groups.error_load'))
    } finally {
      setActionLoading(null)
    }
  }

  const adhesionParGroupe = useMemo(() => {
    return adhesions.reduce((acc, adhesion) => {
      acc[adhesion.groupeId] = adhesion
      return acc
    }, {})
  }, [adhesions])

  const adhesionActive = adhesions.find((adhesion) => adhesion.statut === 'ACCEPTE')
  const adhesionEnAttente = adhesions.find((adhesion) => adhesion.statut === 'EN_ATTENTE')
  const bloqueNouvelleDemande = !!adhesionActive || !!adhesionEnAttente

  const groupesFiltres = groupes.filter((groupe) =>
    groupe.nom?.toLowerCase().includes(recherche.toLowerCase())
  )

  const intro = isAuthenticated && isMembre
    ? t('ux.groups.memberIntro')
    : t('ux.groups.visitorIntro')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">{t('ux.groups.community')}</p>
          <h1 className="text-3xl font-bold text-blue-900 mt-1">{t('groups.title')}</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">{intro}</p>
        </header>

        {isAuthenticated && isMembre && (
          <MemberGroupSummary adhesionActive={adhesionActive} adhesionEnAttente={adhesionEnAttente} />
        )}

        {message && <Alert type="success">{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <div className="bg-white rounded-2xl shadow p-4 mb-6">
          <input
            type="text"
            placeholder={t('groups.search')}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">{t('groups.loading')}</p>
        ) : groupesFiltres.length === 0 ? (
          <EmptyState
            title={t('ux.groups.noAvailableTitle')}
            description={t('ux.groups.noAvailableDescription')}
            actionLabel="Voir les activités"
            actionTo="/activites"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groupesFiltres.map((groupe) => {
              const adhesion = adhesionParGroupe[groupe.id]
              return (
                <GroupCard
                  key={groupe.id}
                  groupe={groupe}
                  adhesion={adhesion}
                  isAuthenticated={isAuthenticated}
                  isMembre={isMembre}
                  bloqueNouvelleDemande={bloqueNouvelleDemande}
                  actionLoading={actionLoading === groupe.id}
                  onJoin={() => handleRejoindre(groupe.id)}
                  onLeave={() => handleQuitter(groupe.id)}
                />
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function MemberGroupSummary({ adhesionActive, adhesionEnAttente }) {
  if (adhesionActive) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
        <p className="text-green-800 font-semibold text-sm">Vous êtes membre du groupe {adhesionActive.groupeNom}.</p>
        <p className="text-green-700 text-sm mt-1">La messagerie de groupe est disponible depuis votre espace membre.</p>
      </div>
    )
  }

  if (adhesionEnAttente) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-amber-900 font-semibold text-sm">Votre demande pour {adhesionEnAttente.groupeNom} est en attente.</p>
        <p className="text-amber-700 text-sm mt-1">Vous pourrez rejoindre la messagerie quand le référent aura accepté votre demande.</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <p className="text-blue-900 font-semibold text-sm">Vous n’avez pas encore rejoint de groupe.</p>
      <p className="text-blue-700 text-sm mt-1">Choisissez un groupe ci-dessous pour envoyer une demande d’adhésion.</p>
    </div>
  )
}

function GroupCard({ groupe, adhesion, isAuthenticated, isMembre, bloqueNouvelleDemande, actionLoading, onJoin, onLeave }) {
  const { t } = useTranslation()
  const isAccepted = adhesion?.statut === 'ACCEPTE'
  const isPending = adhesion?.statut === 'EN_ATTENTE'
  const referent = [groupe.referentPrenom, groupe.referentNom].filter(Boolean).join(' ')
  const placesLabel = groupe.capaciteMax > 0
    ? `${groupe.nombreMembres ?? 0}/${groupe.capaciteMax} membres`
    : `${groupe.nombreMembres ?? 0} membre(s)`

  return (
    <article className={`bg-white rounded-2xl shadow p-5 flex flex-col gap-4 border ${isAccepted ? 'border-green-300' : 'border-transparent'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-blue-900 text-lg">{groupe.nom}</h2>
          {referent && <p className="text-xs text-gray-500 mt-1">Référent : {referent}</p>}
        </div>
        {adhesion?.statut && <GroupStatusBadge statut={adhesion.statut} />}
      </div>

      <p className="text-gray-500 text-sm leading-relaxed min-h-[44px]">
        {groupe.description || 'Ce groupe accueillera bientôt une description complète.'}
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full">{placesLabel}</span>
        {groupe.theme && <span className="bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full">{groupe.theme}</span>}
        {groupe.categorie && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{groupe.categorie}</span>}
      </div>

      <div className="mt-auto">
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="block w-full text-center bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl transition"
          >
            {t('ux.groups.joinLogin')}
          </Link>
        ) : !isMembre ? null : isAccepted ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/dashboard"
              className="text-center bg-green-700 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-xl transition"
            >
              {t('ux.groups.openMyGroup')}
            </Link>
            <button
              type="button"
              onClick={onLeave}
              disabled={actionLoading}
              className="border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold py-2 rounded-xl transition disabled:opacity-60"
            >
              {t('groups.leave_btn')}
            </button>
          </div>
        ) : isPending ? (
          <button
            type="button"
            disabled
            className="w-full bg-amber-100 text-amber-800 text-sm font-semibold py-2 rounded-xl"
          >
            {t('ux.groups.pending')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={bloqueNouvelleDemande || actionLoading}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-sm font-semibold py-2 rounded-xl transition"
          >
            {bloqueNouvelleDemande ? t('ux.groups.oneGroupOnly') : actionLoading ? 'Envoi...' : t('ux.groups.joinGroup')}
          </button>
        )}
      </div>
    </article>
  )
}

function GroupStatusBadge({ statut }) {
  const variants = {
    ACCEPTE: 'success',
    EN_ATTENTE: 'warning',
    REFUSE: 'danger',
  }
  return (
    <StatusBadge variant={variants[statut] || 'neutral'}>
      {STATUS_LABELS[statut] || statut}
    </StatusBadge>
  )
}
