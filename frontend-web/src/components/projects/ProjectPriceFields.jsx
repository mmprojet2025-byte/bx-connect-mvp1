import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ProjectPriceFields({ value = 0, onChange }) {
  const { t } = useTranslation()
  const [paid, setPaid] = useState(Number(value) > 0)
  return <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
    <legend className="px-1 text-sm font-semibold">{t('projectPayment.participation')}</legend>
    <label className="mr-4 inline-flex gap-2"><input type="radio" name="project-price-mode" checked={!paid} onChange={() => { setPaid(false); onChange(0) }} />{t('projectPayment.free')}</label>
    <label className="inline-flex gap-2"><input type="radio" name="project-price-mode" checked={paid} onChange={() => { setPaid(true); onChange('') }} />{t('projectPayment.paid')}</label>
    {paid && <label className="block text-sm">{t('projectPayment.price')}
      <input type="number" min="0.50" max="999999.99" step="0.01" required value={value}
        onChange={e => onChange(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
    </label>}
    <p className="text-xs text-slate-500">{t('projectPayment.budgetHelp')}</p>
  </fieldset>
}
