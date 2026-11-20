import { useState } from 'react';
import { HardHat } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { CONSTRUCTION_STATUSES } from '../../lib/constants';
import { fmtDate, money } from '../../lib/utils';

export default function AdminConstruction() {
  const data = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState('');

  const all = data.db.constructionRequests;
  const staff = data.db.users.filter((u) => u.role === 'agent');
  const rows = all.filter((r) => (tab === 'all' || r.status === tab) && `${r.ref} ${r.contact.name} ${r.type} ${r.location}`.toLowerCase().includes(q.toLowerCase()));
  const cur = all.find((r) => r.id === openId);
  const patch = (p) => data.update('constructionRequests', cur.id, p);
  const open = (r) => { setOpenId(r.id); setQuote(r.quote ?? ''); };
  const saveQuote = async () => { if (await patch({ quote: quote === '' ? null : Number(quote) })) toast('Quote saved.'); };

  const columns = [
    { key: 'ref', header: 'Ref', render: (r) => <b>{r.ref}</b> },
    { key: 'cust', header: 'Customer', render: (r) => <div><p className="font-semibold">{r.contact.name}</p><p className="text-xs text-muted">{r.contact.phone}</p></div> },
    { key: 'type', header: 'Project' },
    { key: 'location', header: 'Location' },
    { key: 'quote', header: 'Quote', render: (r) => (r.quote ? money(r.quote) : '-') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', header: 'Received', render: (r) => fmtDate(r.createdAt) },
  ];

  const addNote = async () => {
    if (!note.trim()) return;
    if (await data.addConstructionNote(cur.id, note.trim())) { setNote(''); toast('Note added.'); }
  };

  return (
    <>
      <PageHeader title="Construction" subtitle="Manage construction requests, assign staff, share quotes and update status." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All', count: all.length }, ...CONSTRUCTION_STATUSES.map((s) => ({ key: s, label: s, count: all.filter((r) => r.status === s).length }))]} />
        <SearchInput className="sm:w-64" value={q} onChange={setQ} placeholder="Search requests..." />
      </div>
      <DataTable columns={columns} rows={rows} onRowClick={open} empty={<EmptyState icon={HardHat} title="No construction requests" message="Requests from the Construction page appear here." />} />

      <Modal open={!!cur} onClose={() => setOpenId(null)} title={cur ? `${cur.type} · ${cur.ref}` : ''} subtitle={cur ? `${cur.contact.name} · ${cur.contact.phone} · ${cur.contact.email}` : ''} size="lg">
        {cur && (
          <div className="space-y-5">
            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <p><span className="text-muted">Location: </span>{cur.location}</p>
              <p><span className="text-muted">Plot size: </span>{cur.plotSize || '-'}</p>
              <p><span className="text-muted">Budget: </span>{cur.budget || '-'}</p>
            </div>
            {cur.message && <p className="rounded-xl bg-sunken/60 p-3 text-sm">{cur.message}</p>}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Status" value={cur.status} onChange={(e) => { patch({ status: e.target.value }); toast('Status updated.'); }} options={CONSTRUCTION_STATUSES} />
              <Select label="Assigned to" value={cur.assignedTo || ''} onChange={(e) => { patch({ assignedTo: e.target.value || null }); toast('Staff assigned.'); }} options={staff.map((s) => ({ value: s.id, label: s.name }))} placeholder="Unassigned" />
              <div>
                <Input label="Quote (₹)" type="number" min="0" value={quote} onChange={(e) => setQuote(e.target.value)} />
                <button className="btn btn-outline btn-sm mt-2" onClick={saveQuote} disabled={String(quote) === String(cur.quote ?? '')}>Save quote</button>
              </div>
            </div>
            <div>
              <p className="label">Notes</p>
              <ul className="mb-3 space-y-2 text-sm">
                {cur.notes.length === 0 && <li className="text-muted">No notes yet.</li>}
                {cur.notes.map((n) => <li key={n.id} className="rounded-xl bg-sunken/60 p-3">{n.text}<span className="block text-xs text-muted">{n.by} · {fmtDate(n.at)}</span></li>)}
              </ul>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (the customer can see it)..." />
              <button className="btn btn-outline btn-sm mt-2" onClick={addNote}>Add note</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
