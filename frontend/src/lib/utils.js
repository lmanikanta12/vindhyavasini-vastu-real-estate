export const cn = (...args) => args.filter(Boolean).join(' ');

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export function formatPrice(price, listingType = 'sale') {
  const p = Number(price) || 0;
  if (listingType === 'rent') return `₹${p.toLocaleString('en-IN')}/mo`;
  if (p >= 1e7) return `₹${+(p / 1e7).toFixed(2)} Cr`;
  if (p >= 1e5) return `₹${+(p / 1e5).toFixed(2)} L`;
  return `₹${p.toLocaleString('en-IN')}`;
}

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const toISO = (date) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const addDays = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const todayISO = () => toISO(new Date());

export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '-';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-IN', opts);
};

export const fmtShortDate = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' });

export const fmtTime = (t) => {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const initials = (name = '') =>
  name
    .replace(/^(Dr\.|Acharya)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

export const isUpcoming = (iso, time = '23:59') => new Date(`${iso}T${time}:00`) >= new Date();

export const sortByDateAsc = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

export function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export async function compressImage(file, maxSize = 900, quality = 0.72) {
  const dataUrl = await readFileAsDataURL(file);
  if (!file.type.startsWith('image/')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const assetUrl = (u) => (u && u.startsWith('/uploads/') ? `${API_BASE}${u}` : u);

export const imgUrl = (src, w = 800) => {
  if (!src) return src;
  if (src.startsWith('/uploads/')) return assetUrl(src);
  return src.includes('images.unsplash.com') ? src.replace(/([?&])w=\d+/, `$1w=${w}`) : src;
};

export const passwordProblem = (pw) => {
  if (!pw || pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return '';
};
