import { useState } from 'react';
import { CheckCircle2, Clock, Download, Receipt, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { PayModal, ReceiptModal } from '../../components/shared/PaymentModals';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Pagination from '../../components/ui/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import useServerList from '../../hooks/useServerList';
import { downloadReceipt } from '../../components/shared/PaymentModals';
import { useToast } from '../../context/ToastContext';
import { fmtDate, money } from '../../lib/utils';

export default function CustomerPayments() {
  const { user } = useAuth();
  const { db } = useData();
  const [pay, setPay] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const list = useServerList('/payments', { filters: { status: tab }, search: q, limit: 10, sort: 'createdAt', dir: 'desc' });
  const [pdfBusy, setPdfBusy] = useState('');

  const rows = db.payments.filter((p) => p.customerId === user.id);
  const paid = rows.filter((r) => r.status === 'Completed').reduce((s, r) => s + r.amount, 0);
  const due = rows.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader title="Payments" subtitle="Consultation fees, payment status and receipts." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard index={0} icon={CheckCircle2} tone="air" label="Paid" value={money(paid)} />
        <StatCard index={1} icon={Clock} tone="fire" label="Pending" value={money(due)} />
        <StatCard index={2} icon={Wallet} label="Transactions" value={rows.length} />
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, { key: 'Pending', label: 'Pending' }, { key: 'Completed', label: 'Paid' }]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search payments" />
      </div>
      <DataTable
        rows={list.items}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        columns={[
          { key: 'ref', sort: 'ref', header: 'Receipt', render: (r) => <span className="font-bold">{r.ref}</span> },
          { key: 'description', header: 'Service' },
          { key: 'date', sort: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
          { key: 'amount', sort: 'amount', header: 'Amount', render: (r) => <span className="font-bold text-brand">{money(r.amount)}</span> },
          { key: 'status', sort: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'action',
            header: '',
            className: 'text-right',
            render: (r) =>
              r.status === 'Pending' ? (
                <button className="btn btn-primary btn-sm" onClick={() => setPay(r)}>Pay now</button>
              ) : (
                <div className="flex justify-end gap-2">
                  <button className="btn btn-ghost btn-sm border border-line" onClick={() => setReceipt(r)}><Receipt size={15} /> View</button>
                  <button className="btn btn-outline btn-sm" disabled={pdfBusy === r.id} onClick={() => downloadReceipt(r, toast, (b) => setPdfBusy(b ? r.id : ''))}><Download size={15} /> PDF</button>
                </div>
              ),
          },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="payments" />
      {pay && <PayModal key={pay.id} payment={pay} onClose={() => setPay(null)} onReceipt={setReceipt} />}
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
