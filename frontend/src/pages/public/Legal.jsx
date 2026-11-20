import { Link, NavLink } from 'react-router-dom';
import { BRAND, VASTU_DISCLAIMER } from '../../lib/constants';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/utils';

const UPDATED = '29 October 2026';
const P = (text) => ({ p: text });
const L = (items) => ({ ul: items });
const H = (text) => ({ h: text });

const DOCS = {
  terms: {
    title: 'Terms & Conditions',
    intro: `These terms explain how you may use the ${BRAND} website and services. By creating an account or booking a service you agree to them.`,
    body: [
      H('1. Who we are and what we offer'),
      P(`${BRAND} lists properties for sale and rent, passes your enquiries to our property agents, and offers appointment-based Vastu consultation by our consultants, and takes requests for construction, renovation and interior work. We are an intermediary between customers, agents and consultants.`),
      H('2. Your account'),
      L([
        'You must give correct details and keep your password secret. You are responsible for activity under your account.',
        'We may verify your email address with a one-time code. We may suspend an account that is misused or that gives false information.',
        'Staff accounts (agents, consultants, administrators) are created by the administrator and are for business use only.',
      ]),
      H('3. Property listings'),
      L([
        'Listings are published by our agents. We try to keep price, area, photos and availability accurate, but details can change without notice and may contain mistakes.',
        'A listing is not an offer or a contract. A property can be sold, rented or reserved at any time. Please confirm all details, documents and legal title yourself before paying any money for a property.',
        "Site visits are subject to the agent's availability. Please arrive on time or reschedule or cancel from your dashboard.",
      ]),
      H('4. Vastu consultation'),
      L([
        'Consultations are booked for a date and time and are confirmed by the consultant. You may reschedule or cancel from your dashboard before the consultation is completed.',
        { text: `Reports and recommendations are consultancy guidance. ${VASTU_DISCLAIMER.replace('Vastu recommendations are provided as consultancy guidance only. They are not', 'Vastu recommendations are consultancy guidance and not')} See also our `, link: ['/disclaimer', 'Disclaimer'] },
      ]),
      H('5. Construction services'),
      L([
        'A construction request is an enquiry, not a contract. The site visit, quote and plan are shared with you first, and work starts only after you accept the quote.',
        'Quotes are estimates based on the details you give and the site visit. The final cost, timeline and scope can change if the requirements or site conditions change, and any change will be discussed with you first.',
      ]),
      H('6. Fees and payments'),
      L([
        'Consultation fees are shown before you confirm a booking, in Indian rupees. Online payments are processed by our payment partner (Razorpay). We do not see or store your card, UPI or bank details.',
        'A receipt is issued for every completed payment and can be downloaded from your dashboard.',
        'If you cancel a booking that is still unpaid, the pending fee is removed. If you cancel after paying, our office will contact you about any refund. Refunds, where due, go back to the original payment method.',
      ]),
      H('7. Acceptable use'),
      P('Do not misuse the website: no false enquiries or bookings, no attempts to break into accounts or the system, no scraping, and no uploading of unlawful or harmful files. Uploaded files must be yours to share.'),
      H('8. Our responsibility'),
      P('We provide the service with reasonable care. To the extent allowed by law we are not liable for losses that come from a decision you make about buying, renting or changing a property, from relying on Vastu guidance, or from relying on a construction estimate before a final quote is accepted. Nothing here limits any right you have under Indian consumer law.'),
      H('9. Changes, law and contact'),
      P('We may update these terms; the date above shows the latest version. These terms are governed by the laws of India. Disputes are subject to the courts at the location of our registered office.'),
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: `${BRAND} respects your privacy. This policy explains what personal information we collect, why, and the choices you have, in line with Indian data protection law.`,
    body: [
      H('1. Information we collect'),
      L([
        'Account details: name, email address, phone number, password (stored only as a one-way hash), city and address you add to your profile.',
        'Activity: enquiries, shortlisted properties, construction requests (project type, location, plot size and budget), site visit and consultation bookings, notes and recommendations, payments and receipts.',
        'Files you upload: floor plans, photos and documents attached to a booking or listing.',
        'Technical data: login times and an activity log of important actions (who did what, and when) kept for security and audit.',
      ]),
      H('2. Why we use it'),
      L([
        'To create and secure your account, verify your email and let you reset your password.',
        'To handle enquiries, construction requests, site visits, consultations and payments, and to send you emails and in-app notifications about them (confirmations, reminders, receipts).',
        'To prevent fraud and misuse, to keep records we must keep by law, and to improve the service.',
      ]),
      P('We do not sell your personal information.'),
      H('3. Who sees your information'),
      L([
        'Your assigned agent or consultant sees the details needed to serve you, such as your name, contact details and booking information.',
        'Our administrators can see records across the system to run the business.',
        'Service providers: our payment partner (Razorpay) processes payments, and an email provider delivers our emails. They receive only what they need and are bound by their own policies.',
        'We may disclose information if the law or a court requires it.',
      ]),
      H('4. Security and retention'),
      P('Passwords are hashed, access is controlled by role, and repeated wrong passwords temporarily lock an account. We keep your information while your account is active and for as long as business or legal record-keeping needs it, then delete or anonymise it.'),
      H('5. Your choices and rights'),
      L([
        'Update your details and email preferences from your profile.',
        'Download a copy of your data, or delete your account yourself, from the My data section of your profile page. Deleting erases your name, email, phone and address and cancels your open bookings. Payment records are kept without your personal details because they are needed for accounting and the law.',
        'Ask us to correct your personal information or to withdraw consent by writing to us.',
        'Important emails such as verification codes and payment receipts are always sent because they are part of the service.',
      ]),
      H('6. Cookies and local storage'),
      P('We store your login token and your light/dark theme choice in your browser so the site works. We do not use advertising cookies.'),
      H('7. Changes and contact'),
      P('We may update this policy and will change the date above when we do.'),
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    intro: 'Vastu recommendations are consultancy guidance and not a guarantee of property value, health, financial outcomes or other results.',
    body: [
      H('1. Vastu consultancy'),
      P('Vastu Shastra is a traditional system of orientation and layout. Our consultants share their professional opinion and practical suggestions. These are guidance only. They are not scientific, medical, legal or financial advice, and we make no promise about any result.'),
      P('You should not delay medical treatment, change your finances or make a property decision only because of Vastu guidance.'),
      H('2. Property information'),
      P('Property details, prices and photos are supplied by agents and owners and may change. Listings do not guarantee availability. Please verify ownership, approvals, measurements and legal documents before you pay or sign anything.'),
      H('3. Construction'),
      P('Construction quotes, timelines and plans are estimates and can change after the site visit or when your requirements change. Please read the final quote and agreement carefully and check all approvals and permissions before work starts.'),
      H('4. Where this appears'),
      P('This disclaimer is shown on the consultation booking page, in every downloadable Vastu report and receipt, and in the website footer.'),
    ],
  },
};

const TABS = [['/terms', 'Terms & Conditions'], ['/privacy', 'Privacy Policy'], ['/disclaimer', 'Disclaimer']];

export default function Legal({ doc }) {
  const d = DOCS[doc];
  const s = useData().db.settings;
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-4xl font-semibold">{d.title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Legal pages">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('rounded-full border px-4 py-1.5 text-sm font-bold transition', isActive ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted hover:text-brand')}>{label}</NavLink>
        ))}
      </nav>
      <div className="mt-8 space-y-3 leading-relaxed">
        <p className="text-justify text-muted">{d.intro}</p>
        {d.body.map((b, i) => {
          if (b.h) return <h2 key={i} className="!mt-7 font-display text-xl font-semibold">{b.h}</h2>;
          if (b.p) return <p key={i} className="text-justify text-muted">{b.p}</p>;
          return (
            <ul key={i} className="list-disc space-y-2 pl-5 text-justify text-muted">
              {b.ul.map((it, n) => (typeof it === 'string' ? <li key={n}>{it}</li> : <li key={n}>{it.text}<Link to={it.link[0]} className="font-semibold text-brand underline">{it.link[1]}</Link>.</li>))}
            </ul>
          );
        })}
        <p className="!mt-8 border-t border-line pt-4 text-sm text-muted">Questions? Write to {s.email} or call {s.phone}. Address: {s.address}.</p>
      </div>
      </div>
    </div>
  );
}
