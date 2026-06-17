import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/axios'
import AppIcon from '../components/ui/AppIcons'
import logoBxConnect from '../assets/images/logo-bx-connect.png'
import communityGroupPhoto from '../assets/images/home/community-group.jpg'
import communityMealPhoto from '../assets/images/home/community-meal.jpg'
import solidarityProjectPhoto from '../assets/images/home/solidarity-project.jpg'
import environmentActionPhoto from '../assets/images/home/environment-action.jpg'

const PLATFORM_CARDS = [
  {
    icon: 'Calendar',
    title: 'Centraliser les activités',
    description: 'Rassembler les ateliers, rencontres et événements au même endroit.',
  },
  {
    icon: 'CheckCircle',
    title: 'Faciliter les inscriptions',
    description: 'Aider les membres à suivre les opportunités et leur participation.',
  },
  {
    icon: 'Users',
    title: 'Rejoindre des groupes',
    description: 'Créer un lien clair entre les jeunes, les groupes et les référents.',
  },
  {
    icon: 'Rocket',
    title: 'Suivre des projets collaboratifs',
    description: 'Valoriser les initiatives et rendre leur évolution plus lisible.',
  },
]

const FEATURES = [
  {
    icon: 'Calendar',
    title: 'Découvrir des activités',
    description: 'Consulte les activités publiées, repère les dates importantes et trouve les événements qui te correspondent.',
  },
  {
    icon: 'Users',
    title: 'Rejoindre un groupe',
    description: 'Découvre les groupes disponibles et demande à rejoindre une communauté accompagnée par un référent.',
  },
  {
    icon: 'Rocket',
    title: 'Participer à des projets',
    description: 'Suis les projets collaboratifs, comprends leur statut et contribue à leur progression.',
  },
  {
    icon: 'MessageCircle',
    title: 'Échanger avec la communauté',
    description: 'Garde un canal clair avec les membres et référents lorsque ton parcours dans un groupe est actif.',
  },
]

const BENEFITS = [
  {
    icon: 'Search',
    title: 'Un accès simple aux activités',
    description: 'Les informations utiles sont regroupées pour aider chacun à passer rapidement de la découverte à l’inscription.',
  },
  {
    icon: 'MessageCircle',
    title: 'Une meilleure communication',
    description: 'Les jeunes et référents disposent d’un espace commun pour mieux suivre la vie des groupes.',
  },
  {
    icon: 'Folder',
    title: 'Un suivi plus clair',
    description: 'Les groupes et projets deviennent plus faciles à comprendre, gérer et valoriser.',
  },
]

const GALLERY = [
  {
    image: communityGroupPhoto,
    title: 'Communauté',
    description: 'Des jeunes réunis autour d’un moment collectif.',
  },
  {
    image: communityMealPhoto,
    title: 'Rencontres',
    description: 'Des échanges informels pour créer du lien.',
  },
  {
    image: environmentActionPhoto,
    title: 'Engagement citoyen',
    description: 'Des actions concrètes portées sur le terrain.',
  },
  {
    image: solidarityProjectPhoto,
    title: 'Solidarité',
    description: 'Des projets qui organisent l’aide et la participation.',
  },
]

const STEPS = [
  {
    title: 'Crée ton compte',
    description: 'Accède à ton espace et commence ton parcours dans la communauté.',
  },
  {
    title: 'Rejoins un groupe',
    description: 'Trouve un groupe actif et fais une demande d’adhésion.',
  },
  {
    title: 'Participe aux activités',
    description: 'Découvre les activités publiées et suis les opportunités disponibles.',
  },
  {
    title: 'Lance ou soutiens un projet',
    description: 'Contribue à transformer une idée collective en action concrète.',
  },
]

