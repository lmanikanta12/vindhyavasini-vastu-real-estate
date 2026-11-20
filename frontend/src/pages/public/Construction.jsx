import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, ClipboardList, Compass, Hammer, HardHat, Home, KeyRound, PaintBucket, Send, Store } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { CONSTRUCTION_TYPES } from '../../lib/constants';

const SERVICES = [
  [Home, 'New house construction', 'Independent homes planned and built on your plot.'],
  [Building2, 'Apartment or villa construction', 'Multi-unit apartments, villas and gated layouts.'],
  [Store, 'Commercial building', 'Offices, shops and showrooms built for business use.'],
  [Hammer, 'Renovation and repairs', 'Structural repairs, extensions and remodelling.'],
  [PaintBucket, 'Interior work', 'Kitchens, wardrobes, flooring and finishing.'],
];
const STEPS = [
  [ClipboardList, 'Submit a request', 'Tell us what you want to build.'],
  [Compass, 'Site visit', 'Our team visits and checks the site.'],
  [Send, 'Quote and plan', 'You receive a quote and a Vastu-friendly plan.'],
  [HardHat, 'Construction', 'Work starts with regular status updates.'],
  [KeyRound, 'Handover', 'Final checks and handover to you.'],
];

export default function Construction() {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const blank = { name: user?.name || '', email: user?.email || '', phone: user?.phone || '', type: '', location: '', plotSize: '', budget: '', message: '' };
  const [f, setF] = useState(blank);
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const rec = await data.add('constructionRequests', {
      contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
      type: f.type,
      location: f.location.trim(),
      plotSize: f.plotSize.trim(),
      budget: f.budget.trim(),
      message: f.message.trim(),
    });
    setBusy(false);
    if (!rec) return;
    setSent(rec);
    toast('Construction request sent.');
  };

  return (
    <div>
      <section className="bg-brand-soft/50">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Construction</p>
            <h1 className="mt-2 max-w-2xl text-4xl font-semibold sm:text-5xl">Build your dream home with us</h1>
            <p className="mt-4 max-w-xl text-muted">From a new house to a renovation, we plan and build with Vastu-compliant layouts and clear communication at every stage.</p>
            <a href="#request" className="btn btn-primary mt-7">Request a quote</a>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-sunken" />
            {imgFailed ? (
              <div className="flex h-52 items-center justify-center rounded-3xl bg-brand-soft text-brand sm:h-60 lg:h-64"><HardHat size={64} /></div>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=75"
                alt="House under construction"
                className="h-52 w-full rounded-3xl object-cover shadow-lift sm:h-60 lg:h-64"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <p className="eyebrow">Our services</p>
        <h2 className="mt-2 text-3xl font-semibold">What we build</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(([Icon, t, d], i) => (
            <div key={t} className="card animate-fade-up p-6" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={21} /></span>
              <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sunken/50">
        <div className="container-page py-12 sm:py-16">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold">Five simple steps</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</span>
                <p className="mt-3 flex items-center gap-2 font-bold"><Icon size={16} className="text-brand" /> {t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="request" className="container-page scroll-mt-24 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Request form</p>
          <h2 className="mt-2 text-3xl font-semibold">Tell us about your project</h2>
          <div className="card mt-6 p-6 sm:p-8">
            {sent ? (
              <div className="py-6 text-center">
                <CheckCircle2 size={44} className="mx-auto text-brand" />
                <h3 className="mt-3 text-2xl font-semibold">Request received</h3>
                <p className="mt-2 text-muted">Your reference is <b className="text-ink">{sent.ref}</b>. Our team will contact you shortly.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {user?.role === 'customer' && <Link to="/customer/construction" className="btn btn-primary">View my requests</Link>}
                  <button className="btn btn-outline" onClick={() => { setSent(null); setF(blank); }}>Send another</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" value={f.name} onChange={set('name')} required />
                <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} required />
                <Input wrapperClass="sm:col-span-2" label="Email" type="email" value={f.email} onChange={set('email')} required />
                <Select label="Project type" value={f.type} onChange={set('type')} options={CONSTRUCTION_TYPES} placeholder="Select type" required />
                <Input label="Location" value={f.location} onChange={set('location')} required />
                <Input label="Plot size" placeholder="e.g. 30 x 40 ft" value={f.plotSize} onChange={set('plotSize')} required />
                <Input label="Budget" placeholder="e.g. ₹60 L - ₹80 L" value={f.budget} onChange={set('budget')} required />
                <Textarea wrapperClass="sm:col-span-2" label="Message" rows={4} value={f.message} onChange={set('message')} />
                <div className="sm:col-span-2"><button className="btn btn-primary" type="submit" disabled={busy}><Send size={17} /> {busy ? 'Sending' : 'Submit request'}</button></div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}