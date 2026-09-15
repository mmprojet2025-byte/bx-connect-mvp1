export function shouldCloseSession({ status, isPublicRequest, hadStoredSession }) {
  return status === 401 && !isPublicRequest && hadStoredSession
}
