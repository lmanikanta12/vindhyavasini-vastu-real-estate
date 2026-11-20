import Modal from '../ui/Modal';
import PropertyArt from './PropertyArt';
import { StatusBadge } from '../ui/Badge';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../lib/utils';

export default function CompareModal({ open, onClose, items }) {
  const rows = [
    ['Price', (p) => formatPrice(p.price, p.listingType)],
    ['Location', (p) => `${p.location}, ${p.city}`],
    ['Type', (p) => `${p.category} - ${p.type}`],
    ['Area', (p) => `${p.area.toLocaleString('en-IN')} sq ft`],
    ['Bedrooms', (p) => (p.bedrooms ? `${p.bedrooms} BHK` : '-')],
    ['Bathrooms', (p) => p.bathrooms || '-'],
    ['Facing', (p) => p.facing],
    ['Floor', (p) => p.floor],
    ['Furnishing', (p) => p.furnishing],
    ['Age', (p) => (p.ageYears ? `${p.ageYears} years` : 'New')],
    ['Price per sq ft', (p) => (p.listingType === 'rent' ? `₹${Math.round(p.price / p.area)}/mo` : `₹${Math.round(p.price / p.area).toLocaleString('en-IN')}`)],
    ['Availability', (p) => <StatusBadge status={p.status} />],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Compare properties" subtitle="Side-by-side view of your selected listings" size="xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr>
              <th className="w-32 p-2" />
              {items.map((p) => (
                <th key={p.id} className="p-2 align-top">
                  <div className="aspect-[16/10] overflow-hidden rounded-xl">
                    <PropertyArt property={p} />
                  </div>
                  <Link to={`/properties/${p.id}`} onClick={onClose} className="mt-2 block font-display text-base font-semibold hover:text-brand">
                    {p.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-t border-line">
                <td className="p-3 text-xs font-bold uppercase tracking-wider text-muted">{label}</td>
                {items.map((p) => (
                  <td key={p.id} className="p-3 font-semibold">
                    {fn(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
