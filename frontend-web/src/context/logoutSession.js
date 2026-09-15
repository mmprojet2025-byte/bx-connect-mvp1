export function logoutAndNavigate({ logout, closeMenu, navigate }) {
  logout()
  closeMenu()
  navigate('/', { replace: true })
}
