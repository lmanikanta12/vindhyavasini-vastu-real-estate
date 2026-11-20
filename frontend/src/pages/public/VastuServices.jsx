import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, ChevronDown, ClipboardList, Clock, Compass, FileUp, Info, Languages } from 'lucide-react';
import ServiceIcon from '../../components/shared/ServiceIcon';
import Avatar from '../../components/ui/Avatar';
import Reveal from '../../components/ui/Reveal';
import { useData } from '../../context/DataContext';
import { ELEMENTS } from '../../lib/constants';
import { cn, money } from '../../lib/utils';
import ElementImage from '../../components/ui/ElementImage';

const FAQ = [
  ['What happens during a consultation?', 'Your consultant reviews the property type, orientation and floor plan, discusses your concerns, and records assessment notes. After the session you receive written recommendations in your dashboard.'],
  ['Do I need to share a floor plan?', 'It is optional but helpful. You can upload a floor plan or photographs while booking, and the consultant will review them before the session.'],
  ['Can I reschedule or cancel?', 'Yes. You can reschedule or cancel from My appointments in your dashboard before the consultation takes place.'],
  ['Are results guaranteed?', 'No. Our consultants give practical guidance to help you decide, but no specific outcome can be promised.'],
];

export default function VastuServices() {
  const { db } = useData();
  const [open, setOpen] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const services = db.services.filter((s) => s.active);
  const consultants = db.users.filter((u) => u.role === 'consultant' && u.status === 'Active');

  return (
    <div>
      <section className="bg-brand-soft/50">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow animate-fade-up">Vastu consultation</p>
            <h1 className="mt-3 animate-fade-up text-4xl font-semibold leading-tight [animation-delay:80ms] sm:text-5xl lg:text-4xl xl:text-5xl">Practical Vastu guidance for plots, homes and offices</h1>
            <p className="mt-4 animate-fade-up text-lg text-muted [animation-delay:160ms]">Book an appointment with an experienced consultant, share your layout, and receive clear written recommendations.</p>
            <Link to="/vastu/book" className="btn btn-primary mt-8 animate-fade-up px-6 py-3 [animation-delay:240ms]">Book a consultation <ArrowRight size={18} /></Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-sunken" />
            {imgFailed ? (
              <div className="flex h-52 items-center justify-center rounded-3xl bg-brand-soft text-brand sm:h-60 lg:h-64"><Compass size={64} /></div>
            ) : (
             <img
  src="https://images.unsplash.com/photo-1668911494256-becf9fea265b?auto=format&fit=crop&w=1000&q=75"
  alt="Vastu consultation"
  className="h-52 w-full rounded-3xl object-cover shadow-lift sm:h-60 lg:h-64"
  loading="eager"
  referrerPolicy="no-referrer"
  onError={() => setImgFailed(true)}
/>
            )}
          </div>
        </div>
      </section>

      <section className="container-page mt-16">
        <Reveal className="mb-8"><p className="eyebrow">Services</p><h2 className="mt-2 text-3xl font-semibold">Choose what fits your space</h2></Reveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 70}>
              <div className="card card-hover flex h-full flex-col p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><ServiceIcon name={s.icon} /></span>
                <h3 className="mt-5 text-xl font-semibold">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted"><Clock size={14} /> {s.duration} minutes · {s.mode}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="font-display text-xl font-semibold text-brand">{money(s.fee)}</span>
                  <Link to={`/vastu/book?service=${s.id}`} className="btn btn-primary btn-sm">Book</Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <Reveal className="mb-8"><p className="eyebrow">Process</p><h2 className="mt-2 text-3xl font-semibold">How a booking works</h2></Reveal>
        <div className="grid gap-5 md:grid-cols-4">
          {[
            [ClipboardList, 'Choose a service', 'Pick the consultation that matches your property.'],
            [FileUp, 'Share details', 'Add direction, concerns and an optional floor plan.'],
            [CalendarClock, 'Pick a slot', 'Select a consultant and an available time.'],
            [Info, 'Get guidance', 'Receive notes and recommendations after the session.'],
          ].map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 80}>
              <div className="relative h-full rounded-2xl border border-line bg-surface p-5">
                <span className="absolute right-4 top-3 font-display text-4xl font-semibold text-line">{i + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-on-brand"><Icon size={20} /></span>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-20 bg-sunken/60 py-16">
        <div className="container-page">
          <Reveal className="mb-8"><p className="eyebrow">Our consultants</p><h2 className="mt-2 text-3xl font-semibold">Meet the people behind the guidance</h2></Reveal>
          <div className="grid gap-5 md:grid-cols-2">
            {consultants.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
                <div className="card flex gap-4 p-5 sm:p-6">
                  <Avatar name={c.name} size="xl" />
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold">{c.name}</h3>
                    <p className="text-sm font-bold text-brand">{c.specialization}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{c.bio}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
                      <span>{c.experience} years experience</span>
                      <span className="inline-flex items-center gap-1.5"><Languages size={14} /> {c.languages?.join(', ')}</span>
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <Reveal className="mb-8"><p className="eyebrow">The five elements</p><h2 className="mt-2 text-3xl font-semibold">What we look at</h2></Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ELEMENTS.map((el, i) => (
            <Reveal key={el.key} delay={i * 70}>
              <div className="card p-4">
                <ElementImage el={el} size={200} className="mb-3 h-12 w-12 rounded-xl" />
                <p className="font-display text-lg font-semibold">{el.name}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-brand">{el.sanskrit}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{el.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-20 max-w-3xl">
        <Reveal className="mb-6 text-center"><p className="eyebrow">FAQ</p><h2 className="mt-2 text-3xl font-semibold">Common questions</h2></Reveal>
        <div className="space-y-3">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="card overflow-hidden">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold" aria-expanded={open === i}>
                {q}
                <ChevronDown size={20} className={cn('shrink-0 text-brand transition-transform duration-300', open === i && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-all duration-300', open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}