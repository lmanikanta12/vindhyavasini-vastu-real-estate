import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function useNotifications(userId) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api('/notifications');
      setItems(res.items);
    } catch {

    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    load();
    const tick = () => document.visibilityState === 'visible' && load();
    const id = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [userId, load]);

  const markRead = useCallback(async (id) => {
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((l) => l.map((n) => ({ ...n, read: true })));
    try { await api('/notifications/read-all', { method: 'POST' }); } catch {}
  }, []);

  return { items, unread: items.filter((n) => !n.read), markRead, markAllRead, reload: load };
}
