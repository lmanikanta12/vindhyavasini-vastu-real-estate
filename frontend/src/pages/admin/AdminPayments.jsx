import { useState } from 'react';
import { CheckCircle2, Clock, Download, IndianRupee, Plus, Receipt } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Tabs from '../../components/ui/Tabs';
import SearchInput from '../../components/ui/SearchInput';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { ReceiptModal } from '../../components/shared/PaymentModals';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Field';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/ui/Pagination';
import useServerList from '../../hooks/useServerList';
import { downloadReceipt } from '../../components/shared/PaymentModals';
import { downloadFile, fmtDate, money, toCSV } from '../../lib/utils';

export default function AdminPayments() {
  const data = useData();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [rec, setRec] = useState(null);
  const customers = data.usersByRole('customer');
  const openRecord = () => setRec({ customerId: customers[0]?.id || '', consultationId: '', description: '', amount: '', status: 'Completed', method: 'Cash' });
  const saveRecord = async (e) => {
    e.preventDefault();
    const cons = data.consultation(rec.consultationId);
    const description = rec.description.trim() || (cons ? `${data.service(cons.serviceId)?.name} (${cons.ref})` : 'Service charge');
    const saved = await data.add('payments', { customerId: rec.customerId, consultationId: rec.consultationId || null, description, amount: Number(rec.amount), status: rec.status, method: rec.status === 'Completed' ? rec.method : '' });
    if (!saved) return;
    toast(rec.status === 'Completed' ? 'Payment recorded and receipt emailed.' : 'Payment recorded.');
    setRec(null);
  };

  const list = useServerList('/payments', { filters: { status: tab }, search: q, limit: 15, sort: 'createdAt', dir: 'desc' });
  const rows = list.items;
  const t = data.db.totals || {};
  const [pdfBusy, setPdfBusy] = useState('');

  const exportCsv = () => {
    downloadFile('payments.csv', toCSV(rows.map((p) => ({ Receipt: p.ref, Customer: data.user(p.customerId)?.name, Service: p.description, Date: p.date, Amount: p.amount, Status: p.status, Method: p.method }))), 'text/csv');
    toast('Payments exported.');
  };

  return (
    <>
      <PageHeader title="Payments and service records" subtitle="Consultation fees, payment status and receipts." actions={<><button className="btn btn-outline" onClick={exportCsv}><Download size={17} /> Export CSV</button><button className="btn btn-primary" onClick={openRecord}><Plus size={17} /> Record payment</button></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard index={0} icon={CheckCircle2} tone="air" label="Collected" value={money(t.revenue)} />
        <StatCard index={1} icon={Clock} tone="fire" label="Pending" value={money(t.pending)} />
        <StatCard index={2} icon={IndianRupee} label="Total billed" value={money((t.revenue || 0) + (t.pending || 0))} />
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, { key: 'Pending', label: 'Pending' }, { key: 'Completed', label: 'Completed' }]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search payments" />
      </div>
      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        columns={[
          { key: 'ref', sort: 'ref', header: 'Receipt', render: (p) => <span className="font-bold">{p.ref}</span> },
          { key: 'customer', header: 'Customer', render: (p) => <span className="text-sm">{data.user(p.customerId)?.name}</span> },
          { key: 'description', header: 'Service' },
          { key: 'date', sort: 'date', header: 'Date', render: (p) => fmtDate(p.date) },
          { key: 'amount', sort: 'amount', header: 'Amount', render: (p) => <span className="font-bold text-brand">{money(p.amount)}</span> },
          { key: 'status', sort: 'status', header: 'Status', render: (p) => (
            <button title="Click to toggle status" onClick={() => { const next = p.status === 'Pending' ? 'Completed' : 'Pending'; data.update('payments', p.id, { status: next, method: next === 'Completed' ? p.method || 'Cash' : '' }).then((ok) => ok && toast(`${p.ref} marked ${next.toLowerCase()}.`)); }}><StatusBadge status={p.status} /></button>
          ) },
          { key: 'r', header: '', className: 'text-right', render: (p) => p.status === 'Completed' && (
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-sm border border-line" onClick={() => setReceipt(p)}><Receipt size={15} /> View</button>
              <button className="btn btn-outline btn-sm" disabled={pdfBusy === p.id} onClick={() => downloadReceipt(p, toast, (b) => setPdfBusy(b ? p.id : ''))}><Download size={15} /> PDF</button>
            </div>
          ) },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="payments" />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
      <Modal open={!!rec} onClose={() => setRec(null)} title="Record a payment or service charge" subtitle="Add fees collected offline or extra service charges" footer={<><button className="btn btn-ghost" onClick={() => setRec(null)}>Cancel</button><button className="btn btn-primary" type="submit" form="rec-form">Save record</button></>}>
        {rec && (
          <form id="rec-form" onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2">
            <Select wrapperClass="sm:col-span-2" label="Customer" value={rec.customerId} onChange={(e) => setRec({ ...rec, customerId: e.target.value, consultationId: '' })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
            <Select wrapperClass="sm:col-span-2" label="Linked consultation (optional)" value={rec.consultationId} placeholder="None - general service charge" onChange={(e) => { const c = data.consultation(e.target.value); setRec({ ...rec, consultationId: e.target.value, amount: c ? c.fee : rec.amount }); }} options={data.db.consultations.filter((c) => c.customerId === rec.customerId).map((c) => ({ value: c.id, label: `${c.ref} - ${data.service(c.serviceId)?.name}` }))} />
            <Input wrapperClass="sm:col-span-2" label="Description" placeholder="e.g. Site documentation charge" value={rec.description} onChange={(e) => setRec({ ...rec, description: e.target.value })} />
            <Input label="Amount (₹)" type="number" min="1" required value={rec.amount} onChange={(e) => setRec({ ...rec, amount: e.target.value })} />
            <Select label="Status" value={rec.status} onChange={(e) => setRec({ ...rec, status: e.target.value })} options={['Completed', 'Pending']} />
            {rec.status === 'Completed' && <Select wrapperClass="sm:col-span-2" label="Payment method" value={rec.method} onChange={(e) => setRec({ ...rec, method: e.target.value })} options={['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque']} />}
          </form>
        )}
      </Modal>
    </>
  );
}
