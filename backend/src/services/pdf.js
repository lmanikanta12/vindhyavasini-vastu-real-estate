import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');
const BRAND = '#7A3418';
const ACCENT = '#B5532E';
const TEXT = '#3B2A1E';
const MUTED = '#7A6A5C';
const LINE = '#E4D8C6';
const SOFT = '#F8F2E6';

export const VASTU_DISCLAIMER = 'Vastu recommendations are consultancy guidance and not a guarantee of property value, health, financial outcomes or other results.';

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const longDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const time12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function newDoc(title, size = 'A4') {
  const doc = new PDFDocument({ size, margin: 48, bufferPages: true, info: { Title: title, Author: 'Vindhyavasini Vastu and Real Estate', Creator: 'Vindhyavasini Vastu and Real Estate' } });
  doc.registerFont('Body', path.join(FONT_DIR, 'DejaVuSans.ttf'));
  doc.registerFont('Bold', path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'));
  doc.font('Body').fontSize(10).fillColor(TEXT);
  return doc;
}

const finish = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

function header(doc, business, label) {
  const w = doc.page.width - 96;
  doc.rect(48, 40, w, 4).fill(ACCENT);
  doc.fillColor(BRAND).font('Bold').fontSize(20).text(business.businessName || 'Vindhyavasini Vastu and Real Estate', 48, 56);
  doc.fillColor(MUTED).font('Body').fontSize(8.5)
    .text([business.address, business.phone, business.email].filter(Boolean).join('  |  '), 48, doc.y + 2, { width: w * 0.7 });
  doc.fillColor(BRAND).font('Bold').fontSize(13).text(label, 48, 58, { width: w, align: 'right' });
  doc.moveTo(48, 100).lineTo(48 + w, 100).strokeColor(LINE).lineWidth(1).stroke();
  doc.y = 116;
  doc.x = 48;
  doc.fillColor(TEXT).font('Body').fontSize(10);
}

function footers(doc, note) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const { width, height } = doc.page;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.moveTo(48, height - 62).lineTo(width - 48, height - 62).strokeColor(LINE).lineWidth(0.7).stroke();
    doc.font('Body').fontSize(7.5).fillColor(MUTED).text(note, 48, height - 55, { width: width - 96 - 60, lineGap: 1 });
    doc.text(`Page ${i + 1} of ${range.count}`, width - 48 - 60, height - 55, { width: 60, align: 'right' });
    doc.page.margins.bottom = bottom;
  }
}

function kv(doc, rows, { labelW = 130 } = {}) {
  const w = doc.page.width - 96;
  rows.forEach(([k, v], i) => {
    const y = doc.y;
    const text = String(v ?? '-') || '-';
    doc.font('Body').fontSize(9.5);
    const h = Math.max(doc.heightOfString(text, { width: w - labelW - 16 }), 12) + 12;
    if (i % 2 === 0) doc.rect(48, y, w, h).fill(SOFT);
    doc.fillColor(MUTED).font('Body').fontSize(9).text(k, 58, y + 6, { width: labelW });
    doc.fillColor(TEXT).font('Bold').fontSize(9.5).text(text, 58 + labelW, y + 6, { width: w - labelW - 20 });
    doc.y = y + h;
  });
  doc.x = 48;
}

function heading(doc, text) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.8);
  doc.fillColor(BRAND).font('Bold').fontSize(12).text(text, 48, doc.y);
  doc.moveDown(0.3);
  doc.fillColor(TEXT).font('Body').fontSize(10);
}

export async function receiptPdf({ payment, customer, consultation, serviceName, business }) {
  const doc = newDoc(`Receipt ${payment.ref}`);
  header(doc, business, 'PAYMENT RECEIPT');
  const w = doc.page.width - 96;

  doc.fillColor(MUTED).font('Body').fontSize(9).text('Receipt number', 48, doc.y);
  doc.fillColor(BRAND).font('Bold').fontSize(16).text(payment.ref, 48, doc.y);
  const paidY = 112;
  doc.roundedRect(48 + w - 78, paidY, 78, 24, 12).fill('#7C9A7A');
  doc.fillColor('#FFFFFF').font('Bold').fontSize(10).text('PAID', 48 + w - 78, paidY + 7, { width: 78, align: 'center' });
  doc.fillColor(TEXT);
  doc.y += 16;

  kv(doc, [
    ['Date of payment', longDate(payment.paidAt || payment.date)],
    ['Received from', customer?.name || '-'],
    ['Email', customer?.email || '-'],
    ['Phone', customer?.phone || '-'],
    ['Service', serviceName || payment.description],
    ['Description', payment.description],
    ['Booking reference', consultation?.ref || '-'],
    ['Payment method', payment.method || '-'],
    ['Transaction reference', payment.razorpayPaymentId || payment.gatewayRef || '-'],
  ]);

  doc.moveDown(1.2);
  const y = doc.y;
  doc.roundedRect(48, y, w, 58, 8).fill(SOFT);
  doc.fillColor(MUTED).font('Body').fontSize(10).text('Amount paid', 64, y + 12);
  doc.fillColor(BRAND).font('Bold').fontSize(24).text(money(payment.amount), 64, y + 26, { width: w - 32, align: 'right' });
  doc.y = y + 74;
  doc.x = 48;

  doc.fillColor(MUTED).font('Body').fontSize(9).text('Thank you for choosing Vindhyavasini Vastu and Real Estate. This is a computer-generated receipt and does not need a signature.', 48, doc.y, { width: w });
  doc.moveDown(0.6);
  doc.fillColor(MUTED).fontSize(8.5).text(VASTU_DISCLAIMER, 48, doc.y, { width: w });
  footers(doc, `${business.businessName || 'Vindhyavasini Vastu and Real Estate'}  |  Receipt ${payment.ref}`);
  return finish(doc);
}

