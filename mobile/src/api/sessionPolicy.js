export function isProtectedUnauthorized({ status, isPublicRequest }) {
  return status === 401 && !isPublicRequest;
}

export function shouldCloseSession({ status, isPublicRequest, hadStoredSession }) {
  return isProtectedUnauthorized({ status, isPublicRequest }) && hadStoredSession;
}

export function createSessionInvalidator({ hasSession, clearSession, notify }) {
  let pendingInvalidation = null;

  return async function invalidateSessionOnce() {
    if (!pendingInvalidation) {
      pendingInvalidation = (async () => {
        if (!await hasSession()) return false;
        await clearSession();
        notify();
        return true;
      })().finally(() => {
        pendingInvalidation = null;
      });
    }

    return pendingInvalidation;
  };
}
