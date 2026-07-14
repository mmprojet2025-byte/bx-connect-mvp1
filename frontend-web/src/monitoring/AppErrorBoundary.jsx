import { Component } from 'react'
import * as Sentry from '@sentry/react'
import i18n from '../i18n/index.js'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, {
      level: 'error',
      extra: {
        componentStack: info?.componentStack,
      },
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {i18n.t('errorBoundary.eyebrow')}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {i18n.t('errorBoundary.title')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {i18n.t('errorBoundary.description')}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {i18n.t('errorBoundary.reload')}
          </button>
        </section>
      </main>
    )
  }
}

export default AppErrorBoundary
