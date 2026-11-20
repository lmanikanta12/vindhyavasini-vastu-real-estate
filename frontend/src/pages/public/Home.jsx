import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CalendarCheck, Compass, Home as HomeIcon, MapPin, Search, SearchCheck, Store, Trees, Users } from 'lucide-react';
import PropertyCard from '../../components/property/PropertyCard';
import PropertyArt from '../../components/property/PropertyArt';
import ServiceIcon from '../../components/shared/ServiceIcon';
import Reveal from '../../components/ui/Reveal';
import { StatusBadge } from '../../components/ui/Badge';
import { useData } from '../../context/DataContext';
import { ELEMENTS, PROPERTY_CATEGORIES } from '../../lib/constants';
import { formatPrice, money } from '../../lib/utils';
import ElementImage from '../../components/ui/ElementImage';

const CATEGORY_TILES = {
  Residential: { icon: HomeIcon, text: 'Villas, apartments and independent houses' },
  Commercial: { icon: Store, text: 'Offices, shops and showrooms' },
  Rental: { icon: Building2, text: 'Homes and workspaces on rent' },
  Plot: { icon: Trees, text: 'Approved plots and land parcels' },
};


export default function Home() {
  const { db } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const live = db.properties.filter((p) => p.published);
  const featured = live.filter((p) => p.featured && p.status === 'Available').slice(0, 3);
  const hero = live.find((p) => p.featured) || live[0];
  const services = db.services.filter((s) => s.active).slice(0, 3);

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (cat) params.set('category', cat);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div>

      <section className="relative overflow-hidden">
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="container-page relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="eyebrow animate-fade-up">Buy · Rent · Vastu</p>
            <h1 className="mt-4 animate-fade-up text-4xl font-semibold leading-[1.1] [animation-delay:80ms] sm:text-5xl lg:text-[3.5rem]">
              Homes in harmony with the <span className="text-brand">five elements</span>
            </h1>
            <p className="mt-5 max-w-xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:160ms]">Search verified properties and book a Vastu consultation.</p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
              <Link to="/properties" className="btn btn-primary px-6 py-3 text-[15px]">Browse properties <ArrowRight size={18} /></Link>
              <Link to="/vastu/book" className="btn btn-outline px-6 py-3 text-[15px]">Book Vastu</Link>
            </div>

            <form onSubmit={search} className="card mt-10 flex animate-fade-up flex-col gap-3 p-3 [animation-delay:320ms] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input border-0 bg-transparent pl-10 focus:ring-0" placeholder="Locality, project or reference ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search location" />
              </div>
              <select className="input w-full border-0 bg-transparent sm:w-44" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {PROPERTY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button className="btn btn-primary" type="submit"><Search size={18} /> Search</button>
            </form>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:200ms] lg:max-w-none">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-sunken" />
            <div className="animate-float">
              {hero ? (
                <div className="card overflow-hidden p-3">
                  <div className="aspect-[16/11] overflow-hidden rounded-xl"><PropertyArt property={hero} /></div>
                  <div className="flex items-start justify-between gap-3 p-3 pt-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">{hero.title}</h3>
                      <p className="text-sm text-muted">{hero.location} · {hero.area.toLocaleString('en-IN')} sq ft</p>
                      <p className="mt-1 font-display text-xl font-semibold text-brand">{formatPrice(hero.price, hero.listingType)}</p>
                    </div>
                    <StatusBadge status={hero.status} />
                  </div>
                </div>
              ) : (
                <div className="card flex aspect-[16/12] flex-col items-center justify-center gap-3 p-8 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Building2 size={26} /></span>
                  <h3 className="font-display text-lg font-semibold">New listings are on the way</h3>
                  <p className="max-w-xs text-sm text-muted">Properties added by our agents appear here. Meanwhile, you can book a Vastu consultation.</p>
                  <Link to="/vastu/book" className="btn btn-outline btn-sm">Book Vastu</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page">
        <Reveal className="card grid grid-cols-2 gap-6 p-6 sm:p-8 lg:grid-cols-4">
          {[
            [live.length, 'Verified listings', Building2],
            [db.users.filter((u) => u.role === 'consultant').length, 'Vastu consultants', Compass],
            [db.users.filter((u) => u.role === 'agent').length, 'Property agents', Users],
            [db.services.filter((s) => s.active).length, 'Consultation services', CalendarCheck],
          ].map(([n, l, Icon]) => (
            <div key={l} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={22} /></span>
              <div>
                <p className="font-display text-2xl font-semibold leading-none">{n}</p>
                <p className="mt-1 text-[13px] font-semibold text-muted">{l}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {featured.length > 0 && (
      <section className="container-page mt-20">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 text-3xl font-semibold">Handpicked properties</h2>
          </div>
          <Link to="/properties" className="hidden items-center gap-1.5 text-sm font-bold text-brand hover:underline sm:inline-flex">View all <ArrowRight size={16} /></Link>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
        </div>
      </section>
      )}

      <section className="container-page mt-20">
        <Reveal className="mb-8">
          <p className="eyebrow">Explore</p>
          <h2 className="mt-2 text-3xl font-semibold">Find the right kind of space</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROPERTY_CATEGORIES.map((c, i) => {
            const meta = CATEGORY_TILES[c];
            const count = live.filter((p) => p.category === c).length;
            return (
              <Reveal key={c} delay={i * 80}>
                <Link to={`/properties?category=${c}`} className="card card-hover group block h-full p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand transition-all duration-300 group-hover:bg-brand group-hover:text-on-brand"><meta.icon size={24} /></span>
                  <h3 className="mt-5 text-xl font-semibold">{c === 'Plot' ? 'Plots and land' : c}</h3>
                  <p className="mt-1.5 text-sm text-muted">{meta.text}</p>
                  <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-brand">{count} listings <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mt-24 bg-sunken/60 py-16 sm:py-20">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The five elements</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Balance, from the ground up</h2>
            <p className="mt-4 text-muted">Vastu looks at how a building relates to Earth, Water, Fire, Air and Space. Our consultants translate these ideas into clear, practical guidance for your property.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ELEMENTS.map((el, i) => (
              <Reveal key={el.key} delay={i * 90}>
                <div className="card card-hover h-full p-5">
                  <ElementImage el={el} size={200} className="h-14 w-14 rounded-2xl" />
                  <h3 className="mt-4 text-lg font-semibold">{el.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">{el.sanskrit}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{el.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <Reveal className="mb-10 text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold">From search to settled</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [SearchCheck, 'Discover', 'Filter by location, budget, size and facing direction. Shortlist and compare your favourites.'],
            [CalendarCheck, 'Visit', 'Send an enquiry and request a site visit. Track every update from your dashboard.'],
            [Compass, 'Consult', 'Book a Vastu consultation for a plot, home or office and receive written recommendations.'],
          ].map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 100}>
              <div className="card h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-on-brand"><Icon size={22} /></span>
                  <span className="font-display text-5xl font-semibold text-line">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Vastu consultation</p>
            <h2 className="mt-2 text-3xl font-semibold">Guidance for every kind of space</h2>
          </div>
          <Link to="/vastu" className="hidden items-center gap-1.5 text-sm font-bold text-brand hover:underline sm:inline-flex">All services <ArrowRight size={16} /></Link>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 90}>
              <div className="card card-hover flex h-full flex-col p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><ServiceIcon name={s.icon} /></span>
                <h3 className="mt-5 text-xl font-semibold">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="font-display text-lg font-semibold text-brand">{money(s.fee)}</span>
                  <Link to={`/vastu/book?service=${s.id}`} className="btn btn-outline btn-sm">Book now</Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <Reveal className="relative overflow-hidden rounded-3xl bg-[#7A3418] p-8 text-center sm:p-14">
          <div className="pattern-dots pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-[#F8F2E6] sm:text-4xl">Ready to find a home that feels right?</h2>
            <p className="mx-auto mt-3 max-w-xl text-[#F8F2E6]/80">Create a free account to shortlist properties, request visits and book consultations in one place.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn bg-[#F8F2E6] text-[#7A3418] hover:-translate-y-0.5 hover:shadow-lift">Create free account</Link>
              <Link to="/contact" className="btn border border-[#F8F2E6]/50 text-[#F8F2E6] hover:bg-[#F8F2E6]/10">Talk to our team</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
