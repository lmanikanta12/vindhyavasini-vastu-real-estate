import { env } from '../config/env.js';
import { escapeHtml as h, inr } from '../utils/helpers.js';

const C = { earth: '#B5532E', deep: '#7A3418', space: '#F8F2E6', ink: '#3B2A1E', muted: '#7A6656', line: '#E6DAC6', card: '#FFFFFF', air: '#7C9A7A', fire: '#D9A441' };

export function layout({ preheader = '', title, intro = '', rows = [], paragraphs = [], cta, code, note, brand = 'Vindhyavasini Vastu and Real Estate' }) {
  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;border:1px solid ${C.line};border-radius:12px;border-collapse:separate;overflow:hidden">
        ${rows.map(([k, v], i) => `<tr><td style="padding:11px 16px;font-size:13px;color:${C.muted};width:38%;${i ? `border-top:1px solid ${C.line};` : ''}background:${C.space}">${h(k)}</td><td style="padding:11px 16px;font-size:14px;font-weight:600;color:${C.ink};${i ? `border-top:1px solid ${C.line};` : ''}">${h(v)}</td></tr>`).join('')}
       </table>`
    : '';
  const codeHtml = code
    ? `<div style="margin:24px 0;text-align:center"><div style="display:inline-block;padding:16px 28px;background:${C.space};border:2px dashed ${C.earth};border-radius:14px;font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;font-weight:700;color:${C.deep}">${h(code)}</div></div>`
    : '';
  const ctaHtml = cta
    ? `<div style="margin:26px 0 6px;text-align:center"><a href="${h(cta.url)}" style="display:inline-block;background:${C.earth};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:12px">${h(cta.label)}</a></div>`
    : '';
  const paras = paragraphs.map((p) => `<p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:${C.ink}">${h(p)}</p>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title></head>
<body style="margin:0;padding:0;background:${C.space};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${h(preheader || intro)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.space};padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td style="padding:0 4px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:38px;height:38px;background:${C.earth};border-radius:10px;text-align:center;color:#fff;font-weight:700;font-size:20px;font-family:Georgia,serif">V</td>
        <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:${C.deep}">${h(brand)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
      <div style="height:6px;background:linear-gradient(90deg,${C.earth},${C.fire},${C.air})"></div>
      <div style="padding:32px 30px 30px">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.3;color:${C.deep}">${h(title)}</h1>
        ${intro ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:${C.ink}">${h(intro)}</p>` : ''}
        ${codeHtml}${rowsHtml}${paras}${ctaHtml}
        ${note ? `<p style="margin:22px 0 0;font-size:12.5px;line-height:1.6;color:${C.muted}">${h(note)}</p>` : ''}
      </div>
    </td></tr>
    <tr><td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:${C.muted}">
      You are receiving this email because you have an account with ${h(brand)}.<br>
      Vastu guidance is consultancy advice, not a guarantee of any outcome.<br>
      &copy; ${new Date().getFullYear()} ${h(brand)}
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = [title, '', intro, code ? `\nYour code: ${code}\n` : '', ...rows.map(([k, v]) => `${k}: ${v}`), ...paragraphs, cta ? `\n${cta.label}: ${cta.url}` : '', note ? `\n${note}` : ''].filter((x) => x !== undefined && x !== null).join('\n');
  return { html, text };
}

const link = (path) => `${env.clientUrl}${path}`;

export const templates = {
  otpVerify: ({ name, code }) => ({ subject: `${code} is your Vindhyavasini Vastu and Real Estate verification code`, ...layout({ title: 'Verify your email address', intro: `Hello ${name || 'there'}, use this code to finish creating your account.`, code, note: 'The code works for 10 minutes and can be used once. If you did not sign up, you can ignore this email.' }) }),
  otpReset: ({ name, code }) => ({ subject: `${code} is your password reset code`, ...layout({ title: 'Reset your password', intro: `Hello ${name || 'there'}, we received a request to reset your password. Enter this code to continue.`, code, note: 'The code works for 10 minutes and can be used once. If you did not ask for this, please ignore this email. Your password will stay the same.' }) }),
  welcome: ({ name, role }) => ({ subject: 'Welcome to Vindhyavasini Vastu and Real Estate', ...layout({ title: `Welcome, ${name}`, intro: 'Your email is verified and your account is ready.', paragraphs: ['Search verified properties, send enquiries, request site visits and book Vastu consultations from one dashboard.'], cta: { label: 'Open my dashboard', url: link(`/${role || 'customer'}`) } }) }),
  accountCreated: ({ name, role, email, password }) => ({ subject: 'Your Vindhyavasini Vastu and Real Estate account is ready', ...layout({ title: `Hello ${name}`, intro: `An administrator created a ${role} account for you.`, rows: [['Login email', email], ['Temporary password', password]], paragraphs: ['Please log in and change your password from the Profile page.'], cta: { label: 'Log in', url: link('/login') } }) }),
  passwordChanged: ({ name }) => ({ subject: 'Your password was changed', ...layout({ title: 'Password changed', intro: `Hello ${name}, your Vindhyavasini Vastu and Real Estate password was just changed.`, paragraphs: ['If this was you, no action is needed. If not, reset your password immediately and contact us.'], cta: { label: 'Reset password', url: link('/forgot-password') } }) }),
  enquiryCustomer: ({ name, ref, property, agent }) => ({ subject: `Enquiry received (${ref})`, ...layout({ title: 'We received your enquiry', intro: `Hello ${name}, thank you for your interest. ${agent ? `${agent} will contact you shortly.` : 'Our team will contact you shortly.'}`, rows: [['Enquiry', ref], ['Property', property || 'General enquiry'], ...(agent ? [['Assigned agent', agent]] : [])], cta: { label: 'Track my enquiries', url: link('/customer/enquiries') } }) }),
  enquiryAgent: ({ agentName, ref, property, customer, phone, email, message }) => ({ subject: `New enquiry ${ref}: ${property || 'General'}`, ...layout({ title: 'New enquiry assigned to you', intro: `Hello ${agentName}, a customer is waiting to hear from you.`, rows: [['Enquiry', ref], ['Property', property || 'General enquiry'], ['Customer', customer], ['Phone', phone || '-'], ['Email', email || '-'], ['Message', message || '-']], cta: { label: 'Open enquiries', url: link('/agent/enquiries') } }) }),
  enquiryUpdate: ({ name, ref, property, status, agent }) => ({ subject: `Enquiry ${ref} is now ${status}`, ...layout({ title: 'Your enquiry was updated', intro: `Hello ${name}, there is an update on your enquiry.`, rows: [['Enquiry', ref], ['Property', property || 'General enquiry'], ['Status', status], ...(agent ? [['Agent', agent]] : [])], cta: { label: 'View details', url: link('/customer/enquiries') } }) }),
  constructionCustomer: ({ name, ref, type, location }) => ({ subject: `Construction request received (${ref})`, ...layout({ title: 'We received your construction request', intro: `Hello ${name}, thank you for your interest. Our team will contact you shortly to plan a site visit.`, rows: [['Reference', ref], ['Project', type], ['Location', location]], cta: { label: 'Track my request', url: link('/customer/construction') } }) }),
  constructionUpdate: ({ name, ref, type, status, quote }) => ({ subject: `Construction ${ref} is now ${status}`, ...layout({ title: 'Your construction request was updated', intro: `Hello ${name}, there is an update on your request.`, rows: [['Reference', ref], ['Project', type], ['Status', status], ...(quote ? [['Quote', inr(quote)]] : [])], cta: { label: 'View details', url: link('/customer/construction') } }) }),
  visitUpdate: ({ name, ref, status, property, date, time, address, agent, kind = 'customer' }) => ({
    subject: `Site visit ${ref}: ${status}`,
    ...layout({
      title: `Site visit ${status.toLowerCase()}`,
      intro: kind === 'agent' ? `Hello ${name}, a site visit needs your attention.` : `Hello ${name}, here is the latest on your site visit.`,
      rows: [['Visit', ref], ['Property', property], ['Date', date], ['Time', time], ...(address ? [['Address', address]] : []), ...(agent ? [[kind === 'agent' ? 'Customer' : 'Agent', agent]] : []), ['Status', status]],
      cta: { label: 'View my visits', url: link(kind === 'agent' ? '/agent/visits' : '/customer/appointments') },
    }),
  }),
  consultationUpdate: ({ name, ref, status, service, date, time, consultant, customer, fee, kind = 'customer', extra }) => ({
    subject: `Vastu consultation ${ref}: ${status}`,
    ...layout({
      title: `Consultation ${status.toLowerCase()}`,
      intro: kind === 'customer' ? `Hello ${name}, here is the latest on your Vastu consultation.` : `Hello ${name}, a consultation needs your attention.`,
      rows: [['Booking', ref], ['Service', service], ['Date', date], ['Time', time], [kind === 'customer' ? 'Consultant' : 'Customer', kind === 'customer' ? consultant : customer], ['Fee', fee], ['Status', status]],
      paragraphs: extra ? [extra] : [],
      cta: { label: 'Open dashboard', url: link(kind === 'customer' ? '/customer/appointments' : kind === 'admin' ? '/admin/appointments' : '/consultant/requests') },
      note: 'Vastu recommendations are consultancy guidance, not a guarantee of any outcome.',
    }),
  }),
  recommendations: ({ name, ref, service, consultant }) => ({ subject: `Your Vastu recommendations are ready (${ref})`, ...layout({ title: 'Your recommendations are ready', intro: `Hello ${name}, ${consultant} has completed your ${service} and added written recommendations.`, rows: [['Booking', ref], ['Service', service]], cta: { label: 'Read recommendations', url: link('/customer/appointments') }, note: 'Vastu recommendations are consultancy guidance, not a guarantee of property value, health, finances or any other result.' }) }),
  paymentReceipt: ({ name, receipt, description, amount, method, date }) => ({ subject: `Payment received ${receipt}`, ...layout({ title: 'Payment successful', intro: `Hello ${name}, we have received your payment. Thank you.`, rows: [['Receipt', receipt], ['For', description], ['Amount', amount], ['Method', method || '-'], ['Date', date]], cta: { label: 'View receipt', url: link('/customer/payments') } }) }),
  paymentPending: ({ name, receipt, description, amount }) => ({ subject: `Payment pending ${receipt}`, ...layout({ title: 'A payment is waiting', intro: `Hello ${name}, your consultation fee is still pending.`, rows: [['Receipt', receipt], ['For', description], ['Amount', amount]], cta: { label: 'Pay now', url: link('/customer/payments') } }) }),
  reminder: ({ name, what, ref, date, time, who, whoLabel = 'With' }) => ({ subject: `Reminder: ${what} on ${date}`, ...layout({ title: `Reminder: ${what}`, intro: `Hello ${name}, this is a friendly reminder about your upcoming appointment.`, rows: [['Booking', ref], ['Date', date], ['Time', time], [whoLabel, who]], cta: { label: 'View appointment', url: link('/') } }) }),
  contactAck: ({ name }) => ({ subject: 'We received your message', ...layout({ title: 'Thank you for contacting us', intro: `Hello ${name}, we have received your message and will reply soon.` }) }),
  generic: ({ name, title, text, to }) => ({ subject: title, ...layout({ title, intro: `Hello ${name},`, paragraphs: [text], cta: to ? { label: 'Open', url: link(to) } : undefined }) }),
};
