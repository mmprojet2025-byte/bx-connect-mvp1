import { useEffect } from 'react'

// Only reads server state. Stop after 30 seconds; manual checks remain available.
export default function usePaymentPolling(enabled, check) {
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let busy = false
    const started = Date.now()
    const timer = window.setInterval(async () => {
      if (Date.now() - started >= 30000) { window.clearInterval(timer); return }
      if (busy) return
      busy = true
      try { await check(controller.signal) } finally { busy = false }
    }, 2000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [enabled, check])
}
