import { useEffect, useState } from 'react';
import { CreditCard, Download, Landmark, Lock, Receipt, ShieldCheck, Smartphone } from 'lucide-react';
import Modal from '../ui/Modal';
import { StatusBadge } from '../ui/Badge';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { api, downloadFromApi } from '../../lib/api';
import { cn, fmtDate, money } from '../../lib/utils';

const METHODS = [
  { key: 'UPI', icon: Smartphone, hint: 'UPI ID or QR code' },
  { key: 'Card', icon: CreditCard, hint: 'Credit or debit card' },
  { key: 'Net Banking', icon: Landmark, hint: 'All major banks' },
];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Canara Bank', 'Bank of Baroda', 'Punjab National Bank'];
const PROCESS_STEPS = ['Contacting your bank...', 'Verifying details...', 'Confirming payment...'];

const digits = (v) => v.replace(/\D/g, '');
const fmtCard = (v) => digits(v).slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const cardBrand = (n) => {
  const d = digits(n);
  if (/^4/.test(d)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
  if (/^(60|65|81|82)/.test(d)) return 'RUPAY';
  return 'CARD';
};

function FakeQR({ seed }) {
  const n = 21;
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const finderOn = (x, y) => {
    const fx = x >= n - 7 ? x - (n - 7) : x;
    const fy = y >= n - 7 ? y - (n - 7) : y;
    const edge = fx === 0 || fx === 6 || fy === 0 || fy === 6;
    const core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
    return edge || core;
  };
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const on = finder(x, y) ? finderOn(x, y) : rnd() > 0.52;
    if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  return <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full" fill="currentColor" shapeRendering="crispEdges" aria-label="Sample QR code">{cells}</svg>;
}

function CardPreview({ card, flipped }) {
  const num = (card.number + '################').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  return (
    <div className="mx-auto mb-5 h-44 w-full max-w-[19rem] [perspective:1000px]" aria-hidden="true">
      <div className={cn('relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]', flipped && '[transform:rotateY(180deg)]')}>
        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#B5532E] via-[#9A4424] to-[#7A3418] p-5 text-[#F8F2E6] shadow-lift [backface-visibility:hidden]">
          <div className="pattern-dots pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex items-center justify-between">
            <span className="h-8 w-11 rounded-md bg-gradient-to-br from-[#E9C46A] to-[#D9A441]" />
            <span className="text-xs font-bold tracking-[0.2em]">{cardBrand(card.number)}</span>
          </div>
          <p className="relative font-mono text-lg tracking-[0.14em]">{num.replace(/#/g, '•')}</p>
          <div className="relative flex items-end justify-between text-[11px] uppercase tracking-wider">
            <span className="max-w-[10rem] truncate font-bold">{card.name || 'Card holder'}</span>
            <span className="font-bold">{card.exp || 'MM/YY'}</span>
          </div>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7A3418] to-[#5b2612] shadow-lift [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mt-6 h-10 bg-black/60" />
          <div className="mx-5 mt-5 flex items-center justify-end rounded bg-[#F8F2E6] px-3 py-2 font-mono text-sm text-[#3B2A1E]">{card.cvv ? '•'.repeat(card.cvv.length) : 'CVV'}</div>
        </div>
      </div>
    </div>
  );
}

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

export function PayModal({ payment, onClose, onReceipt }) {
  const data = useData();
  const toast = useToast();
  const [method, setMethod] = useState('UPI');
  const [upiMode, setUpiMode] = useState('id');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [bank, setBank] = useState('');
  const [flip, setFlip] = useState(false);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('form');
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);

  const rzp = data.config.paymentMode === 'razorpay';

  useEffect(() => {
    if (stage !== 'processing' || rzp) return undefined;
    let alive = true;
    const timers = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 1800), setTimeout(async () => {
      try {
        const res = await api(`/payments/${payment.id}/demo-pay`, { method: 'POST', body: { method } });
        if (!alive) return;
        data.refresh();
        setDone(res.payment);
        setStage('success');
        toast(`Payment of ${money(payment.amount)} received.`);
      } catch (e) {
        if (!alive) return;
        setErr(e.message);
        setStage('form');
      }
    }, 2700)];
    return () => { alive = false; timers.forEach(clearTimeout); };

  }, [stage]);

  const payWithRazorpay = async () => {
    setErr('');
    setStage('processing');
    setStep(0);
    try {
      const [Razorpay, order] = await Promise.all([loadRazorpay(), api(`/payments/${payment.id}/razorpay/order`, { method: 'POST' })]);
      await new Promise((resolve, reject) => {
        const rz = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          order_id: order.orderId,
          prefill: order.prefill,
          theme: { color: '#B5532E' },
          modal: { ondismiss: () => reject(new Error('Payment window closed. You have not been charged.')), confirm_close: true },
          handler: async (r) => {
            try {
              setStep(2);
              const res = await api(`/payments/${payment.id}/razorpay/verify`, { method: 'POST', body: r });
              data.refresh();
              setDone(res.payment);
              setStage('success');
              toast(`Payment of ${money(payment.amount)} received.`);
              resolve();
            } catch (e) { reject(e); }
          },
        });
        rz.on('payment.failed', (r) => reject(new Error(r.error?.description || 'The payment failed. Please try again.')));
        setStep(1);
        rz.open();
      });
    } catch (e) {
      setErr(e.message);
      setStage('form');
    }
  };

  if (!payment) return null;

  const validate = () => {
    if (method === 'UPI' && upiMode === 'id' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) return 'Enter a valid UPI ID, for example name@okbank.';
    if (method === 'Card') {
      if (digits(card.number).length !== 16) return 'Enter the 16-digit card number.';
      if (card.name.trim().length < 2) return 'Enter the name on the card.';
      const [mm, yy] = card.exp.split('/').map(Number);
      const now = new Date();
      if (!mm || mm < 1 || mm > 12 || !yy || yy < now.getFullYear() % 100 || (yy === now.getFullYear() % 100 && mm < now.getMonth() + 1)) return 'Enter a valid expiry date (MM/YY).';
      if (digits(card.cvv).length < 3) return 'Enter the 3-digit CVV.';
    }
    if (method === 'Net Banking' && !bank) return 'Select your bank.';
    return '';
  };

  const pay = () => {
    if (rzp) return payWithRazorpay();
    const e = validate();
    setErr(e);
    if (e) return;
    setFlip(false);
    setStep(0);
    setStage('processing');
  };

  const busy = stage === 'processing';
  const input = 'input';

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      size="sm"
      title={stage === 'success' ? 'Payment successful' : 'Pay consultation fee'}
      subtitle={stage === 'form' ? payment.description : undefined}
      footer={
        stage === 'form' ? (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary min-w-[9.5rem]" onClick={pay}><Lock size={16} /> Pay {money(payment.amount)}</button>
          </>
        ) : stage === 'success' ? (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={() => { onClose(); onReceipt?.(done); }}><Receipt size={16} /> View receipt</button>
          </>
        ) : null
      }
    >
      {stage === 'form' && rzp && (
        <div>
          <div className="mb-5 flex items-center justify-between rounded-xl bg-sunken/70 px-4 py-3">
            <span className="text-sm font-bold text-muted">Amount payable</span>
            <span className="font-display text-2xl font-semibold text-brand">{money(payment.amount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <div key={m.key} className="flex flex-col items-center gap-1.5 rounded-xl border border-line px-2 py-3 text-center">
                <m.icon size={21} className="text-brand" />
                <span className="text-xs font-bold leading-tight">{m.key}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">You will choose UPI, card, net banking or wallet in the secure Razorpay window.</p>
          {err && <p className="mt-4 animate-fade-in rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{err}</p>}
          <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-air" /> Payments are processed by Razorpay. We never see or store your card or bank details.</p>
        </div>
      )}

      {stage === 'form' && !rzp && (
        <div>
          <div className="mb-5 flex items-center justify-between rounded-xl bg-sunken/70 px-4 py-3">
            <span className="text-sm font-bold text-muted">Amount payable</span>
            <span className="font-display text-2xl font-semibold text-brand">{money(payment.amount)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Payment method">
            {METHODS.map((m) => (
              <button key={m.key} role="tab" aria-selected={method === m.key} onClick={() => { setMethod(m.key); setErr(''); }} className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all', method === m.key ? 'border-brand bg-brand-soft text-brand-deep shadow-sm' : 'border-line hover:border-brand/50')}>
                <m.icon size={21} />
                <span className="text-xs font-bold leading-tight">{m.key}</span>
              </button>
            ))}
          </div>

          <div key={method} className="mt-5 animate-fade-up">
            {method === 'UPI' && (
              <div className="space-y-4">
                <div className="flex rounded-xl border border-line p-1">
                  {[['id', 'Enter UPI ID'], ['qr', 'Scan QR']].map(([k, l]) => (
                    <button key={k} onClick={() => { setUpiMode(k); setErr(''); }} className={cn('flex-1 rounded-lg py-2 text-sm font-bold transition', upiMode === k ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink')}>{l}</button>
                  ))}
                </div>
                {upiMode === 'id' ? (
                  <div>
                    <label className="label" htmlFor="upi-id">UPI ID</label>
                    <input id="upi-id" className={input} placeholder="name@okbank" value={upi} onChange={(e) => { setUpi(e.target.value); setErr(''); }} autoComplete="off" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['@okhdfcbank', '@ybl', '@paytm', '@upi'].map((h) => (
                        <button key={h} type="button" className="chip" onClick={() => setUpi((u) => `${u.split('@')[0] || 'yourname'}${h}`)}>{h}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative h-44 w-44 rounded-2xl border border-line bg-white p-3 text-[#3B2A1E]">
                      <FakeQR seed={payment.ref} />
                      <span className="absolute left-0 right-0 top-0 h-0.5 animate-[scan_2.2s_ease-in-out_infinite] bg-brand/70" />
                    </div>
                    <p className="mt-3 text-center text-xs text-muted">Scan with any UPI app and approve the request. Demo code, not a real QR.</p>
                  </div>
                )}
              </div>
            )}

            {method === 'Card' && (
              <div>
                <CardPreview card={card} flipped={flip} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label" htmlFor="card-no">Card number</label>
                    <input id="card-no" className={cn(input, 'font-mono tracking-wider')} inputMode="numeric" autoComplete="off" placeholder="4111 1111 1111 1111" value={card.number} onChange={(e) => { setCard({ ...card, number: fmtCard(e.target.value) }); setErr(''); }} />
                  </div>
                  <div className="col-span-2">
                    <label className="label" htmlFor="card-name">Name on card</label>
                    <input id="card-name" className={input} placeholder="As printed on the card" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="card-exp">Expiry</label>
                    <input id="card-exp" className={input} inputMode="numeric" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="card-cvv">CVV</label>
                    <input id="card-cvv" className={input} type="password" inputMode="numeric" maxLength={3} placeholder="•••" value={card.cvv} onFocus={() => setFlip(true)} onBlur={() => setFlip(false)} onChange={(e) => setCard({ ...card, cvv: digits(e.target.value).slice(0, 3) })} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">Demo: any 16 digits, a future expiry and any 3-digit CVV will work.</p>
              </div>
            )}

            {method === 'Net Banking' && (
              <div className="grid grid-cols-2 gap-2">
                {BANKS.map((b) => (
                  <button key={b} onClick={() => { setBank(b); setErr(''); }} className={cn('flex items-center gap-2.5 rounded-xl border p-3 text-left text-[13px] font-bold transition-all', bank === b ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/50')} aria-pressed={bank === b}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand"><Landmark size={16} /></span>
                    <span className="leading-tight">{b}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {err && <p className="mt-4 animate-fade-in rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{err}</p>}
          <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-air" /> Demo checkout (Razorpay keys are not set on the server). No real transaction happens and no card details are stored.</p>
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="relative h-20 w-20">
            <span className="absolute inset-0 rounded-full border-4 border-line" />
            <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand" />
            <Lock size={24} className="absolute inset-0 m-auto text-brand" />
          </div>
          <p className="mt-6 font-display text-xl font-semibold">Processing {money(payment.amount)}</p>
          <p key={step} className="mt-1 animate-fade-in text-sm text-muted">{rzp ? ['Opening secure checkout...', 'Waiting for your payment...', 'Verifying payment...'][step] : PROCESS_STEPS[step]}</p>
          <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${(step + 1) * 33.3}%` }} /></div>
          <p className="mt-4 text-xs text-muted">Please do not close this window.</p>
        </div>
      )}

      {stage === 'success' && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <span key={i} className="burst absolute h-2 w-2 rounded-full" style={{ '--x': `${Math.cos(a) * 58}px`, '--y': `${Math.sin(a) * 58}px`, background: ['rgb(var(--c-brand))', 'rgb(var(--c-fire))', 'rgb(var(--c-air))', 'rgb(var(--c-water))'][i % 4], animationDelay: '.55s' }} />;
            })}
            <svg viewBox="0 0 56 56" className="h-24 w-24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle className="check-circle" cx="28" cy="28" r="26" stroke="rgb(var(--c-air))" strokeWidth="3" />
              <path className="check-mark" d="M16 29.5l8 8 16-17" stroke="rgb(var(--c-air))" strokeWidth="4" />
            </svg>
          </div>
          <p className="mt-5 animate-fade-up font-display text-3xl font-semibold text-brand [animation-delay:.9s]">{money(payment.amount)}</p>
          <p className="mt-1 animate-fade-up text-sm text-muted [animation-delay:1s]">Paid via {done?.method}. Receipt {payment.ref} is ready.</p>
        </div>
      )}
    </Modal>
  );
}

export function ReceiptModal({ payment, onClose }) {
  const data = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!payment) return null;
  const customer = data.user(payment.customerId);
  const rows = [
    ['Receipt no.', payment.ref],
    ['Customer', customer?.name || '-'],
    ['Service', payment.description],
    ['Date', fmtDate(payment.paidAt || payment.date)],
    ['Method', payment.method || '-'],
    ['Transaction ref.', payment.razorpayPaymentId || payment.gatewayRef || '-'],
  ];

  const download = () => downloadReceipt(payment, toast, setBusy);

  return (
    <Modal open onClose={onClose} size="sm" title="Receipt" subtitle={payment.ref} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={download} disabled={busy || payment.status !== 'Completed'}><Download size={17} /> {busy ? 'Preparing PDF' : 'Download PDF'}</button>
      </>
    }>
      <div className="rounded-xl border border-dashed border-line bg-sunken/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-brand-deep">Vindhyavasini Vastu and Real Estate</span>
          <StatusBadge status={payment.status} />
        </div>
        <dl className="space-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="break-all text-right font-semibold">{v}</dd></div>
          ))}
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
          <span className="text-sm font-bold text-muted">Amount</span>
          <span className="font-display text-2xl font-semibold text-brand">{money(payment.amount)}</span>
        </div>
      </div>
    </Modal>
  );
}

export async function downloadReceipt(payment, toast, setBusy) {
  setBusy?.(true);
  try {
    await downloadFromApi(`/payments/${payment.id}/receipt.pdf`, `${payment.ref}.pdf`);
    toast('Receipt downloaded.');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy?.(false);
  }
}
