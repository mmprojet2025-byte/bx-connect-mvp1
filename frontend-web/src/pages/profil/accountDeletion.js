export function canSubmitAccountDeletion({ confirmed, isSubmitting }) {
  return confirmed && !isSubmitting
}

export async function requestAccountDeletion({ apiClient, logout, navigate }) {
  await apiClient.delete('/users/me')
  logout()
  navigate('/', { replace: true })
}
