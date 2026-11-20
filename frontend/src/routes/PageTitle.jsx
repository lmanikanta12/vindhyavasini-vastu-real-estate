import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND } from '../lib/constants';

const TITLES = [
  ['/properties/', 'Property details'],
  ['/properties', 'Properties'],
  ['/vastu/book', 'Book a Vastu consultation'],
  ['/vastu', 'Vastu services'],
  ['/construction', 'Construction'],
  ['/contact', 'Contact us'],
  ['/terms', 'Terms & Conditions'],
  ['/privacy', 'Privacy Policy'],
  ['/disclaimer', 'Disclaimer'],
  ['/login', 'Log in'],
  ['/register', 'Create account'],
  ['/customer', 'Customer dashboard'],
  ['/agent', 'Agent dashboard'],
  ['/consultant', 'Consultant dashboard'],
  ['/admin', 'Admin dashboard'],
];

/** Sets the browser tab title for every page: "Page name | Business name". */
export default function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const hit = TITLES.find(([p]) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
    document.title = hit ? `${hit[1]} | ${BRAND}` : BRAND;
  }, [pathname]);
  return null;
}
