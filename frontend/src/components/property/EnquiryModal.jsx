import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { Input, Textarea } from '../ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function EnquiryModal({ open, onClose, property }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', requirements: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (open) {
      setDone(null);
      setErrors({});
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        message: property ? `Hi, I am interested in ${property.title} (${property.ref}). Please share more details.` : '',
        requirements: '',
      });
    }
  }, [open, user, property]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = {};
    if (!form.name.trim()) err.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 10) err.phone = 'Enter a valid phone number.';
    if (!form.message.trim()) err.message = 'Please write a short message.';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    const rec = await data.add('enquiries', {
      propertyId: property?.id || null,
      contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
      message: form.message.trim(),
      requirements: form.requirements.trim(),
    });
    setBusy(false);
    if (!rec) return;
    toast(`Enquiry ${rec.ref} sent. Our team will contact you soon.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? 'Enquiry received' : 'Send an enquiry'}
      subtitle={!done && property ? `${property.title} · ${property.ref}` : undefined}
      footer={
        done ? (
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="enquiry-form" className="btn btn-primary">Send enquiry</button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-4 flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-air/25 text-air"><CheckCircle2 size={34} /></span>
          <p className="font-display text-xl font-semibold">Thank you, {form.name.split(' ')[0]}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Your enquiry reference is <b className="text-ink">{done.ref}</b>. An agent will get back to you shortly.</p>
        </div>
      ) : (
        <form id="enquiry-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} required />
          <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} required />
          <Input wrapperClass="sm:col-span-2" label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} required />
          <Textarea wrapperClass="sm:col-span-2" label="Message" rows={3} value={form.message} onChange={set('message')} error={errors.message} required />
          <Textarea wrapperClass="sm:col-span-2" label="Your requirements" hint="Optional: budget, family size, preferred direction, timeline" rows={2} value={form.requirements} onChange={set('requirements')} />
        </form>
      )}
    </Modal>
  );
}
