export async function requestPasswordReset(apiClient, email) {
  const response = await apiClient.post(
    '/auth/forgot-password',
    { email },
    { skipAuth: true },
  );
  return response.data;
}

export function passwordResetErrorKey(error) {
  return error?.response
    ? 'auth.forgot_password_error_api'
    : 'auth.forgot_password_error_network';
}
