export default function Alert({ type = 'success', children }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className={`border px-4 py-3 rounded-xl mb-5 text-sm ${styles[type] || styles.info}`}>
      {children}
    </div>
  )
}
