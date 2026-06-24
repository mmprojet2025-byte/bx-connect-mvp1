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

export default function Accueil() {
  const [activites, setActivites] = useState([])
  const [projets, setProjets] = useState([])
  const [loadingActivites, setLoadingActivites] = useState(true)
  const [loadingProjets, setLoadingProjets] = useState(true)
  const { t, i18n } = useTranslation()

  useRevealOnScroll(i18n.language)

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

  const actions = [
    {
      id: 'activities',
      icon: 'Calendar',
      title: t('home.actionActivitiesTitle'),
      description: t('home.actionActivitiesDescription'),
    },
    {
      id: 'groups',
      icon: 'Users',
      title: t('home.actionGroupsTitle'),
      description: t('home.actionGroupsDescription'),
    },
    {
      id: 'projects',
      icon: 'Rocket',
      title: t('home.actionProjectsTitle'),
      description: t('home.actionProjectsDescription'),
    },
    {
      id: 'community',
      icon: 'MessageCircle',
      title: t('home.actionCommunityTitle'),
      description: t('home.actionCommunityDescription'),
    },
  ]

  const steps = [
    {
      id: 'account',
      title: t('home.stepAccountTitle'),
      description: t('home.stepAccountDescription'),
    },
    {
      id: 'group',
      title: t('home.stepGroupTitle'),
      description: t('home.stepGroupDescription'),
    },
    {
      id: 'activities',
      title: t('home.stepActivitiesTitle'),
      description: t('home.stepActivitiesDescription'),
    },
    {
      id: 'projects',
      title: t('home.stepProjectsTitle'),
      description: t('home.stepProjectsDescription'),
    },
  ]

  const visualMoments = [
    {
      id: 'community',
      image: communityMealPhoto,
      title: t('home.visualCommunityTitle'),
      description: t('home.visualCommunityDescription'),
      alt: t('home.visualCommunityAlt'),
    },
    {
      id: 'solidarity',
      image: solidarityProjectPhoto,
      title: t('home.visualSolidarityTitle'),
      description: t('home.visualSolidarityDescription'),
      alt: t('home.visualSolidarityAlt'),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Navbar />

      <main className="flex-1">
        <section className="relative isolate scroll-mt-20 overflow-hidden border-b border-slate-100 bg-white">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.10),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(14,165,233,0.12),transparent_28%)]" aria-hidden="true" />

          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.85fr)] lg:items-center lg:px-8 lg:py-18">
            <div>
              <img
                src={logoBxConnect}
                alt="BX-CONNECT"
                className="landing-fade-up mb-5 w-[170px] max-w-full object-contain sm:w-[220px]"
              />
              <p className="landing-fade-up landing-delay-1 mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
                {t('home.heroBadge')}
              </p>
              <h1 className="landing-fade-up landing-delay-2 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {t('home.heroTitle')}
              </h1>
              <p className="landing-fade-up landing-delay-3 mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {t('home.heroSubtitle')}
              </p>
              <div className="landing-fade-up landing-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="landing-button inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  {t('home.createAccount')}
                </Link>
                <Link
                  to="/activites"
                  className="landing-button inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  {t('home.viewActivities')}
                </Link>
              </div>
            </div>

            <div className="landing-hero-media landing-fade-up landing-delay-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-blue-950/10">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-900">
                <img
                  src={communityGroupPhoto}
                  alt={t('home.heroImageAlt')}
                  className="landing-hero-photo h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <p className="text-sm font-semibold text-blue-100">{t('home.heroVisualEyebrow')}</p>
                  <p className="mt-1 text-2xl font-black">{t('home.heroVisualTitle')}</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-blue-50">{t('home.heroVisualDescription')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionHeader
          eyebrow={t('home.actionsEyebrow')}
          title={t('home.actionsTitle')}
          description={t('home.actionsDescription')}
        />
        <section className="mx-auto grid max-w-7xl scroll-mt-20 gap-4 px-5 pb-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {actions.map((action, index) => (
            <InfoCard key={action.id} item={action} index={index} />
          ))}
        </section>

        <section className="mx-auto grid max-w-7xl scroll-mt-20 gap-4 px-5 pb-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch lg:px-8">
          <div className="reveal fade-up rounded-xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{t('home.visualEyebrow')}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{t('home.visualTitle')}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t('home.visualDescription')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {visualMoments.map((moment, index) => (
              <VisualMomentCard key={moment.id} moment={moment} index={index} />
            ))}
          </div>
        </section>

        <section className="scroll-mt-20 bg-slate-50 py-12">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionTitle
              eyebrow={t('home.recentActivitiesEyebrow')}
              title={t('home.recentActivitiesTitle')}
              action={{ to: '/activites', label: t('home.viewAllActivities') }}
            />

            {loadingActivites ? (
              <LoadingBlock label={t('common.loading')} />
            ) : activites.length === 0 ? (
              <EmptyLandingState text={t('home.noRecentActivities')} />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
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

        <section className="scroll-mt-20 py-12">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionTitle
              eyebrow={t('home.featuredProjectsEyebrow')}
              title={t('home.featuredProjectsTitle')}
              action={{ to: '/projets', label: t('home.viewProjects') }}
            />

            {loadingProjets ? (
              <LoadingBlock label={t('common.loading')} />
            ) : projets.length === 0 ? (
              <EmptyLandingState text={t('home.noFeaturedProjects')} />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {projets.map(project => (
                  <ProjectCard key={project.id} project={project} t={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="scroll-mt-20 bg-blue-950 py-12 text-white">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-200">{t('home.howItWorksEyebrow')}</p>
              <h2 className="mt-2 text-3xl font-black">{t('home.howItWorksTitle')}</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <article
                  key={step.id}
                  className="reveal fade-up stagger rounded-lg border border-white/10 bg-white/5 p-5"
                  style={{ '--stagger-delay': `${index * 90}ms` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-blue-950">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-100">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-mt-20 bg-white px-5 py-12 lg:px-8">
          <div className="reveal fade-up mx-auto flex max-w-5xl flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center shadow-sm shadow-slate-900/5">
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">{t('home.finalCtaTitle')}</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {t('home.finalCtaDescription')}
            </p>
            <Link
              to="/register"
              className="landing-button mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              {t('home.createAccount')}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function useRevealOnScroll(language) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const elements = document.querySelectorAll('.reveal:not(.reveal-visible)')
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
  }, [language])
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <section className="reveal fade-up mx-auto max-w-7xl scroll-mt-20 px-5 pb-7 pt-12 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </section>
  )
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
      </div>
      <Link to={action.to} className="text-sm font-bold text-blue-700 hover:text-blue-800 hover:underline">
        {action.label}
      </Link>
    </div>
  )
}

function InfoCard({ item, index }) {
  return (
    <article
      className="landing-feature-card reveal fade-up stagger rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10"
      style={{ '--stagger-delay': `${index * 80}ms` }}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <AppIcon name={item.icon} className="h-5 w-5" />
      </div>
      <h3 className="text-base font-black text-slate-950">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  )
}

function VisualMomentCard({ moment, index }) {
  return (
    <article
      className="group reveal fade-up stagger overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10"
      style={{ '--stagger-delay': `${index * 90}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={moment.image}
          alt={moment.alt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-base font-black">{moment.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-blue-50">{moment.description}</p>
        </div>
      </div>
    </article>
  )
}

function ActivityCard({ activity, language, t }) {
  const status = activity.statut || 'PUBLIEE'

  return (
    <article className="reveal fade-up flex min-h-[220px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10">
      <div className="flex items-start justify-between gap-3">
        <StatusPill status={status} t={t} />
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
          {activity.categorie || t('home.activityFallbackCategory')}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-lg font-black leading-snug text-slate-950">{activity.titre}</h3>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <IconLine icon="Calendar" value={formatDate(activity.dateDebut, language, t)} />
        <IconLine icon="MapPin" value={activity.lieu || activity.commune || t('home.activityFallbackLocation')} />
      </div>
      <Link
        to={typeof activity.id === 'number' ? `/activites/${activity.id}` : '/activites'}
        className="landing-button mt-auto inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        {t('common.open')}
      </Link>
    </article>
  )
}

function ProjectCard({ project, t }) {
  const status = project.statut || 'EN_COURS'

  return (
    <article className="reveal fade-up flex min-h-[220px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10">
      <StatusPill status={status} t={t} />
      <h3 className="mt-4 line-clamp-2 text-lg font-black leading-snug text-slate-950">{project.titre}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {project.description || t('home.projectFallbackDescription')}
      </p>
      <Link
        to="/projets"
        className="landing-button mt-auto inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 transition hover:border-blue-700 hover:bg-blue-700 hover:text-white"
      >
        {t('home.projectDiscover')}
      </Link>
    </article>
  )
}

function EmptyLandingState({ text }) {
  return (
    <div className="reveal fade-up rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm shadow-slate-900/5">
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
      <span className="line-clamp-1">{value}</span>
    </p>
  )
}

function LoadingBlock({ label }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-sm shadow-slate-900/5">
      {label}
    </div>
  )
}

function formatDate(value, language = 'fr', t) {
  if (!value) return t('home.dateToConfirm')

  try {
    return new Date(value).toLocaleDateString(language || 'fr-BE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return t('home.dateToConfirm')
  }
}

function formatStatus(status) {
  return String(status || '').replaceAll('_', ' ')
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
