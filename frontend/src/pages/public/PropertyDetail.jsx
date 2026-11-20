import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, Bath, Download, FileText, CalendarCheck, Calendar, Check, Compass, Heart, Layers, Mail, MapPin, MessageSquare, Phone, Ruler, Sofa, Sparkles } from 'lucide-react';
import PropertyGallery from '../../components/property/PropertyGallery';
import PropertyMap from '../../components/property/PropertyMap';
import PropertyCard from '../../components/property/PropertyCard';
import EnquiryModal from '../../components/property/EnquiryModal';
import SiteVisitModal from '../../components/property/SiteVisitModal';
import Avatar from '../../components/ui/Avatar';
import { RatingBadge } from '../../components/ui/Stars';
import useRatings from '../../hooks/useRatings';
import EmptyState from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/Badge';
import useShortlist from '../../hooks/useShortlist';
import { useData } from '../../context/DataContext';
import { api } from '../../lib/api';
import { assetUrl, formatPrice, imgUrl } from '../../lib/utils';

export default function PropertyDetail() {
  const { id } = useParams();
  const { db, user: lookupUser, property: lookupProperty, mergeRefs } = useData();
  const ratings = useRatings();
  const [loadState, setLoadState] = useState('idle');
  const navigate = useNavigate();
  const { isShortlisted, toggle } = useShortlist();
  const [enquiry, setEnquiry] = useState(false);
  const [visit, setVisit] = useState(false);

  const p = lookupProperty(id);

  useEffect(() => {
    if (p) return;
    setLoadState('loading');
    api(`/properties/${id}`).then((r) => mergeRefs({ properties: [r.property] })).catch(() => {}).finally(() => setLoadState('done'));

  }, [id, !!p]);
  if (!p && loadState !== 'done') return <div className="container-page py-24 text-center text-sm font-semibold text-muted">Loading property...</div>;
  if (!p || !p.published) {
    return (
      <div className="container-page py-20">
        <EmptyState title="Property not found" message="This listing may have been removed or unpublished." action={<Link to="/properties" className="btn btn-primary btn-sm">Browse properties</Link>} />
      </div>
    );
  }

  const agent = lookupUser(p.agentId);
  const saved = isShortlisted(p.id);
  const similar = db.properties.filter((x) => x.published && x.id !== p.id && (x.category === p.category || x.city === p.city)).slice(0, 3);

  const facts = [
    [Ruler, 'Area', `${p.area.toLocaleString('en-IN')} sq ft`],
    p.bedrooms > 0 && [BedDouble, 'Bedrooms', `${p.bedrooms} BHK`],
    p.bathrooms > 0 && [Bath, 'Bathrooms', p.bathrooms],
    [Compass, 'Facing', p.facing],
    p.floor !== '-' && [Layers, 'Floor', p.floor],
    p.furnishing !== '-' && [Sofa, 'Furnishing', p.furnishing],
    p.ageYears > 0 && [Calendar, 'Age', `${p.ageYears} years`],
  ].filter(Boolean);

  return (
    <div className="container-page py-6 sm:py-10">
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-brand"><ArrowLeft size={17} /> Back to results</button>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <div className="animate-fade-up"><PropertyGallery property={p} /></div>

          <div className="animate-fade-up [animation-delay:80ms]">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={p.status} />
              <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted">{p.category} · {p.type}</span>
              <span className="text-xs font-semibold text-muted">Ref {p.ref}</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{p.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-muted"><MapPin size={17} /> {p.address}, {p.city}
              <a href="#map-title" className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">View map</a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map(([Icon, label, value]) => (
              <div key={label} className="card flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={19} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-muted">{label}</p>
                  <p className="truncate text-sm font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-2xl font-semibold">About this property</h2>
            <p className="mt-3 leading-relaxed text-muted">{p.description}</p>
          </section>

          {p.amenities.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">Amenities</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-air/25"><Check size={14} /></span>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {p.documents?.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">Documents</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.documents.map((doc, i) => (
                  <li key={i}>
                    <a href={assetUrl(doc.url)} target="_blank" rel="noreferrer" download={doc.name} className="card card-hover flex items-center gap-3 p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText size={19} /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{doc.name}</span>
                      <Download size={17} className="shrink-0 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <PropertyMap property={p} />

          <section className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-brand-soft/60 px-5 py-4">
              <Compass size={22} className="text-brand" />
              <h2 className="font-display text-xl font-semibold">Orientation and Vastu notes</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-6 text-sm">
                <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Facing</p><p className="mt-0.5 font-bold">{p.facing}</p></div>
                {p.type && <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Type</p><p className="mt-0.5 font-bold">{p.type}</p></div>}
              </div>
              {p.vastuNotes && <p className="text-sm leading-relaxed">{p.vastuNotes}</p>}
              <Link to={`/vastu/book?property=${p.id}`} className="btn btn-outline btn-sm"><Sparkles size={16} /> Book a Vastu check for this property</Link>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card animate-fade-up space-y-5 p-5 [animation-delay:120ms]">
            <div>
              <p className="text-sm font-semibold text-muted">{p.listingType === 'rent' ? 'Monthly rent' : 'Price'}</p>
              <p className="font-display text-4xl font-semibold text-brand">{formatPrice(p.price, p.listingType)}</p>
              {p.listingType === 'sale' && <p className="text-xs text-muted">≈ ₹{Math.round(p.price / p.area).toLocaleString('en-IN')} per sq ft</p>}
            </div>
            <div className="space-y-2.5">
              <button className="btn btn-primary w-full" onClick={() => setEnquiry(true)}><MessageSquare size={18} /> Send enquiry</button>
              <button className="btn btn-outline w-full" onClick={() => setVisit(true)}><CalendarCheck size={18} /> Request site visit</button>
              <button className="btn btn-ghost w-full border border-line" onClick={() => toggle(p)} aria-pressed={saved}>
                <Heart size={18} className={saved ? 'fill-brand text-brand' : ''} /> {saved ? 'Shortlisted' : 'Add to shortlist'}
              </button>
            </div>
            {agent && (
              <div className="border-t border-line pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Listed by</p>
                <div className="flex items-center gap-3">
                  <Avatar name={agent.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{agent.name}</p>
                    <p className="text-xs text-muted">{agent.experience} years experience</p>
                    <RatingBadge rating={ratings[agent.id]} />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <a href={`tel:${agent.phone}`} className="flex items-center gap-2 font-semibold hover:text-brand"><Phone size={15} className="text-brand" /> {agent.phone}</a>
                  <a href={`mailto:${agent.email}`} className="flex items-center gap-2 break-all font-semibold hover:text-brand"><Mail size={15} className="shrink-0 text-brand" /> {agent.email}</a>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">Similar properties</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((s, i) => <PropertyCard key={s.id} property={s} index={i} />)}
          </div>
        </section>
      )}

      <EnquiryModal open={enquiry} onClose={() => setEnquiry(false)} property={p} />
      <SiteVisitModal open={visit} onClose={() => setVisit(false)} property={p} />
    </div>
  );
}
