import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Avatar from '../../components/ui/Avatar';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ROLES, WEEKDAYS } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import useServerList from '../../hooks/useServerList';
import { fmtDate } from '../../lib/utils';

const BLANK = { name: '', email: '', phone: '', role: 'customer', status: 'Active', password: 'Welcome@123' };

export default function AdminUsers({ staffOnly = false }) {
  const { user: me } = useAuth();
  const data = useData();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState({});

  const roles = staffOnly ? ['agent', 'consultant'] : Object.keys(ROLES);
  const list = useServerList('/users', { filters: { role: tab, staff: staffOnly ? 'true' : undefined }, search: q, limit: 12, sort: 'createdAt', dir: 'desc' });
  const rows = list.items;

  const open = (u) => { setEdit(u || 'new'); setF(u ? { ...u } : { ...BLANK, role: staffOnly ? 'agent' : 'customer' }); setErr({}); };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Enter a name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email.';
    if (edit === 'new' && (!f.password || f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))) er.password = 'Use 8 or more characters with a letter and a number.';
    setErr(er);
    if (Object.keys(er).length) return;
    if (edit === 'new') {
      const rec = await data.add('users', { name: f.name.trim(), email: f.email, phone: f.phone, role: f.role, status: f.status, password: f.password, bio: f.bio || '', specialization: f.specialization || '', experience: Number(f.experience) || 0 });
      if (!rec) return;
      toast('User created. They can log in with the password you set.');
    } else {
      const rec = await data.update('users', edit.id, { name: f.name.trim(), email: f.email, phone: f.phone, role: f.role, status: f.status, bio: f.bio || '', specialization: f.specialization || '', experience: Number(f.experience) || 0 });
      if (!rec) return;
      toast('User updated.');
    }
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title={staffOnly ? 'Agents and consultants' : 'Users and roles'}
        subtitle={staffOnly ? 'Manage staff profiles, status and workload.' : 'Create accounts, assign roles and activate or deactivate access.'}
        actions={<button className="btn btn-primary" onClick={() => open()}><Plus size={18} /> {staffOnly ? 'Add staff' : 'Add user'}</button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, ...roles.map((r) => ({ key: r, label: ROLES[r].label }))]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search by name or email" />
      </div>

      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        columns={[
          { key: 'name', sort: 'name', header: 'Name', render: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div className="min-w-0"><p className="font-bold">{u.name}</p><p className="text-xs text-muted">{u.email}</p></div></div> },
          { key: 'role', sort: 'role', header: 'Role', render: (u) => <span className="text-sm font-semibold">{ROLES[u.role].label}</span> },
          { key: 'phone', header: 'Phone', render: (u) => <span className="text-sm">{u.phone}</span> },
          ...(staffOnly
            ? [{ key: 'avail', header: 'Availability', render: (u) => {
                const days = u.availability?.days || u.workingDays;
                return <span className="text-sm">{days?.length ? days.map((d) => WEEKDAYS[d]).join(', ') : '-'}<span className="block text-xs text-muted">{u.availability?.slots ? `${u.availability.slots.length} ${u.role === 'consultant' ? 'slots' : 'visit slots'}/day` : u.workHours || ''}</span></span>;
              } },
              { key: 'load', header: 'Workload', render: (u) => {
                const n = u.role === 'agent' ? data.db.enquiries.filter((e) => e.assignedTo === u.id && !['Completed', 'Closed'].includes(e.status)).length : data.db.consultations.filter((c) => c.consultantId === u.id && ['Requested', 'Confirmed'].includes(c.status)).length;
                return <span className="text-sm">{n} {u.role === 'agent' ? 'open leads' : 'active bookings'}</span>;
              } }]
            : [{ key: 'joined', sort: 'createdAt', header: 'Joined', render: (u) => <span className="text-sm">{fmtDate(u.joined)}</span> }]),
          {
            key: 'status', sort: 'status', header: 'Status',
            render: (u) => (
              <button disabled={u.id === me.id} onClick={() => { const to = u.status === 'Active' ? 'Inactive' : 'Active'; data.update('users', u.id, { status: to }).then((ok) => ok && toast(`${u.name} is now ${to.toLowerCase()}.`)); }} title={u.id === me.id ? 'You cannot deactivate yourself' : 'Click to toggle'} className="disabled:cursor-not-allowed">
                <StatusBadge status={u.status} />
              </button>
            ),
          },
          { key: 'a', header: '', className: 'text-right', render: (u) => (
            <div className="flex justify-end gap-0.5">
              <button className="btn-icon h-9 w-9" onClick={() => open(u)} aria-label={`Edit ${u.name}`}><Pencil size={17} /></button>
              <button className="btn-icon h-9 w-9 disabled:opacity-30" disabled={u.id === me.id} onClick={() => setDel(u)} aria-label={`Delete ${u.name}`}><Trash2 size={17} /></button>
            </div>
          ) },
        ]}
      />

      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun={staffOnly ? 'staff members' : 'users'} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add user' : 'Edit user'} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" type="submit" form="user-form">Save</button></>}>
        <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Input wrapperClass="sm:col-span-2" label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} required />
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} required />
          <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={roles.map((r) => ({ value: r, label: ROLES[r].label }))} />
          <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={['Active', 'Inactive']} />
          {['agent', 'consultant'].includes(f.role) && (
            <>
              {f.role === 'consultant' && <Input wrapperClass="sm:col-span-2" label="Specialization" value={f.specialization || ''} onChange={(e) => setF({ ...f, specialization: e.target.value })} />}
              <Input label="Experience (years)" type="number" min="0" value={f.experience || ''} onChange={(e) => setF({ ...f, experience: e.target.value })} />
              <Textarea wrapperClass="sm:col-span-2" label="Profile summary" rows={3} value={f.bio || ''} onChange={(e) => setF({ ...f, bio: e.target.value })} />
            </>
          )}
          {edit === 'new' && <Input wrapperClass="sm:col-span-2" label="Password" type="text" autoComplete="off" value={f.password || ''} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} hint="You set this password. Share it with the person; they can change it later from their profile." required />}
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete this user?" message={`${del?.name} will lose access immediately. Their past records stay in the system.`} confirmLabel="Delete user" onConfirm={() => data.remove('users', del.id).then((ok) => ok && toast('User deleted. Their listings and open leads moved to you.'))} />
    </>
  );
}
