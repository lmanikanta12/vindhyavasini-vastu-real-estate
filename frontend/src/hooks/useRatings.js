import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function useRatings() {
  const [summary, setSummary] = useState({});
  useEffect(() => {
    let live = true;
    api('/reviews/summary').then((r) => live && setSummary(r.summary || {})).catch(() => {});
    return () => { live = false; };
  }, []);
  return summary;
}
