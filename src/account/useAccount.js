/**
 * Fiók-állapot a kliensen: ki van bejelentkezve, és a fiók-műveletek
 * (regisztráció, belépés, kilépés, jelszó-visszaállítás, terveim, rollereim).
 *
 * A munkamenet httpOnly sütiben él (a híd szerver adja), ezért a kliens csak
 * annyit tud, amit a /api/account/me visszaad. Minden hívás a közös
 * bridgeFetch-en megy (credentials: include + X-Requested-With fejléc).
 */
import { useCallback, useEffect, useState } from 'react';
import { bridgeFetch } from '../api/cartBridge.js';

export function useAccount() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await bridgeFetch('/api/account/me');
      setUser(r.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const register = useCallback(async ({ email, password, name, phone }) => {
    const r = await bridgeFetch('/api/account/register', { method: 'POST', body: { email, password, name, phone } });
    setUser(r.user);
    return r;
  }, []);
  const login = useCallback(async ({ email, password }) => {
    const r = await bridgeFetch('/api/account/login', { method: 'POST', body: { email, password } });
    setUser(r.user);
    return r;
  }, []);
  const logout = useCallback(async () => {
    try { await bridgeFetch('/api/account/logout', { method: 'POST' }); } finally { setUser(null); }
  }, []);
  const updateProfile = useCallback(async (patch) => {
    const r = await bridgeFetch('/api/account/me', { method: 'PUT', body: patch });
    setUser(r.user);
    return r;
  }, []);
  const requestPasswordReset = useCallback((email) =>
    bridgeFetch('/api/account/password/forgot', { method: 'POST', body: { email } }), []);
  const resetPassword = useCallback(async (token, password) => {
    const r = await bridgeFetch('/api/account/password/reset', { method: 'POST', body: { token, password } });
    setUser(r.user);
    return r;
  }, []);
  const verifyEmail = useCallback(async (token) => {
    const r = await bridgeFetch('/api/account/verify', { method: 'POST', body: { token } });
    if (r.user) setUser(r.user);
    return r;
  }, []);
  const resendVerification = useCallback(() => bridgeFetch('/api/account/verify/resend', { method: 'POST' }), []);

  const listDesigns = useCallback(() => bridgeFetch('/api/account/designs'), []);
  const deleteDesign = useCallback((id) => bridgeFetch(`/api/designs/${encodeURIComponent(id)}`, { method: 'DELETE' }), []);
  const claimDesign = useCallback((id, editKey) =>
    bridgeFetch(`/api/designs/${encodeURIComponent(id)}/claim`, { method: 'POST', body: { editKey } }), []);
  const listScooters = useCallback(() => bridgeFetch('/api/account/scooters'), []);
  const addScooter = useCallback((s) => bridgeFetch('/api/account/scooters', { method: 'POST', body: s }), []);
  const removeScooter = useCallback((id) => bridgeFetch(`/api/account/scooters/${encodeURIComponent(id)}`, { method: 'DELETE' }), []);

  return {
    user, ready, refresh, register, login, logout, updateProfile,
    requestPasswordReset, resetPassword, verifyEmail, resendVerification,
    listDesigns, deleteDesign, claimDesign, listScooters, addScooter, removeScooter,
  };
}
