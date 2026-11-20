import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { api, ApiError } from '../lib/api';
import { useData } from './DataContext';

const AuthContext = createContext(null);

const attempt = async (fn) => {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return { ok: false, error: err.message, code: err.code, status: err.status, data: err.data };
  }
};

export function AuthProvider({ children }) {
  const data = useData();
  const { me, db, setSession } = data;

  const user = useMemo(() => (me ? db.users.find((u) => u.id === me.id) || me : null), [me, db.users]);

  const logout = useCallback(() => setSession(null), [setSession]);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener('ve:session-expired', onExpired);
    return () => window.removeEventListener('ve:session-expired', onExpired);
  }, [logout]);

  const finish = async (res) => {
    await setSession(res.token);
    return { user: res.user };
  };

  const value = useMemo(
    () => ({
      user,
      logout,
      login: (email, password) => attempt(async () => finish(await api('/auth/login', { method: 'POST', body: { email, password }, token: null }))),

      register: ({ name, email, phone, password, accept }) => attempt(() => api('/auth/register', { method: 'POST', body: { name, email, phone, password, acceptTerms: accept === true }, token: null })),
      verifyEmail: (email, otp) => attempt(async () => finish(await api('/auth/verify-email', { method: 'POST', body: { email, otp }, token: null }))),
      resendOtp: (email, purpose = 'verify') => attempt(() => api('/auth/resend-otp', { method: 'POST', body: { email, purpose }, token: null })),
      forgotPassword: (email) => attempt(() => api('/auth/forgot-password', { method: 'POST', body: { email }, token: null })),
      verifyResetOtp: (email, otp) => attempt(() => api('/auth/verify-reset-otp', { method: 'POST', body: { email, otp }, token: null })),
      resetPassword: (resetToken, password) => attempt(() => api('/auth/reset-password', { method: 'POST', body: { resetToken, password }, token: null })),
      changePassword: (currentPassword, newPassword) => attempt(() => api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })),
    }),

    [user, logout, setSession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
