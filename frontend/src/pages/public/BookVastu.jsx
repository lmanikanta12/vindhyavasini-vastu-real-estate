import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Disclaimer from '../../components/ui/Disclaimer';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, FileUp, Trash2 } from 'lucide-react';
import ServiceIcon from '../../components/shared/ServiceIcon';
import LoginPrompt from '../../components/shared/LoginPrompt';
import Avatar from '../../components/ui/Avatar';
import { RatingBadge } from '../../components/ui/Stars';
import useRatings from '../../hooks/useRatings';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { DIRECTIONS, TIME_SLOTS } from '../../lib/constants';
import { api, uploadFile } from '../../lib/api';
import { addDays, assetUrl, cn, fmtDate, fmtTime, money } from '../../lib/utils';

const STEPS = ['Service', 'Property', 'Schedule', 'Review'];
const TYPES = ['Plot', 'House', 'Villa', 'Apartment', 'Office', 'Shop', 'Factory'];

function DirectionPicker({ value, onChange }) {
  const grid = [['North-West', 'North', 'North-East'], ['West', null, 'East'], ['South-West', 'South', 'South-East']];
  return (
    <div className="grid w-fit grid-cols-3 gap-2" role="radiogroup" aria-label="Facing direction">
      {grid.flat().map((d, i) =>
        d ? (
          <button type="button" key={d} role="radio" aria-checked={value === d} onClick={() => onChange(d)} className={cn('flex h-16 w-24 items-center justify-center rounded-xl border px-1 text-center text-xs font-bold transition-all sm:h-[4.25rem] sm:w-28', value === d ? 'border-brand bg-brand text-on-brand shadow-sm' : 'border-line bg-surface hover:border-brand/60')}>
            {d}
          </button>
        ) : (
          <div key={i} className="flex h-16 w-24 items-center justify-center rounded-xl bg-sunken text-[11px] font-bold uppercase tracking-wider text-muted sm:h-[4.25rem] sm:w-28">Centre</div>
        )
      )}
    </div>
  );
}

