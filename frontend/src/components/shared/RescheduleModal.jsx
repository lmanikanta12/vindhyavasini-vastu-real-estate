import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Input, Select } from '../ui/Field';
import { TIME_SLOTS, VISIT_SLOTS } from '../../lib/constants';
import useVisitSlots from '../../hooks/useVisitSlots';
import { addDays, fmtTime } from '../../lib/utils';

export default function RescheduleModal({ open, onClose, item, kind = 'visit', onSave }) {
  const slots = kind === 'visit' ? VISIT_SLOTS : TIME_SLOTS;
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (open && item) {
      setDate(item.date);
      setTime(item.time);
    }
  }, [open, item]);

  const av = useVisitSlots({ agentId: item?.agentId, date, enabled: open && kind === 'visit' && !!item?.agentId });
  const own = item && date === item.date ? [item.time] : [];
  const options = kind === 'visit' && item?.agentId
    ? [...new Set([...av.slots, ...own])].sort()
    : [...new Set([...(slots || []), item?.time].filter(Boolean))].sort();
  useEffect(() => {
    if (kind === 'visit' && av.loaded && !options.includes(time)) setTime(options[0] || '');

  }, [av.slots, av.loaded, date]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Reschedule"
      subtitle={item?.ref}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!time || !date}
            onClick={() => {
              onSave({ date, time });
              onClose();
            }}
          >
            Save new time
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input label="New date" type="date" min={addDays(0)} value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="New time" value={time} onChange={(e) => setTime(e.target.value)} options={options.map((t) => ({ value: t, label: fmtTime(t) }))} placeholder={options.length ? undefined : 'No time available'} />
        {kind === 'visit' && av.loaded && !av.loading && options.length === 0 && <p className="text-sm font-semibold text-brand" role="status">{av.reason || 'No free visit times on this date. Please pick another day.'}</p>}
      </div>
    </Modal>
  );
}
