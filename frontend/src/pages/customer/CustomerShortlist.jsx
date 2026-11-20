import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../lib/api';
import { Bookmark } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import PropertyCard from '../../components/property/PropertyCard';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function CustomerShortlist() {
  const { user } = useAuth();
  const data = useData();
  const ids = data.db.shortlists[user.id] || [];

  const missing = ids.filter((id) => !data.property(id));
  useEffect(() => {
    if (missing.length) api(`/properties${qs({ ids: missing.join(','), limit: 60 })}`).then((r) => data.mergeRefs({ properties: r.items })).catch(() => {});

  }, [missing.join(',')]);
  const list = ids.map((id) => data.property(id)).filter(Boolean);

  return (
    <>
      <PageHeader title="Shortlisted properties" subtitle="Properties you have saved. Tap the heart on a card to remove it." actions={<Link to="/properties" className="btn btn-outline btn-sm">Find more</Link>} />
      {list.length === 0 ? (
        <EmptyState icon={Bookmark} title="Your shortlist is empty" message="Tap the heart icon on any property to save it here for later." action={<Link to="/properties" className="btn btn-primary btn-sm">Browse properties</Link>} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
        </div>
      )}
    </>
  );
}
