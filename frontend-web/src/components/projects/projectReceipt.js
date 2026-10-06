import { jsPDF } from 'jspdf'

export function createProjectReceipt(receipt, t, language = 'fr') {
  if (receipt.statut !== 'PAYE' || !receipt.numeroRecu || !receipt.datePaiement) {
    throw new Error(t('projectPayment.pending'))
  }
  const pdf = new jsPDF()
  const rows = [
    'BX-Connect',
    t('projectPayment.receipt'),
    receipt.numeroRecu,
    t('projectPayment.project') + ' : ' + receipt.titreProjet,
    t('projectPayment.participant') + ' : ' + receipt.participant,
    t('projectPayment.amount') + ' : ' + Number(receipt.montant).toFixed(2) + ' ' + receipt.devise,
    t('projectPayment.date') + ' : ' + new Date(receipt.datePaiement).toLocaleString(language),
    t('projectPayment.confirmed'),
  ]
  let y = 20
  for (const text of rows) {
    const lines = pdf.splitTextToSize(text, 170)
    pdf.text(lines, 20, y)
    y += lines.length * 7 + 4
  }
  return pdf
}