export async function vastuReportPdf({ consultation: c, customer, consultant, serviceName, property, business }) {
  const doc = newDoc(`Vastu report ${c.ref}`);
  header(doc, business, 'VASTU CONSULTATION REPORT');
  const w = doc.page.width - 96;

  doc.fillColor(MUTED).font('Body').fontSize(9).text('Report reference', 48, doc.y);
  doc.fillColor(BRAND).font('Bold').fontSize(16).text(c.ref, 48, doc.y);
  doc.moveDown(0.8);

  kv(doc, [
    ['Service', serviceName],
    ['Consultation date', `${longDate(c.date)}, ${time12(c.time)}`],
    ['Status', c.status],
    ['Customer', customer?.name || '-'],
    ['Consultant', consultant ? `${consultant.name}${consultant.specialization ? ` (${consultant.specialization})` : ''}` : '-'],
    ['Property address', c.address || property?.address || '-'],
    ['Property type', c.propertyType || property?.type || '-'],
    ['Main entrance / facing', c.direction || property?.facing || '-'],
  ]);

  const block = (title, text, empty) => {
    heading(doc, title);
    doc.fillColor(TEXT).font('Body').fontSize(10).text(text && text.trim() ? text : empty, 48, doc.y, { width: w, lineGap: 3, align: 'left' });
  };
  block('Customer concerns', c.concerns, 'No specific concerns were noted.');
  block('Assessment notes', c.assessmentNotes, 'The consultant has not added assessment notes yet.');
  block('Recommendations', c.recommendations, 'The consultant has not added recommendations yet.');
  if (c.followUp?.status && c.followUp.status !== 'None') {
    block('Follow-up', `${c.followUp.status}${c.followUp.note ? `: ${c.followUp.note}` : ''}`, '');
  }

  if (doc.y > doc.page.height - 170) doc.addPage();
  doc.moveDown(1.2);
  const y = doc.y;
  const h = doc.heightOfString(VASTU_DISCLAIMER, { width: w - 32 }) + 34;
  doc.roundedRect(48, y, w, h, 8).lineWidth(1).strokeColor(ACCENT).stroke();
  doc.fillColor(ACCENT).font('Bold').fontSize(9).text('IMPORTANT DISCLAIMER', 64, y + 10);
  doc.fillColor(TEXT).font('Body').fontSize(9).text(VASTU_DISCLAIMER, 64, y + 24, { width: w - 32 });
  doc.y = y + h;

  footers(doc, `${business.businessName || 'Vindhyavasini Vastu and Real Estate'}  |  Report ${c.ref}  |  ${VASTU_DISCLAIMER}`);
  return finish(doc);
}

function table(doc, columns, rows, { empty = 'No data for this period.' } = {}) {
  const w = doc.page.width - 96;
  const total = columns.reduce((a, c) => a + c.w, 0);
  const widths = columns.map((c) => (c.w / total) * w);
  const draw = (cells, { head = false, shade = false } = {}) => {
    doc.font(head ? 'Bold' : 'Body').fontSize(head ? 8.5 : 9);
    const h = Math.max(...cells.map((t, i) => doc.heightOfString(String(t), { width: widths[i] - 12 }))) + 9;
    if (doc.y + h > doc.page.height - 80) doc.addPage();
    const y = doc.y;
    if (head) doc.rect(48, y, w, h).fill(BRAND);
    else if (shade) doc.rect(48, y, w, h).fill(SOFT);
    let x = 48;
    cells.forEach((t, i) => {
      doc.fillColor(head ? '#FFFFFF' : TEXT).text(String(t), x + 6, y + 4.5, { width: widths[i] - 12, align: columns[i].right ? 'right' : 'left' });
      x += widths[i];
    });
    doc.y = y + h;
    doc.x = 48;
  };
  draw(columns.map((c) => c.h), { head: true });
  if (!rows.length) { doc.fillColor(MUTED).font('Body').fontSize(9).text(empty, 54, doc.y + 6); doc.moveDown(0.6); return; }
  rows.forEach((r, i) => draw(r, { shade: i % 2 === 0 }));
  doc.moveDown(0.3);
}

