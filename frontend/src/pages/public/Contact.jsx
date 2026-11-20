import { useState } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Input, Textarea } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function Contact() {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const s = data.db.settings;
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', message: '' });
  const [sent, setSent] = useState(null);

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const rec = await data.add('enquiries', { propertyId: null, contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() }, message: f.message.trim(), requirements: '' });
    setBusy(false);
    if (!rec) return;
    setSent(rec);
    toast('Message sent. A confirmation was emailed to you.');
  };

  const info = [
    [MapPin, 'Visit us', s.address],
    [Phone, 'Call', s.phone],
    [Mail, 'Email', s.email],
    [Clock, 'Hours', s.hours],
  ];

  return (
    <div className="container-page py-10 sm:py-16">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold">We would love to hear from you</h1>
      <p className="mt-3 max-w-xl text-muted">Questions about a property or a consultation? Send a message and our team will reply within one working day.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {info.map(([Icon, t, v], i) => (
            <div key={t} className="card flex animate-fade-up items-start gap-4 p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={20} /></span>
              <div><p className="text-xs font-bold uppercase tracking-wider text-muted">{t}</p><p className="mt-0.5 font-semibold">{v}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8 lg:col-span-3">
          {sent ? (
            <div className="flex animate-scale-in flex-col items-center py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-air/25 text-air"><CheckCircle2 size={34} /></span>
              <h2 className="mt-5 text-2xl font-semibold">Message sent</h2>
              <p className="mt-2 text-muted">Your reference is <b className="text-ink">{sent.ref}</b>. We will be in touch shortly.</p>
              <button className="btn btn-outline mt-6" onClick={() => { setSent(null); setF({ ...f, message: '' }); }}>Send another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
              <Input label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
              <Input wrapperClass="sm:col-span-2" label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
              <Textarea wrapperClass="sm:col-span-2" label="How can we help?" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
              <div className="sm:col-span-2"><button className="btn btn-primary" type="submit"><Send size={17} /> Send message</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