export default function BookVastu() {
  const { user } = useAuth();
  const data = useData();
  const ratings = useRatings();
  const toast = useToast();
  const [params] = useSearchParams();
  const linked = data.property(params.get('property'));

  const services = data.db.services.filter((s) => s.active);
  const consultants = data.usersByRole('consultant').filter((c) => c.status === 'Active');

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState({});
  const [f, setF] = useState({
    serviceId: params.get('service') || '',
    propertyType: linked ? (linked.category === 'Plot' ? 'Plot' : linked.type.includes('Office') ? 'Office' : 'House') : 'House',
    direction: linked?.facing || 'East',
    address: linked ? `${linked.address}, ${linked.city}` : '',
    concerns: '',
    floorPlans: [],
    consultantId: '',
    date: '',
    time: '',
    agree: false,
  });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const service = services.find((s) => s.id === f.serviceId);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(i + 1)), []);

  const [takenMap, setTakenMap] = useState({});
  useEffect(() => {
    if (!f.date) return undefined;
    let alive = true;
    Promise.all(consultants.map((c) => api(`/consultations/taken?consultantId=${c.id}&date=${f.date}`).then((r) => [`${c.id}|${f.date}`, r.taken]).catch(() => [`${c.id}|${f.date}`, []]))).then((rows) => {
      if (alive) setTakenMap((m) => ({ ...m, ...Object.fromEntries(rows) }));
    });
    return () => { alive = false; };

  }, [f.date, consultants.length]);

  const slotsFor = (consultant, date) => {
    if (!consultant?.availability || !date) return [];
    const av = consultant.availability;
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (!av.days.includes(dow) || av.blocked.includes(date)) return [];
    const taken = takenMap[`${consultant.id}|${date}`] || [];
    return av.slots.filter((s) => !taken.includes(s));
  };

  const availableOn = (date) => consultants.filter((c) => slotsFor(c, date).length > 0);
  const chosen = consultants.find((c) => c.id === f.consultantId);

  const next = () => {
    const er = {};
    if (step === 0 && !f.serviceId) er.service = 'Please choose a service to continue.';
    if (step === 1 && !f.address.trim()) er.address = 'Add the property location.';
    if (step === 2) {
      if (!f.date) er.date = 'Select a date.';
      else if (!f.consultantId) er.consultant = 'Select a consultant.';
      else if (!f.time) er.time = 'Select a time slot.';
    }
    setErrors(er);
    if (!Object.keys(er).length) setStep((s) => s + 1);
  };

  const addFiles = async (e) => {
    const files = [...e.target.files].slice(0, 3 - f.floorPlans.length);
    e.target.value = '';
    const out = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name} is larger than 8 MB.`, 'error'); continue; }
      try {
        const up = await uploadFile(file, { maxWidth: 1600 });
        out.push({ name: file.name, url: up.url });
      } catch (err) {
        toast(err.message, 'error');
      }
    }
    set({ floorPlans: [...f.floorPlans, ...out] });
  };

  const [saving, setSaving] = useState(false);
  const confirm = async () => {
    if (saving) return;
    setSaving(true);

    const rec = await data.add('consultations', {
      serviceId: f.serviceId,
      consultantId: f.consultantId,
      propertyId: linked?.id || null,
      propertyType: f.propertyType,
      direction: f.direction,
      address: f.address.trim(),
      concerns: f.concerns.trim(),
      floorPlans: f.floorPlans,
      date: f.date,
      time: f.time,
    });
    setSaving(false);
    if (!rec) { setF((x) => ({ ...x, time: '' })); setStep(2); return; }
    setDone(rec);
    toast('Consultation requested. A confirmation was emailed to you.');
  };

  if (!user || user.role !== 'customer') {
    return (
      <div className="container-page max-w-xl py-16">
        <div className="card p-6">
          <h1 className="text-center text-2xl font-semibold">Book a Vastu consultation</h1>
          <LoginPrompt staff={!!user} message="Log in or create a free account to book a consultation and track it from your dashboard." />
        </div>
        <Disclaimer className="mt-5" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page max-w-xl py-14">
        <div className="card animate-scale-in p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-air/25 text-air"><CheckCircle2 size={36} /></span>
          <h1 className="mt-5 text-3xl font-semibold">Request received</h1>
          <p className="mt-2 text-muted">Reference <b className="text-ink">{done.ref}</b>. {chosen?.name.split(' ').slice(0, 2).join(' ')} will confirm your appointment for <b className="text-ink">{fmtDate(done.date)}, {fmtTime(done.time)}</b>.</p>
          <p className="mt-3 text-sm text-muted">A pending payment of {money(done.fee)} has been added to your Payments page.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/customer/appointments" className="btn btn-primary">View appointments</Link>
            <Link to="/customer/payments" className="btn btn-outline">Go to payments</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <p className="eyebrow">Vastu consultation</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Book a consultation</h1>
      <Disclaimer className="mt-5" />

      <ol className="mt-8 flex items-center" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <span className="flex items-center gap-2">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300', i < step ? 'border-brand bg-brand text-on-brand' : i === step ? 'border-brand text-brand' : 'border-line text-muted')}>
                {i < step ? <Check size={17} /> : i + 1}
              </span>
              <span className={cn('hidden text-sm font-bold sm:inline', i === step ? 'text-ink' : 'text-muted')}>{s}</span>
            </span>
            {i < STEPS.length - 1 && <span className={cn('mx-3 h-0.5 flex-1 rounded transition-colors duration-500', i < step ? 'bg-brand' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      <div key={step} className="card mt-8 animate-fade-up p-5 sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-semibold">Choose a service</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button key={s.id} onClick={() => set({ serviceId: s.id })} className={cn('flex gap-4 rounded-2xl border p-4 text-left transition-all', f.serviceId === s.id ? 'border-brand bg-brand-soft shadow-sm' : 'border-line hover:border-brand/50')} aria-pressed={f.serviceId === s.id}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand"><ServiceIcon name={s.icon} size={20} /></span>
                  <span className="min-w-0">
                    <span className="block font-bold">{s.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{s.description}</span>
                    <span className="mt-2 flex items-center gap-3 text-xs font-bold"><span className="text-brand">{money(s.fee)}</span><span className="inline-flex items-center gap-1 text-muted"><Clock size={12} /> {s.duration} min</span></span>
                  </span>
                </button>
              ))}
            </div>
            {errors.service && <p className="mt-3 text-sm font-semibold text-red-600">{errors.service}</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Tell us about the property</h2>
            {linked && <p className="rounded-xl bg-sunken px-4 py-3 text-sm">Linked listing: <b>{linked.title}</b> ({linked.ref})</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Property type" value={f.propertyType} onChange={(e) => set({ propertyType: e.target.value })} options={TYPES} />
              <Input label="Location" placeholder="Locality and city" value={f.address} onChange={(e) => set({ address: e.target.value })} error={errors.address} required />
            </div>
            <div>
              <span className="label">Facing direction of the main entrance or plot</span>
              <DirectionPicker value={f.direction} onChange={(d) => set({ direction: d })} />
            </div>
            <Textarea label="Your concerns" hint="Optional: rooms, entrance, plot shape, anything you want the consultant to focus on" rows={4} value={f.concerns} onChange={(e) => set({ concerns: e.target.value })} />
            <div>
              <span className="label">Floor plan or images (optional, up to 3)</span>
              <div className="flex flex-wrap items-center gap-3">
                {f.floorPlans.map((fp, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2 text-sm font-semibold">
                    {/\.(jpe?g|png|webp)$/i.test(fp.url || '') ? <img src={assetUrl(fp.url)} alt="" className="h-7 w-7 rounded object-cover" /> : <FileUp size={16} className="text-brand" />}
                    <span className="max-w-[10rem] truncate">{fp.name}</span>
                    <button type="button" onClick={() => set({ floorPlans: f.floorPlans.filter((_, j) => j !== i) })} aria-label={`Remove ${fp.name}`} className="text-muted hover:text-ink"><Trash2 size={15} /></button>
                  </span>
                ))}
                {f.floorPlans.length < 3 && (
                  <label className="btn btn-outline btn-sm cursor-pointer"><FileUp size={16} /> Upload file<input type="file" accept="image/*,.pdf" multiple className="sr-only" onChange={addFiles} /></label>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Pick a date and time</h2>
            <div>
              <span className="label">Date</span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dates.map((d) => {
                  const n = availableOn(d).length;
                  const dt = new Date(`${d}T00:00:00`);
                  return (
                    <button key={d} disabled={!n} onClick={() => set({ date: d, consultantId: '', time: '' })} className={cn('flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border py-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-40', f.date === d ? 'border-brand bg-brand text-on-brand shadow-sm' : 'border-line hover:border-brand/60')}>
                      <span className="text-[11px] font-bold uppercase">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                      <span className="font-display text-xl font-semibold leading-tight">{dt.getDate()}</span>
                      <span className="text-[11px] font-semibold opacity-80">{dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
              {errors.date && <p className="text-sm font-semibold text-red-600">{errors.date}</p>}
            </div>

            {f.date && (
              <div className="animate-fade-up">
                <span className="label">Consultant</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableOn(f.date).map((c) => (
                    <button key={c.id} onClick={() => set({ consultantId: c.id, time: '' })} className={cn('flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all', f.consultantId === c.id ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/50')}>
                      <Avatar name={c.name} size="lg" />
                      <span className="min-w-0"><span className="block truncate font-bold">{c.name}</span><span className="block truncate text-xs text-muted">{c.specialization}</span><RatingBadge rating={ratings[c.id]} /><span className="text-xs font-semibold text-brand">{slotsFor(c, f.date).length} slots open</span></span>
                    </button>
                  ))}
                </div>
                {errors.consultant && <p className="mt-2 text-sm font-semibold text-red-600">{errors.consultant}</p>}
              </div>
            )}

            {chosen && (
              <div className="animate-fade-up">
                <span className="label">Time</span>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.filter((t) => chosen.availability.slots.includes(t)).map((t) => {
                    const free = slotsFor(chosen, f.date).includes(t);
                    return <button key={t} disabled={!free} onClick={() => set({ time: t })} className={cn('chip', f.time === t && 'chip-active', !free && 'cursor-not-allowed line-through opacity-40')}>{fmtTime(t)}</button>;
                  })}
                </div>
                {errors.time && <p className="mt-2 text-sm font-semibold text-red-600">{errors.time}</p>}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Review and confirm</h2>
            <dl className="divide-y divide-line rounded-2xl border border-line">
              {[
                ['Service', service?.name],
                ['Consultant', chosen?.name],
                ['When', `${fmtDate(f.date)} at ${fmtTime(f.time)}`],
                ['Property', `${f.propertyType}, ${f.direction} facing`],
                ['Location', f.address],
                ['Concerns', f.concerns || '-'],
                ['Attachments', f.floorPlans.length ? f.floorPlans.map((x) => x.name).join(', ') : 'None'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6"><dt className="w-32 shrink-0 text-sm text-muted">{k}</dt><dd className="text-sm font-semibold">{v}</dd></div>
              ))}
              <div className="flex items-center justify-between bg-sunken/60 px-4 py-4"><dt className="font-bold">Consultation fee</dt><dd className="font-display text-2xl font-semibold text-brand">{money(service?.fee)}</dd></div>
            </dl>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4.5 w-4.5 accent-[rgb(var(--c-brand))]" checked={f.agree} onChange={(e) => set({ agree: e.target.checked })} />
              <span>I have read the <Link to="/disclaimer" className="font-bold text-brand underline" target="_blank">Disclaimer</Link> and understand that this consultation is guidance only, not a guarantee of any result.</span>
            </label>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft size={17} /> Back</button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={next}>Continue <ArrowRight size={17} /></button>
          ) : (
            <button className="btn btn-primary" onClick={confirm} disabled={!f.agree || saving}>{saving ? 'Booking...' : 'Confirm booking'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
