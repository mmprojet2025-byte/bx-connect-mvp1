import { startTransition } from 'react'

export function canSubmitAccountDeletion({ confirmed, isSubmitting }) {
  return confirmed && !isSubmitting
}

export async function requestAccountDeletion({ apiClient, logout, navigate }) {
  await apiClient.delete('/users/me')
  // Éviter que le guard de la page privée intercepte la déconnexion avant le retour accueil.
  startTransition(() => {
    logout()
    navigate('/', { replace: true })
  })
}
