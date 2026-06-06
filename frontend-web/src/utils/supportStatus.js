export const SUPPORT_STATUS_STYLES = {
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  PAYE: 'bg-green-100 text-green-800',
  REMBOURSE: 'bg-red-100 text-red-800',
  ECHOUE: 'bg-red-100 text-red-800',
  ANNULE: 'bg-slate-100 text-slate-700',
}

export function supportStatusLabel(status, t) {
  return t(`partnerSupport.statuses.${status}`, { defaultValue: status || '—' })
}
