import { useEffect, useState } from 'react';
import { api, qs } from '../lib/api';

export default function useVisitSlots({ propertyId, agentId, date, enabled = true }) {
  const [state, setState] = useState({ slots: [], reason: '', agent: '', loading: false, loaded: false });
  useEffect(() => {
    if (!enabled || !date || (!propertyId && !agentId)) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    api(`/site-visits/availability${qs({ propertyId, agentId, date })}`)
      .then((r) => live && setState({ slots: r.slots, reason: r.reason || '', agent: r.agent || '', loading: false, loaded: true }))
      .catch((e) => live && setState({ slots: [], reason: e.message, agent: '', loading: false, loaded: true }));
    return () => { live = false; };
  }, [propertyId, agentId, date, enabled]);
  return state;
}
