import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { Input } from '../ui/Field';
import { api, downloadFromApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function MyDataCard() {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    try {
      await downloadFromApi('/account/export', 'my-data.json');
      toast('Your data was downloaded.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/account/delete', { method: 'POST', body: { password } });
      logout();
      navigate('/');
      toast('Your account was deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mt-6 space-y-4 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold">My data</h3>
      <p className="text-sm text-muted">Download a copy of everything we hold about you, or close your account. After deleting, your name, email, phone and address are erased and you cannot log in again. Payment records are kept without your personal details, because they are needed for accounting.</p>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-outline" type="button" onClick={download}><Download size={17} /> Download my data</button>
        <button className="btn btn-danger" type="button" onClick={() => { setOpen(true); setPassword(''); setError(''); }}><Trash2 size={17} /> Delete my account</button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        subtitle="This cannot be undone."
        size="sm"
        footer={(
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Keep my account</button>
            <button className="btn btn-danger" type="button" onClick={remove} disabled={!password || busy}>{busy ? 'Deleting...' : 'Delete permanently'}</button>
          </>
        )}
      >
        <p className="mb-4 text-sm text-muted">Open site visits and consultations will be cancelled. Type your password to confirm.</p>
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
      </Modal>
    </section>
  );
}
