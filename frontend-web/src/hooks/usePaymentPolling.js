import { useEffect } from 'react'

// Read server state for at most 30 seconds. Focus checks do not extend that window.
export default function usePaymentPolling(enabled, check, { recheckOnFocus = false } = {}) {
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let busy = false
    const started = Date.now()
    const refresh = async () => {
      if (busy || controller.signal.aborted || (recheckOnFocus && document.visibilityState === 'hidden')) return
      busy = true
      try { await check(controller.signal) } finally { busy = false }
    }
    const timer = window.setInterval(() => {
      if (Date.now() - started >= 30000) { window.clearInterval(timer); return }
      void refresh()
    }, 2000)
    if (recheckOnFocus) {
      window.addEventListener('focus', refresh)
      document.addEventListener('visibilitychange', refresh)
    }
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled, check, recheckOnFocus])
}