export async function reportPdf({ report, business }) {
  const doc = newDoc('Vindhyavasini Vastu and Real Estate report', 'A4');
  header(doc, business, 'BUSINESS REPORT');
  const w = doc.page.width - 96;
  doc.fillColor(MUTED).fontSize(9).text(`Period: ${longDate(report.range.from)} to ${longDate(report.range.to)}    |    Generated: ${longDate(new Date().toISOString())}`, 48, doc.y, { width: w });
  doc.moveDown(0.8);

  const k = report.totals;
  const tiles = [['Revenue (paid)', money(k.revenue)], ['Pending fees', money(k.pending)], ['Enquiries', k.enquiries], ['Consultations', k.consultations], ['Site visits', k.visits]];
  const tw = (w - 8 * (tiles.length - 1)) / tiles.length;
  const ty = doc.y;
  tiles.forEach(([label, value], i) => {
    const x = 48 + i * (tw + 8);
    doc.roundedRect(x, ty, tw, 46, 6).fill(SOFT);
    doc.fillColor(MUTED).font('Body').fontSize(7.5).text(label, x + 7, ty + 7, { width: tw - 14 });
    doc.fillColor(BRAND).font('Bold').fontSize(11).text(String(value), x + 7, ty + 22, { width: tw - 14 });
  });
  doc.y = ty + 58;
  doc.x = 48;

  heading(doc, 'Revenue by month');
  table(doc, [{ h: 'Month', w: 3 }, { h: 'Payments', w: 2, right: true }, { h: 'Revenue', w: 3, right: true }], report.revenueByMonth.map((m) => [m.label, m.count, money(m.revenue)]));
  heading(doc, 'Revenue by service');
  table(doc, [{ h: 'Service', w: 5 }, { h: 'Payments', w: 2, right: true }, { h: 'Revenue', w: 3, right: true }], report.revenueByService.map((s) => [s.name, s.count, money(s.revenue)]));
  heading(doc, 'Enquiries');
  table(doc, [{ h: 'Status', w: 5 }, { h: 'Count', w: 2, right: true }], Object.entries(report.enquiries.byStatus).map(([s, n]) => [s, n]));
  heading(doc, 'Enquiries by month');
  table(doc, [{ h: 'Month', w: 5 }, { h: 'Received', w: 2, right: true }], report.enquiries.byMonth.map((m) => [m.label, m.count]));
  heading(doc, 'Consultation appointments');
  table(doc, [{ h: 'Status', w: 5 }, { h: 'Count', w: 2, right: true }], Object.entries(report.consultations.byStatus).map(([s, n]) => [s, n]));
  heading(doc, 'Consultations by service');
  table(doc, [{ h: 'Service', w: 5 }, { h: 'Count', w: 2, right: true }], report.consultations.byService.map((s) => [s.name, s.count]));
  heading(doc, 'Site visits');
  table(doc, [{ h: 'Status', w: 5 }, { h: 'Count', w: 2, right: true }], Object.entries(report.visits.byStatus).map(([s, n]) => [s, n]));
  heading(doc, 'Listings (all current listings)');
  table(doc, [{ h: 'Category', w: 5 }, { h: 'Count', w: 2, right: true }], Object.entries(report.listings.byCategory).map(([s, n]) => [s, n]));
  heading(doc, 'Agent performance');
  table(doc, [{ h: 'Agent', w: 4 }, { h: 'Enquiries', w: 2, right: true }, { h: 'Completed', w: 2, right: true }, { h: 'Visits done', w: 2, right: true }], report.agents.map((a) => [a.name, a.enquiries, a.completed, a.visitsDone]));
  heading(doc, 'Consultant performance');
  table(doc, [{ h: 'Consultant', w: 4 }, { h: 'Booked', w: 2, right: true }, { h: 'Completed', w: 2, right: true }, { h: 'Revenue', w: 3, right: true }], report.consultants.map((a) => [a.name, a.booked, a.completed, money(a.revenue)]));

  footers(doc, `${business.businessName || 'Vindhyavasini Vastu and Real Estate'}  |  Business report  |  Revenue counts payments marked paid in the period; appointments are counted by appointment date.`);
  return finish(doc);
}