export default function Accueil() {
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loadingActivites, setLoadingActivites] = useState(true)
  const [loadingProjets, setLoadingProjets] = useState(true)
  const { t, i18n } = useTranslation()

  useRevealOnScroll()

  useEffect(() => {
    api.get('/activites')
      .then(res => setActivites(Array.isArray(res.data) ? res.data.slice(0, 3) : []))
      .catch(() => setActivites([]))
      .finally(() => setLoadingActivites(false))
  }, [])

  useEffect(() => {
    api.get('/projets')
      .then(res => setProjets(Array.isArray(res.data) ? res.data.slice(0, 3) : []))
      .catch(() => setProjets([]))
      .finally(() => setLoadingProjets(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-slate-100 bg-white">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.10),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(14,165,233,0.12),transparent_30%)]" aria-hidden="true" />

          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:px-8 lg:py-24">
            <div>
              <img
                src={logoBxConnect}
                alt="BX-CONNECT"
                className="landing-fade-up mb-10 w-[260px] max-w-full object-contain sm:w-[360px]"
              />
              <p className="landing-fade-up landing-delay-1 mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                Connecter les jeunes et les initiatives locales
              </p>
              <h1 className="landing-fade-up landing-delay-2 max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Bienvenue sur BX-Connect
              </h1>
              <p className="landing-fade-up landing-delay-3 mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                La plateforme qui connecte les jeunes, les associations et les projets à Bruxelles.
              </p>
              <div className="landing-fade-up landing-delay-4 mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="landing-button inline-flex h-12 items-center justify-center rounded-xl bg-blue-700 px-6 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Rejoindre la communauté
                </Link>
                <Link
                  to="/activites"
                  className="landing-button inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Voir les activités
                </Link>
              </div>
            </div>

            <div className="landing-hero-media landing-fade-up landing-delay-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-blue-950/10">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
                <img
                  src={communityGroupPhoto}
                  alt="Groupe communautaire BX-Connect"
                  className="landing-hero-photo h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <p className="text-sm font-semibold text-blue-100">Aperçu communauté</p>
                  <p className="mt-1 text-2xl font-black">Activités, groupes, projets</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionHeader
          eyebrow="Objectif"
          title="Une plateforme pensée pour"
          description="BX-Connect structure les informations essentielles pour rendre la vie communautaire plus simple à suivre."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-16 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {PLATFORM_CARDS.map((card, index) => (
            <InfoCard key={card.title} item={card} index={index} />
          ))}
        </section>

        <SectionHeader
          eyebrow="Actions principales"
          title="Ce que tu peux faire"
          description="Le parcours public permet de comprendre rapidement comment découvrir, rejoindre et participer."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-16 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {FEATURES.map((feature, index) => (
            <InfoCard key={feature.title} item={feature} index={index} compact />
          ))}
        </section>

        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Événements</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Activités récentes</h2>
              </div>
              <Link to="/activites" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
                Voir toutes les activités
              </Link>
            </div>

            {loadingActivites ? (
              <LoadingBlock label={t('common.loading')} />
            ) : activites.length === 0 ? (
              <EmptyLandingState text="Aucune activité publiée pour le moment." />
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {activites.map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    language={i18n.language}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Initiatives</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Projets en vedette</h2>
              </div>
              <Link to="/projets" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
                Explorer les projets
              </Link>
            </div>

            {loadingProjets ? (
              <LoadingBlock label={t('common.loading')} />
            ) : projets.length === 0 ? (
              <EmptyLandingState text="Aucun projet mis en avant pour le moment." />
            ) : projets.length === 1 ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <ProjectCard project={projets[0]} t={t} />
                <aside className="reveal fade-up rounded-2xl border border-blue-100 bg-blue-50 p-6">
                  <p className="text-sm font-bold uppercase tracking-wide text-blue-700">À retenir</p>
                  <h3 className="mt-3 text-2xl font-black text-slate-950">Chaque projet peut devenir une action concrète grâce au soutien de la communauté.</h3>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    BX-Connect aide à rendre les initiatives visibles, compréhensibles et plus faciles à soutenir.
                  </p>
                </aside>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {projets.map(project => (
                  <ProjectCard key={project.id} project={project} t={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-blue-950 py-16 text-white">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Parcours simple</p>
              <h2 className="mt-2 text-3xl font-black">Comment ça marche ?</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {STEPS.map((step, index) => (
                <article key={step.title} className="reveal fade-up stagger rounded-2xl border border-white/10 bg-white/5 p-5" style={{ '--stagger-delay': `${index * 90}ms` }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-blue-950">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-blue-100">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Galerie</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">La communauté en action</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Des photos réelles pour illustrer les rencontres, l’engagement citoyen et les projets solidaires.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {GALLERY.map((photo, index) => (
                <article
                  key={photo.title}
                  className={`landing-gallery-card reveal fade-up stagger overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 ${index === 0 ? 'lg:col-span-2' : ''}`}
                  style={{ '--stagger-delay': `${index * 80}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={photo.image}
                      alt={photo.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      className="h-full w-full object-cover transition duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" aria-hidden="true" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="font-black">{photo.title}</h3>
                      <p className="mt-1 text-sm text-blue-50">{photo.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div className="reveal fade-up overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm shadow-slate-900/5">
              <img
                src={communityMealPhoto}
                alt="Rencontre communautaire BX-Connect"
                loading="lazy"
                className="h-full min-h-[320px] w-full object-cover"
              />
            </div>
            <div className="reveal fade-up">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">À propos</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">BX-Connect rapproche les personnes, les idées et les actions.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                La plateforme aide les jeunes à découvrir des activités, rejoindre des groupes, participer à des projets et rester connectés à leur communauté. Elle donne aussi aux référents et partenaires une vue plus claire sur les initiatives en cours.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {['Activités visibles', 'Groupes structurés', 'Projets suivis', 'Communication facilitée'].map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                    <AppIcon name="CheckCircle" className="h-4 w-4 text-blue-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Bénéfices</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Pourquoi BX-Connect ?</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {BENEFITS.map((benefit, index) => (
                <InfoCard key={benefit.title} item={benefit} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 lg:px-8">
          <div className="reveal fade-up mx-auto flex max-w-5xl flex-col items-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center shadow-sm shadow-slate-900/5">
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Prêt à rejoindre BX-Connect ?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Crée ton compte et participe à la vie de la communauté.
            </p>
            <Link
              to="/register"
              className="landing-button mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-blue-700 px-6 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Créer un compte
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function useRevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const elements = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <section className="reveal fade-up mx-auto max-w-7xl px-5 pb-8 pt-16 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </section>
  )
}

function InfoCard({ item, index, compact = false }) {
  return (
    <article
      className={`landing-feature-card reveal fade-up stagger rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10 ${compact ? 'p-5' : 'p-6'}`}
      style={{ '--stagger-delay': `${index * 80}ms` }}
    >
      <div className={`${compact ? 'mb-4 h-10 w-10' : 'mb-5 h-11 w-11'} flex items-center justify-center rounded-xl bg-blue-50 text-blue-700`}>
        <AppIcon name={item.icon} className="h-5 w-5" />
      </div>
      <h3 className={`${compact ? 'text-base' : 'text-lg'} font-black text-slate-950`}>{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  )
}

function ActivityCard({ activity, language, t }) {
  const status = activity.statut || 'PUBLIEE'

  return (
    <article className="reveal fade-up flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10">
      <div className="flex items-start justify-between gap-4">
        <StatusPill status={status} t={t} />
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          {activity.categorie || 'Activité'}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-black leading-snug text-slate-950">{activity.titre}</h3>
      <div className="mt-5 grid gap-3 text-sm text-slate-600">
        <IconLine icon="Calendar" value={formatDate(activity.dateDebut, language)} />
        <IconLine icon="MapPin" value={activity.lieu || 'Bruxelles'} />
      </div>
      <Link
        to={typeof activity.id === 'number' ? `/activites/${activity.id}` : '/activites'}
        className="landing-button mt-auto inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        Voir
      </Link>
    </article>
  )
}

function ProjectCard({ project, t }) {
  const status = project.statut || 'EN_COURS'

  return (
    <article className="reveal fade-up flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10">
      <StatusPill status={status} t={t} />
      <h3 className="mt-5 text-xl font-black leading-snug text-slate-950">{project.titre}</h3>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
        {project.description || 'Description à venir.'}
      </p>
      <Link
        to="/projets"
        className="landing-button mt-auto inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 transition hover:border-blue-700 hover:bg-blue-700 hover:text-white"
      >
        Découvrir
      </Link>
    </article>
  )
}

function EmptyLandingState({ text }) {
  return (
    <div className="reveal fade-up rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm shadow-slate-900/5">
      {text}
    </div>
  )
}

function StatusPill({ status, t }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(status)}`}>
      {t(`statuses.${status}`, { defaultValue: formatStatus(status) })}
    </span>
  )
}

function IconLine({ icon, value }) {
  return (
    <p className="flex items-center gap-2">
      <AppIcon name={icon} className="h-4 w-4 text-blue-700" />
      <span>{value}</span>
    </p>
  )
}

function LoadingBlock({ label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm shadow-slate-900/5">
      {label}
    </div>
  )
}

function formatDate(value, language = 'fr') {
  if (!value) return 'Date à confirmer'

  try {
    return new Date(value).toLocaleDateString(language || 'fr-BE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return 'Date à confirmer'
  }
}

function formatStatus(status) {
  return String(status || 'En cours').replaceAll('_', ' ')
}

function statusStyle(status) {
  const styles = {
    PUBLIEE: 'bg-green-50 text-green-700',
    OUVERTE: 'bg-green-50 text-green-700',
    APPROUVE: 'bg-green-50 text-green-700',
    EN_COURS: 'bg-blue-50 text-blue-700',
    SOUMIS: 'bg-orange-50 text-orange-700',
    BROUILLON: 'bg-slate-100 text-slate-600',
  }

  return styles[status] || 'bg-blue-50 text-blue-700'
}
