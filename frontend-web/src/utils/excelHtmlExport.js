export function createExcelWorkbook() {
  return []
}

export function appendExcelSheet(workbook, name, rows) {
  workbook.push({
    name: sanitizeExcelSheetName(name),
    rows: Array.isArray(rows) ? rows : [],
  })
}

export function saveExcelWorkbook(workbook, filename) {
  const html = [
    '<!doctype html>',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">',
    '<head><meta charset="utf-8"></head>',
    '<body>',
    ...workbook.map(sheetToHtml),
    '</body></html>',
  ].join('')

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function sheetToHtml(sheet) {
  return [
    `<table><caption>${escapeHtml(sheet.name)}</caption>`,
    ...sheet.rows.map(row => (
      `<tr>${(Array.isArray(row) ? row : [row]).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )),
    '</table><br>',
  ].join('')
}

export function sanitizeExcelSheetName(name) {
  return String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet'
}

function escapeHtml(value) {
  const text = neutralizeSpreadsheetFormula(String(value ?? ''))
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function neutralizeSpreadsheetFormula(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
