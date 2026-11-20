import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { StarInput } from '../ui/Stars';
import { Textarea } from '../ui/Field';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function ReviewModal({ open, kind, booking, personName, onClose, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setRating(0); setComment(''); setError(''); }
  }, [open]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api('/reviews', { method: 'POST', body: { kind, bookingId: booking.id, rating, comment } });
      toast('Thank you for your review.');
      onDone?.(res.review);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === 'consultation' ? 'Rate your consultation' : 'Rate your site visit'}
      subtitle={booking ? `${booking.ref}${personName ? ` with ${personName}` : ''}` : ''}
      size="sm"
      footer={(
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Not now</button>
          <button className="btn btn-primary" type="button" onClick={save} disabled={!rating || busy}>{busy ? 'Saving...' : 'Submit review'}</button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <span className="label">Your rating</span>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <Textarea label="Comment (optional)" rows={4} maxLength={600} placeholder="What went well? Anything we can improve?" value={comment} onChange={(e) => setComment(e.target.value)} error={error} />
        <p className="text-xs text-muted">Your first name and last initial are shown with the review. You can review a booking once.</p>
      </div>
    </Modal>
  );
}
