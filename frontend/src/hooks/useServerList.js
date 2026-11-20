import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs } from '../lib/api';
import { useData } from '../context/DataContext';

export default function useServerList(path, { filters = {}, search = '', limit = 15, sort = 'createdAt', dir = 'desc', enabled = true, collection } = {}) {
  const { version, mergeRefs } = useData();
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState({ sort, dir });
  const [debounced, setDebounced] = useState(search);
  const [state, setState] = useState({ items: [], total: 0, pages: 1, loading: true, error: '' });
  const seq = useRef(0);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debounced, filterKey, order.sort, order.dir, path]);

  const load = useCallback(async () => {
    if (!enabled) return;
    const mine = ++seq.current;
    try {
      const res = await api(`${path}${qs({ ...filters, q: debounced, page, limit, sort: order.sort, dir: order.dir })}`);
      if (mine !== seq.current) return;
      mergeRefs(res.refs, collection, res.items);
      setState({ items: res.items, total: res.total, pages: res.pages, loading: false, error: '' });
      if (res.pages && page > res.pages) setPage(res.pages);
    } catch (err) {
      if (mine !== seq.current) return;
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }

  }, [path, filterKey, debounced, page, limit, order.sort, order.dir, enabled, mergeRefs, collection]);

  useEffect(() => { load(); }, [load, version]);

  const onSort = (key) => setOrder((o) => (o.sort === key ? { sort: key, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' }));

  return { ...state, page, setPage, limit, sort: order.sort, dir: order.dir, onSort, reload: load };
}
