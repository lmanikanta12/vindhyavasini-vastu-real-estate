import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ServerCrash } from 'lucide-react';
import { api, getToken, setToken } from '../lib/api';
import { useToast } from './ToastContext';

const DataContext = createContext(null);

const EMPTY = { users: [], properties: [], enquiries: [], siteVisits: [], services: [], consultations: [], payments: [], constructionRequests: [], shortlists: {}, settings: {} };

const ROUTE = {
  users: ['/users', 'user'],
  properties: ['/properties', 'property'],
  enquiries: ['/enquiries', 'enquiry'],
  siteVisits: ['/site-visits', 'visit'],
  services: ['/services', 'service'],
  consultations: ['/consultations', 'consultation'],
  payments: ['/payments', 'payment'],
  constructionRequests: ['/construction', 'request'],
};

export function DataProvider({ children }) {
  const toast = useToast();
  const [db, setDb] = useState(EMPTY);
  const [me, setMe] = useState(null);
  const [config, setConfig] = useState({ paymentMode: 'demo', razorpayKeyId: null });
  const [status, setStatus] = useState('loading');
  const [version, setVersion] = useState(0);
  const [extra, setExtra] = useState({ users: {}, properties: {}, services: {}, consultations: {}, enquiries: {}, siteVisits: {}, payments: {} });
  const [errorText, setErrorText] = useState('');
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api('/bootstrap');
      if (!alive.current) return res;
      setDb({ ...EMPTY, ...res.db });
      setMe(res.me);
      setConfig(res.config);
      setStatus('ready');
      setVersion((v) => v + 1);
      return res;
    } catch (err) {
      if (!alive.current) return null;

      setStatus((s) => (s === 'ready' ? s : 'error'));
      setErrorText(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const tick = () => document.visibilityState === 'visible' && getToken() && refresh();
    const id = setInterval(tick, 45000);
    window.addEventListener('focus', tick);
    return () => {
      alive.current = false;
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [refresh]);

  const setSession = useCallback(
    async (token) => {
      setToken(token);
      return refresh();
    },
    [refresh]
  );

  const mergeRefs = useCallback((refs, coll, items) => setExtra((e) => {
    let next = e;
    const put = (k, list) => {
      if (!list?.length) return;
      const merged = { ...next[k] };
      let changed = false;
      for (const x of list) {
        const old = merged[x.id];
        if (!old || old.updatedAt !== x.updatedAt || old !== x && JSON.stringify(old) !== JSON.stringify(x)) { merged[x.id] = x; changed = true; }
      }
      if (changed) next = { ...next, [k]: merged };
    };
    for (const k of ['users', 'properties', 'services', 'payments']) put(k, refs?.[k]);
    if (coll) put(coll, items);
    return next;
  }), []);

  const value = useMemo(() => {

    const byId = (coll) => (id) => {
      const a = db[coll].find((x) => x.id === id);
      const b = extra[coll]?.[id];
      if (!a || !b) return a || b;
      return (b.updatedAt || '') > (a.updatedAt || '') ? b : a;
    };
    const fail = (err) => {
      toast(err.message || 'Something went wrong.', 'error');
      refresh();
      return null;
    };

    return {
      db,
      me,
      config,
      refresh,
      version,

      mergeRefs,
      setSession,

      user: byId('users'),
      property: byId('properties'),
      service: byId('services'),
      consultation: byId('consultations'),
      enquiry: byId('enquiries'),
      visit: byId('siteVisits'),
      paymentForConsultation: (cid) => db.payments.find((p) => p.consultationId === cid) || Object.values(extra.payments).find((p) => p.consultationId === cid),
      usersByRole: (role) => db.users.filter((u) => u.role === role),

      async add(coll, item) {
        const [path, key] = ROUTE[coll];
        try {
          const res = await api(path, { method: 'POST', body: item });
          const rec = res[key];
          setDb((d) => ({ ...d, [coll]: [rec, ...d[coll]] }));
          refresh();
          return { ...rec, ...(res.tempPassword && { tempPassword: res.tempPassword }), ...(res.payment && { payment: res.payment }) };
        } catch (err) {
          return fail(err);
        }
      },
      async update(coll, id, patch) {
        const [path, key] = ROUTE[coll];
        setDb((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === id ? { ...x, ...patch, password: undefined } : x)) }));
        try {
          const res = await api(`${path}/${id}`, { method: 'PATCH', body: patch });
          setDb((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === id ? res[key] : x)) }));
          refresh();
          return res[key];
        } catch (err) {
          return fail(err);
        }
      },
      async remove(coll, id) {
        const [path] = ROUTE[coll];
        try {
          await api(`${path}/${id}`, { method: 'DELETE' });
          setDb((d) => ({ ...d, [coll]: d[coll].filter((x) => x.id !== id) }));
          refresh();
          return true;
        } catch (err) {
          fail(err);
          return false;
        }
      },

      async toggleShortlist(userId, propertyId) {
        const list = db.shortlists[userId] || [];
        const next = list.includes(propertyId) ? list.filter((x) => x !== propertyId) : [...list, propertyId];
        setDb((d) => ({ ...d, shortlists: { ...d.shortlists, [userId]: next } }));
        try {
          await api(`/shortlist/${propertyId}`, { method: 'POST' });
        } catch (err) {
          fail(err);
        }
      },
      isShortlisted: (userId, propertyId) => !!userId && (db.shortlists[userId] || []).includes(propertyId),
      async addEnquiryNote(enquiryId, text, isPrivate = false) {
        try {
          const res = await api(`/enquiries/${enquiryId}/notes`, { method: 'POST', body: { text, private: isPrivate } });
          setDb((d) => ({ ...d, enquiries: d.enquiries.map((e) => (e.id === enquiryId ? res.enquiry : e)) }));
          return res.enquiry;
        } catch (err) {
          return fail(err);
        }
      },
      async addConstructionNote(id, text) {
        try {
          const res = await api(`/construction/${id}/notes`, { method: 'POST', body: { text } });
          setDb((d) => ({ ...d, constructionRequests: d.constructionRequests.map((x) => (x.id === id ? res.request : x)) }));
          return res.request;
        } catch (err) {
          return fail(err);
        }
      },
      async updateSettings(patch) {
        try {
          const res = await api('/settings', { method: 'PATCH', body: patch });
          setDb((d) => ({ ...d, settings: res.settings }));
          return res.settings;
        } catch (err) {
          return fail(err);
        }
      },
    };
  }, [db, me, config, refresh, setSession, toast, version, extra, mergeRefs]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-muted">
        <div className="flex items-center gap-3 font-semibold"><Loader2 className="animate-spin text-brand" size={22} /> Loading Vindhyavasini Vastu and Real Estate</div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><ServerCrash size={26} /></span>
          <h1 className="mt-4 text-2xl font-semibold">Cannot reach the server</h1>
          <p className="mt-2 text-sm text-muted">{errorText || 'The backend is not responding.'}</p>
          <p className="mt-2 text-sm text-muted">Start it with <code className="rounded bg-sunken px-1.5 py-0.5">npm run dev</code> inside the <b>backend</b> folder, and make sure MongoDB is running.</p>
          <button className="btn btn-primary mt-5" onClick={() => { setStatus('loading'); refresh(); }}>Try again</button>
        </div>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
