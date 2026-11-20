import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { BarChart, DonutChart, HBars } from '../../components/charts/Charts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { api, downloadFromApi, qs } from '../../lib/api';
import { cn, fmtDate, money, toISO, todayISO } from '../../lib/utils';
import { IndianRupee, MessageSquare, CalendarDays, Clock } from 'lucide-react';

const monthStart = (offset = 0) => { const d = new Date(); return toISO(new Date(d.getFullYear(), d.getMonth() + offset, 1)); };
const PRESETS = [
  { key: 'm', label: 'This month', range: () => ({ from: monthStart(0), to: todayISO() }) },
  { key: '3', label: 'Last 3 months', range: () => ({ from: monthStart(-2), to: todayISO() }) },
  { key: '6', label: 'Last 6 months', range: () => ({ from: monthStart(-5), to: todayISO() }) },
  { key: 'y', label: 'This year', range: () => ({ from: `${new Date().getFullYear()}-01-01`, to: todayISO() }) },
  { key: 'all', label: 'All time', range: () => ({ from: '2000-01-01', to: todayISO() }) },
];

const Table = ({ head, rows, empty = 'No data in this period.' }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[320px] text-left text-sm">
      <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted">{head.map((h, i) => <th key={h} className={cn('py-2 pr-3 font-bold', i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={head.length} className="py-6 text-center text-muted">{empty}</td></tr>}
        {rows.map((r, i) => <tr key={i} className="border-b border-line/60 last:border-0">{r.map((c, j) => <td key={j} className={cn('py-2.5 pr-3', j > 0 && 'text-right tabular-nums', j === 0 && 'font-semibold')}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

export default function AdminReports() {
  const { version } = useData();
  const toast = useToast();
  const [range, setRange] = useState(PRESETS[2].range());
  const [preset, setPreset] = useState('6');
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const bad = range.from > range.to;
  const query = useMemo(() => qs(range), [range]);

  useEffect(() => {
    if (bad) return undefined;
    let live = true;
    api(`/reports/summary${query}`).then((r) => { if (live) { setRep(r.report); setErr(''); } }).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [query, bad, version]);

  const pick = (p) => { setPreset(p.key); setRange(p.range()); };
  const exportAs = async (kind) => {
    setBusy(kind);
    try {
      await downloadFromApi(`/reports/export.${kind}${query}`, `vastu-report-${range.from}-to-${range.to}.${kind}`);
      toast(kind === 'xlsx' ? 'Excel report downloaded.' : 'PDF report downloaded.');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const t = rep?.totals;
  const entries = (o = {}) => Object.entries(o).map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Revenue, enquiries, appointments and staff performance for any period."
        actions={
          <>
            <button className="btn btn-outline btn-sm" disabled={!rep || !!busy} onClick={() => exportAs('xlsx')}>{busy === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Export Excel</button>
            <button className="btn btn-primary btn-sm" disabled={!rep || !!busy} onClick={() => exportAs('pdf')}>{busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Export PDF</button>
          </>
        }
      />

      <section className="card mb-6 p-4 sm:p-5" aria-label="Report period">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="rep-from">From</label>
            <input id="rep-from" type="date" className="input" max={range.to} value={range.from} onChange={(e) => { setPreset(''); setRange((r) => ({ ...r, from: e.target.value })); }} />
          </div>
          <div>
            <label className="label" htmlFor="rep-to">To</label>
            <input id="rep-to" type="date" className="input" min={range.from} value={range.to} onChange={(e) => { setPreset(''); setRange((r) => ({ ...r, to: e.target.value })); }} />
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            {PRESETS.map((p) => <button key={p.key} onClick={() => pick(p)} className={cn('chip', preset === p.key && 'chip-active')}>{p.label}</button>)}
          </div>
        </div>
        {bad && <p className="mt-3 text-sm font-semibold text-red-600">The start date must be before the end date.</p>}
        <p className="mt-3 text-xs text-muted">Revenue counts payments marked paid in the period. Appointments are counted by their appointment date, enquiries by the date received.</p>
      </section>

      {err && <p className="card mb-6 p-4 text-sm font-semibold text-red-600">{err}</p>}
      {!rep && !err && <p className="py-16 text-center text-sm font-semibold text-muted">Preparing report...</p>}

      {rep && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} icon={IndianRupee} tone="air" label="Revenue (paid)" value={money(t.revenue)} hint={`${t.payments} payments`} />
            <StatCard index={1} icon={Clock} tone="fire" label="Pending fees" value={money(t.pending)} />
            <StatCard index={2} icon={MessageSquare} tone="water" label="Enquiries" value={t.enquiries} hint={`${rep.enquiries.byStatus.Completed || 0} completed`} />
            <StatCard index={3} icon={CalendarDays} label="Appointments" value={t.consultations + t.visits} hint={`${t.consultations} consultations, ${t.visits} visits`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Monthly revenue</h2>
              <p className="mb-5 text-sm text-muted">{fmtDate(rep.range.from)} to {fmtDate(rep.range.to)}</p>
              <BarChart data={rep.revenueByMonth.map((m) => ({ label: m.label.split(' ')[0], value: m.revenue }))} height={180} format={money} />
              <div className="mt-4"><Table head={['Month', 'Payments', 'Revenue']} rows={rep.revenueByMonth.map((m) => [m.label, m.count, money(m.revenue)])} /></div>
            </section>
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Service-wise revenue</h2>
              <p className="mb-5 text-sm text-muted">Paid fees grouped by Vastu service</p>
              <HBars data={rep.revenueByService.map((s) => ({ label: s.name, value: s.revenue }))} format={money} />
              <div className="mt-4"><Table head={['Service', 'Payments', 'Revenue']} rows={rep.revenueByService.map((s) => [s.name, s.count, money(s.revenue)])} /></div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Enquiry summary</h2>
              <p className="mb-5 text-sm text-muted">{t.enquiries} received in this period</p>
              <DonutChart data={entries(rep.enquiries.byStatus)} centerLabel="Enquiries" />
              <div className="mt-4"><Table head={['Month', 'Received']} rows={rep.enquiries.byMonth.map((m) => [m.label, m.count])} /></div>
            </section>
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Appointment summary</h2>
              <p className="mb-5 text-sm text-muted">Vastu consultations and site visits</p>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Consultations by status</h3>
              <HBars data={entries(rep.consultations.byStatus)} />
              <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider text-muted">Site visits by status</h3>
              <HBars data={entries(rep.visits.byStatus)} />
              <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider text-muted">Consultations by service</h3>
              <Table head={['Service', 'Bookings']} rows={rep.consultations.byService.map((s) => [s.name, s.count])} />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Agent performance</h2>
              <p className="mb-4 text-sm text-muted">Enquiries received in the period and visits completed</p>
              <Table head={['Agent', 'Enquiries', 'Completed', 'Visits done']} rows={rep.agents.map((a) => [a.name, a.enquiries, a.completed, a.visitsDone])} />
            </section>
            <section className="card p-5">
              <h2 className="mb-1 text-xl font-semibold">Consultant performance</h2>
              <p className="mb-4 text-sm text-muted">Bookings and fees earned in the period</p>
              <Table head={['Consultant', 'Booked', 'Completed', 'Revenue']} rows={rep.consultants.map((c) => [c.name, c.booked, c.completed, money(c.revenue)])} />
            </section>
          </div>

          <section className="card p-5">
            <h2 className="mb-1 text-xl font-semibold">Listings right now</h2>
            <p className="mb-5 text-sm text-muted">{rep.listings.total} listings in total (not limited by the period)</p>
            <div className="grid gap-8 md:grid-cols-3">
              <div><h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">By category</h3><HBars data={entries(rep.listings.byCategory)} /></div>
              <div><h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">By status</h3><HBars data={entries(rep.listings.byStatus)} /></div>
              <div><h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">By city</h3><HBars data={entries(rep.listings.byCity)} /></div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
