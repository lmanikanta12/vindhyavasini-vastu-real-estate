import { useEffect, useState } from 'react';
import { CheckCircle2, Compass, Download, FileText, Loader2, MapPin } from 'lucide-react';
import Modal from '../ui/Modal';
import { StatusBadge } from '../ui/Badge';
import { Select, Textarea } from '../ui/Field';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { CONSULT_STATUSES, VASTU_DISCLAIMER } from '../../lib/constants';
import { downloadFromApi } from '../../lib/api';
import { assetUrl, fmtDate, fmtTime, money } from '../../lib/utils';

function Row({ label, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}

export default function ConsultationDetailModal({ consultationId, role, onClose }) {
  const data = useData();
  const toast = useToast();
  const c = data.consultation(consultationId);
  const [notes, setNotes] = useState('');
  const [recs, setRecs] = useState('');
  const [fu, setFu] = useState({ status: 'None', note: '' });
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (c) {
      setNotes(c.assessmentNotes || '');
      setRecs(c.recommendations || '');
      setFu(c.followUp || { status: 'None', note: '' });
    }

  }, [consultationId]);

  if (!c) return null;
  const svc = data.service(c.serviceId);
  const customer = data.user(c.customerId);
  const consultant = data.user(c.consultantId);
  const property = data.property(c.propertyId);
  const consultants = data.usersByRole('consultant');
  const isConsultant = role === 'consultant';
  const canRecord = isConsultant && ['Confirmed', 'Completed'].includes(c.status);

  const setStatus = (status, msg) => data.update('consultations', c.id, { status }).then((ok) => ok && toast(msg || `Marked as ${status.toLowerCase()}.`));

  const saveNotes = async (complete) => {
    const ok = await data.update('consultations', c.id, { assessmentNotes: notes, recommendations: recs, followUp: fu, ...(complete ? { status: 'Completed' } : {}) });
    if (!ok) return;
    toast(complete ? 'Consultation completed and notes saved.' : 'Notes saved.');
    if (complete) onClose();
  };

  const hasNotes = !!(c.assessmentNotes || c.recommendations || (canRecord && (notes.trim() || recs.trim())));
  const canReport = c.status !== 'Cancelled' && (role === 'customer' ? c.status === 'Completed' && hasNotes : hasNotes);
  const downloadReport = async () => {
    setPdfBusy(true);
    try {

      if (canRecord && (notes !== (c.assessmentNotes || '') || recs !== (c.recommendations || ''))) {
        const ok = await data.update('consultations', c.id, { assessmentNotes: notes, recommendations: recs, followUp: fu });
        if (!ok) return;
      }
      await downloadFromApi(`/consultations/${c.id}/report.pdf`, `vastu-report-${c.ref}.pdf`);
      toast('Vastu report downloaded.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={svc?.name || 'Consultation'}
      subtitle={`${c.ref} · ${fmtDate(c.date)} at ${fmtTime(c.time)}`}
      footer={
        <>
          {canReport && (
            <button className="btn btn-outline" onClick={downloadReport} disabled={pdfBusy}>{pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Vastu report (PDF)</button>
          )}
          {isConsultant && c.status === 'Requested' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStatus('Cancelled', 'Request declined.')}>Decline</button>
              <button className="btn btn-primary" onClick={() => setStatus('Confirmed', 'Consultation confirmed.')}><CheckCircle2 size={17} /> Confirm booking</button>
            </>
          )}
          {canRecord && (
            <>
              <button className="btn btn-outline" onClick={() => saveNotes(false)}>Save notes</button>
              {c.status === 'Confirmed' && <button className="btn btn-primary" onClick={() => saveNotes(true)}>Complete consultation</button>}
            </>
          )}
          {!(isConsultant && (c.status === 'Requested' || canRecord)) && <button className="btn btn-primary" onClick={onClose}>Close</button>}
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={c.status} />
          <span className="text-sm font-bold text-brand">{money(c.fee)}</span>
          {(() => {
            const pay = data.paymentForConsultation(c.id);
            return pay ? <span className="text-xs text-muted">Payment: {pay.status}</span> : null;
          })()}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="Customer">{customer?.name || 'Unknown'}<span className="block text-xs font-normal text-muted">{customer?.phone}</span></Row>
          <Row label="Consultant">{consultant?.name || 'Not assigned'}</Row>
          <Row label="Property type"><span className="inline-flex items-center gap-2"><FileText size={15} className="text-brand" /> {c.propertyType}</span></Row>
          <Row label="Orientation"><span className="inline-flex items-center gap-2"><Compass size={15} className="text-brand" /> {c.direction} facing</span></Row>
          <Row label="Location"><span className="inline-flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-brand" /> {c.address || '-'}</span></Row>
          {property && <Row label="Linked listing">{property.title}</Row>}
        </div>

        <Row label="Customer concerns"><p className="font-normal leading-relaxed">{c.concerns || 'None provided.'}</p></Row>

        {c.floorPlans?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Floor plans and images</p>
            <div className="flex flex-wrap gap-3">
              {c.floorPlans.map((f, i) =>
                /\.(jpe?g|png|webp)$/i.test(f.url || '') ? (
                  <a key={i} href={assetUrl(f.url)} target="_blank" rel="noreferrer" className="block h-24 w-32 overflow-hidden rounded-xl border border-line">
                    <img src={assetUrl(f.url)} alt={f.name} className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <a key={i} href={assetUrl(f.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2 text-sm font-semibold hover:border-brand"><FileText size={16} className="text-brand" /> {f.name}</a>
                )
              )}
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="grid gap-4 rounded-xl border border-line bg-sunken/50 p-4 sm:grid-cols-2">
            <Select label="Assign consultant" value={c.consultantId || ''} onChange={(e) => { data.update('consultations', c.id, { consultantId: e.target.value }).then((ok) => ok && toast('Consultant assigned.')); }} options={consultants.map((u) => ({ value: u.id, label: u.name }))} />
            <Select label="Status" value={c.status} onChange={(e) => setStatus(e.target.value)} options={CONSULT_STATUSES} />
          </div>
        )}

        {canRecord && (
          <div className="space-y-4 rounded-xl border border-line bg-sunken/50 p-4">
            <Textarea label="Assessment notes" rows={3} placeholder="Observations about layout, entrance, zones..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Follow-up status" value={fu.status} onChange={(e) => setFu({ ...fu, status: e.target.value })} options={['None', 'Follow-up needed', 'Follow-up done']} />
              <Textarea label="Follow-up note" rows={2} value={fu.note} onChange={(e) => setFu({ ...fu, note: e.target.value })} placeholder="e.g. Call after corrections are done" />
            </div>
            <Textarea label="Recommendations" hint="Shown to the customer after completion. Present as guidance, not guaranteed outcomes." rows={4} value={recs} onChange={(e) => setRecs(e.target.value)} />
          </div>
        )}

        {!canRecord && c.followUp && c.followUp.status !== 'None' && (
          <Row label="Follow-up"><span className="inline-flex flex-wrap items-center gap-2">{c.followUp.status}{c.followUp.note && <span className="font-normal text-muted">- {c.followUp.note}</span>}</span></Row>
        )}

        {!isConsultant && c.status === 'Completed' && (c.assessmentNotes || c.recommendations) && (
          <div className="space-y-4 rounded-xl border border-air/50 bg-air/10 p-4">
            {c.assessmentNotes && <Row label="Assessment notes"><p className="font-normal leading-relaxed">{c.assessmentNotes}</p></Row>}
            {c.recommendations && <Row label="Recommendations"><p className="whitespace-pre-line font-normal leading-relaxed">{c.recommendations}</p></Row>}
            <p className="border-t border-air/40 pt-3 text-xs text-muted">{VASTU_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
