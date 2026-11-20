import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import Logo from './Logo';
import { useData } from '../../context/DataContext';
import { VASTU_DISCLAIMER } from '../../lib/constants';

export default function Footer() {
  const { db } = useData();
  const s = db.settings;
  const col = 'space-y-2.5 text-sm text-muted';
  const link = 'transition hover:text-brand';
  return (
    <footer className="mt-20 border-t border-line bg-sunken/50">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">Verified properties and appointment-based Vastu consultation, together in one place.</p>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider">Explore</h4>
          <ul className={col}>
            <li><Link className={link} to="/properties?mode=buy">Buy a property</Link></li>
            <li><Link className={link} to="/properties?mode=rent">Rent a property</Link></li>
            <li><Link className={link} to="/properties?category=Plot">Plots and land</Link></li>
            <li><Link className={link} to="/properties?category=Commercial">Commercial spaces</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider">Vastu</h4>
          <ul className={col}>
            <li><Link className={link} to="/vastu">Consultation services</Link></li>
            <li><Link className={link} to="/vastu/book">Book a consultation</Link></li>
            <li><Link className={link} to="/contact">Talk to us</Link></li>
            <li><Link className={link} to="/login">Customer login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider">Contact</h4>
          <ul className={col}>
            <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-brand" />{s.address}</li>
            <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 shrink-0 text-brand" />{s.phone}</li>
            <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 shrink-0 text-brand" />{s.email}</li>
            <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 shrink-0 text-brand" />{s.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p>&copy; {new Date().getFullYear()} Vindhyavasini Vastu and Real Estate. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 font-semibold" aria-label="Legal">
              <Link className={link} to="/terms">Terms &amp; Conditions</Link>
              <Link className={link} to="/privacy">Privacy Policy</Link>
              <Link className={link} to="/disclaimer">Disclaimer</Link>
            </nav>
          </div>
          <p className="max-w-xl sm:text-right"><b className="text-ink">Disclaimer: </b>{VASTU_DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
