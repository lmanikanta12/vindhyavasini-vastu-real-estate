import { useState } from 'react';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Badge from '../ui/Badge';
import ServiceIcon, { SERVICE_ICON_NAMES } from './ServiceIcon';
import { Input, Select, Textarea, Toggle } from '../ui/Field';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { money } from '../../lib/utils';

const BLANK = { name: '', description: '', fee: '', duration: 60, mode: 'On-site or online', icon: 'Sparkles', active: true };

export default function ServicesManager() {
  const data = useData();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState({});

  const open = (svc) => {
    setEdit(svc || 'new');
    setF(svc ? { ...svc } : BLANK);
    setErr({});
  };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Add a service name.';
    if (!(Number(f.fee) > 0)) er.fee = 'Enter the fee.';
    setErr(er);
    if (Object.keys(er).length) return;
    const payload = { ...f, name: f.name.trim(), fee: Number(f.fee), duration: Number(f.duration) || 60 };
    const done = edit === 'new' ? await data.add('services', payload) : await data.update('services', edit.id, payload);
    if (!done) return;
    toast(edit === 'new' ? 'Service added.' : 'Service updated.');
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Consultation services"
        subtitle="The Vastu services customers can book. Inactive services are hidden from the website."
        actions={<button className="btn btn-primary" onClick={() => open()}><Plus size={18} /> Add service</button>}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.db.services.map((s, i) => (
          <div key={s.id} className="card card-hover flex animate-fade-up flex-col p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><ServiceIcon name={s.icon} /></span>
              <Badge tone={s.active ? 'air' : 'muted'}>{s.active ? 'Active' : 'Hidden'}</Badge>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{s.name}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="font-display text-xl font-semibold text-brand">{money(s.fee)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Clock size={13} /> {s.duration} min · {s.mode}</p>
              </div>
              <div className="flex gap-1">
                <button className="btn-icon" onClick={() => open(s)} aria-label={`Edit ${s.name}`}><Pencil size={18} /></button>
                <button className="btn-icon" onClick={() => setDel(s)} aria-label={`Delete ${s.name}`}><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === 'new' ? 'Add service' : 'Edit service'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
            <button type="submit" form="service-form" className="btn btn-primary">Save service</button>
          </>
        }
      >
        <form id="service-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input wrapperClass="sm:col-span-2" label="Service name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} required />
          <Textarea wrapperClass="sm:col-span-2" label="Description" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input label="Fee (₹)" type="number" min="0" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} error={err.fee} required />
          <Input label="Duration (minutes)" type="number" min="15" step="15" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} />
          <Select label="Mode" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={['Online', 'On-site', 'On-site or online']} />
          <Select label="Icon" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} options={SERVICE_ICON_NAMES} />
          <div className="sm:col-span-2">
            <Toggle label="Active" description="Customers can book this service" checked={f.active} onChange={(v) => setF({ ...f, active: v })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Delete this service?"
        message={`"${del?.name}" will be removed. Existing consultations keep their records.`}
        confirmLabel="Delete service"
        onConfirm={() => data.remove('services', del.id).then((ok) => ok && toast('Service deleted.'))}
      />
    </>
  );
}
