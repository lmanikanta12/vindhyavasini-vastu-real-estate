import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitCompareArrows, LayoutGrid, List, RotateCcw, SearchX, SlidersHorizontal, X } from 'lucide-react';
import PropertyCard from '../../components/property/PropertyCard';
import CompareModal from '../../components/property/CompareModal';
import SearchInput from '../../components/ui/SearchInput';
import EmptyState from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { useData } from '../../context/DataContext';
import { BUDGETS, CITIES, DIRECTIONS, PROPERTY_CATEGORIES, SIZES } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import { api, qs } from '../../lib/api';
import { cn } from '../../lib/utils';

const SORTS = [
  { value: 'new', label: 'Newest first' },
  { value: 'low', label: 'Price: low to high' },
  { value: 'high', label: 'Price: high to low' },
  { value: 'area', label: 'Largest area' },
];

export default function Properties() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('grid');
  const [panel, setPanel] = useState(false);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const mode = params.get('mode');
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  const budget = params.get('budget') || 'any';
  const size = params.get('size') || 'any';
  const facing = params.get('facing') || '';
  const available = params.get('available') === '1';
  const sort = params.get('sort') || 'new';

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === 'any' || v === false ? next.delete(k) : next.set(k, v === true ? '1' : v)));
    setParams(next, { replace: true });
  };
  const reset = () => setParams({}, { replace: true });

  const rentView = category === 'Rental' || mode === 'rent';
  const budgetList = rentView ? BUDGETS.rent : BUDGETS.sale;

  const LIMIT = 12;
  const [page, setPage] = useState(1);
  const [found, setFound] = useState({ items: [], total: 0, pages: 1, loading: true, error: '' });
  const [term, setTerm] = useState(q.trim());
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const query = useMemo(() => {
    const b = budgetList.find((x) => x.key === budget);
    const s = SIZES.find((x) => x.key === size);
    const named = { new: 'newest', low: 'price-asc', high: 'price-desc', area: 'area-desc' };
    return {
      listingType: mode === 'buy' ? 'sale' : mode === 'rent' ? 'rent' : undefined,
      category, city, facing, q: term,
      status: available ? 'Available' : undefined,
      ...(b && b.key !== 'any' ? { listingType: rentView ? 'rent' : 'sale', minPrice: b.min, maxPrice: b.max != null ? b.max - 1 : undefined } : {}),
      ...(s && s.key !== 'any' ? { minArea: s.min, maxArea: s.max != null ? s.max - 1 : undefined } : {}),
      sort: named[sort] || 'newest',
    };
  }, [mode, category, city, facing, available, term, budget, size, sort, budgetList, rentView]);
  const queryKey = JSON.stringify(query);
  const { version } = useData();

  useEffect(() => { setPage(1); }, [queryKey]);
  useEffect(() => {
    let live = true;
    api(`/properties${qs({ ...query, page, limit: LIMIT })}`)
      .then((res) => { if (live) setFound({ items: res.items, total: res.total, pages: res.pages, loading: false, error: '' }); })
      .catch((err) => { if (live) setFound((f) => ({ ...f, loading: false, error: err.message })); });
    return () => { live = false; };
  }, [queryKey, page, version]);
  const results = found.items;

  const activeCount = [category, city, facing, available, q, budget !== 'any', size !== 'any'].filter(Boolean).length;
  const toggleCompare = (p) => setCompare((c) => (c.find((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : c.length < 3 ? [...c, p] : c));

  const filters = (
    <div className="space-y-5">
      <Select label="City" value={city} placeholder="All cities" onChange={(e) => set({ city: e.target.value })} options={CITIES} />
      <Select label="Budget" value={budget} onChange={(e) => set({ budget: e.target.value })} options={budgetList.map((b) => ({ value: b.key, label: b.label }))} />
      <Select label="Size" value={size} onChange={(e) => set({ size: e.target.value })} options={SIZES.map((b) => ({ value: b.key, label: b.label }))} />
      <Select label="Facing direction" value={facing} placeholder="Any direction" onChange={(e) => set({ facing: e.target.value })} options={DIRECTIONS} />
      <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
        <input type="checkbox" className="h-4.5 w-4.5 accent-[rgb(var(--c-brand))]" checked={available} onChange={(e) => set({ available: e.target.checked })} />
        Available properties only
      </label>
      <button className="btn btn-ghost btn-sm w-full border border-line" onClick={reset}><RotateCcw size={15} /> Reset all filters</button>
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-8">
        <p className="eyebrow">{mode === 'rent' ? 'Rent' : mode === 'buy' ? 'Buy' : 'Properties'}</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{mode === 'rent' ? 'Properties for rent' : mode === 'buy' ? 'Properties for sale' : 'Browse properties'}</h1>
        <p className="mt-2 text-muted">Search, filter and compare verified listings.</p>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button className={cn('chip shrink-0', !category && 'chip-active')} onClick={() => set({ category: '', budget: 'any' })}>All</button>
        {PROPERTY_CATEGORIES.map((c) => (
          <button key={c} className={cn('chip shrink-0', category === c && 'chip-active')} onClick={() => set({ category: c, budget: 'any' })}>{c === 'Plot' ? 'Plots and land' : c}</button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">

        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Filters</h2>
            {filters}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput className="flex-1" value={q} onChange={(v) => set({ q: v })} placeholder="Search by locality, title or reference ID" />
            <div className="flex items-center gap-2">
              <button className="btn btn-outline btn-sm lg:hidden" onClick={() => setPanel(true)}>
                <SlidersHorizontal size={16} /> Filters {activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-on-brand">{activeCount}</span>}
              </button>
              <select className="input w-auto py-2" value={sort} onChange={(e) => set({ sort: e.target.value === 'new' ? '' : e.target.value })} aria-label="Sort">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="hidden rounded-xl border border-line p-1 sm:flex">
                {[['grid', LayoutGrid], ['list', List]].map(([k, Icon]) => (
                  <button key={k} onClick={() => setView(k)} aria-label={`${k} view`} aria-pressed={view === k} className={cn('rounded-lg p-1.5 transition', view === k ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink')}><Icon size={18} /></button>
                ))}
              </div>
            </div>
          </div>

          <p className="mb-4 text-sm font-semibold text-muted">{found.total} {found.total === 1 ? 'property' : 'properties'} found</p>

          {results.length === 0 && found.loading ? (
            <p className="py-16 text-center text-sm font-semibold text-muted">Loading properties...</p>
          ) : found.error ? (
            <EmptyState icon={SearchX} title="Could not load properties" message={found.error} />
          ) : results.length === 0 ? (
            <EmptyState icon={SearchX} title="No properties match" message="Try removing a filter or widening your budget." action={<button className="btn btn-primary btn-sm" onClick={reset}>Reset filters</button>} />
          ) : (
            <div className={cn('grid gap-6', view === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
              {results.map((p, i) => (
                <PropertyCard key={p.id} property={p} view={view} index={i} compare={compare.some((x) => x.id === p.id)} compareDisabled={compare.length >= 3} onToggleCompare={toggleCompare} />
              ))}
            </div>
          )}
          <Pagination page={page} pages={found.pages} total={found.total} limit={LIMIT} noun="properties" onPage={(n) => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </div>
      </div>

      {panel && (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={() => setPanel(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-scale-in overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-5 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Filters</h2>
              <button className="btn-icon" onClick={() => setPanel(false)} aria-label="Close filters"><X size={20} /></button>
            </div>
            {filters}
            <button className="btn btn-primary mt-5 w-full" onClick={() => setPanel(false)}>Show {found.total} results</button>
          </div>
        </div>
      )}

      {compare.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl animate-fade-up items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lift">
          <p className="pl-2 text-sm font-bold">{compare.length} selected <span className="font-normal text-muted">(max 3)</span></p>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setCompare([])}>Clear</button>
            <button className="btn btn-primary btn-sm" disabled={compare.length < 2} onClick={() => setShowCompare(true)}><GitCompareArrows size={16} /> Compare</button>
          </div>
        </div>
      )}
      <CompareModal open={showCompare} onClose={() => setShowCompare(false)} items={compare} />
    </div>
  );
}
