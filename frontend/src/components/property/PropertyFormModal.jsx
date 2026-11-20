import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, ImagePlus, Trash2, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import { Input, Select, Textarea, Toggle } from '../ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { AMENITIES, CITIES, DIRECTIONS, PROPERTY_CATEGORIES, PROPERTY_STATUSES, PROPERTY_TYPES } from '../../lib/constants';
import { uploadFile } from '../../lib/api';
import { cn, imgUrl } from '../../lib/utils';

const MAX_PHOTOS = 12;
const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

const EMPTY = {
  title: '', category: 'Residential', type: 'Villa', city: 'Bengaluru', location: '', address: '', price: '', area: '', bedrooms: 0, bathrooms: 0,
  floor: '', facing: 'East', ageYears: 0, furnishing: 'Unfurnished', amenities: [], description: '', vastuNotes: '', status: 'Available',
  published: true, featured: false, images: [], documents: [], agentId: '', lat: '', lng: '',
};

export default function PropertyFormModal({ open, onClose, property, isAdmin = false }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const agents = data.usersByRole('agent');

  useEffect(() => {
    if (open) {
      setErrors({});
      setLink('');
      setF(property ? { ...EMPTY, ...property, lat: property.lat ?? '', lng: property.lng ?? '' } : { ...EMPTY, agentId: user.role === 'agent' ? user.id : agents[0]?.id || '' });
    }

  }, [open, property]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const setCategory = (e) => {
    const category = e.target.value;
    setF((x) => ({ ...x, category, type: PROPERTY_TYPES[category][0], listingType: category === 'Rental' ? 'rent' : 'sale' }));
  };

  const toggleAmenity = (a) => setF((x) => ({ ...x, amenities: x.amenities.includes(a) ? x.amenities.filter((i) => i !== a) : [...x.amenities, a] }));

  const addLink = () => {
    const u = link.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) return toast('Paste a full image link that starts with https://', 'error');
    if (f.images.length >= MAX_PHOTOS) return toast(`You can add up to ${MAX_PHOTOS} photos.`, 'error');
    if (f.images.includes(u)) return toast('That photo is already added.', 'error');
    setF((x) => ({ ...x, images: [...x.images, u] }));
    setLink('');
    toast('Photo added from link.');
  };

  const addImages = async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - f.images.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    const urls = [];
    for (const file of files) {
      try {
        urls.push((await uploadFile(file, { maxWidth: 1400 })).url);
      } catch (err) {
        toast(err.message, 'error');
      }
    }
    setF((x) => ({ ...x, images: [...x.images, ...urls].slice(0, MAX_PHOTOS) }));
    if (urls.length) toast(`${urls.length} photo${urls.length > 1 ? 's' : ''} added.`);
    setBusy(false);
  };

  const addDocs = async (e) => {
    const files = [...e.target.files].slice(0, 3 - (f.documents?.length || 0));
    e.target.value = '';
    setBusy(true);
    const out = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name} is larger than 8 MB.`, 'error'); continue; }
      try {
        out.push({ name: file.name, url: (await uploadFile(file)).url });
      } catch (err) {
        toast(err.message, 'error');
      }
    }
    setF((x) => ({ ...x, documents: [...(x.documents || []), ...out].slice(0, 3) }));
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = {};
    if (!f.title.trim()) err.title = 'Add a title.';
    if (!f.location.trim()) err.location = 'Add the locality.';
    if (!(Number(f.price) > 0)) err.price = 'Enter a valid price.';
    if (!(Number(f.area) > 0)) err.area = 'Enter the area.';
    if (!f.description.trim()) err.description = 'Add a short description.';
    setErrors(err);
    if (Object.keys(err).length) return;

    const { id, ref, createdAt, updatedAt, ...rest } = f;
    const payload = {
      ...rest,
      title: f.title.trim(),
      price: Number(f.price),
      area: Number(f.area),
      bedrooms: Number(f.bedrooms) || 0,
      bathrooms: Number(f.bathrooms) || 0,
      ageYears: Number(f.ageYears) || 0,
      listingType: f.category === 'Rental' ? 'rent' : 'sale',
      lat: f.lat === '' ? null : Number(f.lat),
      lng: f.lng === '' ? null : Number(f.lng),
    };
    setBusy(true);
    const saved = property ? await data.update('properties', property.id, payload) : await data.add('properties', payload);
    setBusy(false);
    if (!saved) return;
    toast(property ? 'Listing updated.' : 'Listing created.');
    onClose();
  };

  const rent = f.category === 'Rental';
  const plot = f.category === 'Plot';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={property ? 'Edit listing' : 'Add a new listing'}
      subtitle={property ? property.ref : 'Fill in the property details and publish when ready'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="property-form" className="btn btn-primary" disabled={busy}>{property ? 'Save changes' : 'Create listing'}</button>
        </>
      }
    >
      <form id="property-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-6" noValidate>
        <Input wrapperClass="sm:col-span-6" label="Title" placeholder="e.g. 3 BHK Villa, East facing" value={f.title} onChange={set('title')} error={errors.title} required />
        <Select wrapperClass="sm:col-span-3" label="Category" value={f.category} onChange={setCategory} options={PROPERTY_CATEGORIES} />
        <Select wrapperClass="sm:col-span-3" label="Property type" value={f.type} onChange={set('type')} options={PROPERTY_TYPES[f.category]} />
        <Select wrapperClass="sm:col-span-2" label="City" value={f.city} onChange={set('city')} options={CITIES} />
        <Input wrapperClass="sm:col-span-4" label="Locality" placeholder="e.g. Whitefield" value={f.location} onChange={set('location')} error={errors.location} required />
        <Input wrapperClass="sm:col-span-6" label="Address" value={f.address} onChange={set('address')} />
        <Input wrapperClass="sm:col-span-3" label="Map latitude (optional)" type="number" step="any" placeholder="e.g. 12.9716" hint="Leave empty and the map finds the address." value={f.lat} onChange={set('lat')} />
        <Input wrapperClass="sm:col-span-3" label="Map longitude (optional)" type="number" step="any" placeholder="e.g. 77.5946" value={f.lng} onChange={set('lng')} />
        <Input wrapperClass="sm:col-span-3" label={rent ? 'Monthly rent (₹)' : 'Price (₹)'} type="number" min="0" value={f.price} onChange={set('price')} error={errors.price} required />
        <Input wrapperClass="sm:col-span-3" label="Area (sq ft)" type="number" min="0" value={f.area} onChange={set('area')} error={errors.area} required />
        {!plot && (
          <>
            <Input wrapperClass="sm:col-span-2" label="Bedrooms" type="number" min="0" value={f.bedrooms} onChange={set('bedrooms')} />
            <Input wrapperClass="sm:col-span-2" label="Bathrooms" type="number" min="0" value={f.bathrooms} onChange={set('bathrooms')} />
            <Input wrapperClass="sm:col-span-2" label="Floor" placeholder="e.g. 4th of 10" value={f.floor} onChange={set('floor')} />
            <Input wrapperClass="sm:col-span-2" label="Age (years)" type="number" min="0" value={f.ageYears} onChange={set('ageYears')} />
            <Select wrapperClass="sm:col-span-4" label="Furnishing" value={f.furnishing} onChange={set('furnishing')} options={['Unfurnished', 'Semi-furnished', 'Furnished']} />
          </>
        )}
        <Select wrapperClass="sm:col-span-3" label="Facing direction" value={f.facing} onChange={set('facing')} options={DIRECTIONS} />
        <Select wrapperClass="sm:col-span-3" label="Availability status" value={f.status} onChange={set('status')} options={PROPERTY_STATUSES} />
        {isAdmin && <Select wrapperClass="sm:col-span-6" label="Assigned agent" value={f.agentId} onChange={set('agentId')} options={agents.map((a) => ({ value: a.id, label: a.name }))} />}
        <Textarea wrapperClass="sm:col-span-6" label="Description" rows={3} value={f.description} onChange={set('description')} error={errors.description} required />
        <Textarea wrapperClass="sm:col-span-6" label="Orientation and Vastu notes" hint="Factual layout notes such as entrance direction. Avoid promising outcomes." rows={2} value={f.vastuNotes} onChange={set('vastuNotes')} />

        <div className="sm:col-span-6">
          <span className="label">Amenities</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button type="button" key={a} onClick={() => toggleAmenity(a)} className={cn('chip', f.amenities.includes(a) && 'chip-active')} aria-pressed={f.amenities.includes(a)}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-6">
          <span className="label">Photo gallery (up to {MAX_PHOTOS}, the first photo is the cover)</span>
          <div className="flex flex-wrap gap-3">
            {f.images.map((src, i) => (
              <div key={src + i} className="group relative h-24 w-32 overflow-hidden rounded-xl border border-line">
                <img src={imgUrl(src, 300)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-brand">Cover</span>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 px-1 py-1 text-white opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                  <button type="button" disabled={i === 0} onClick={() => setF((x) => ({ ...x, images: move(x.images, i, i - 1) }))} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Move photo earlier"><ChevronLeft size={16} /></button>
                  <button type="button" onClick={() => setF((x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))} className="rounded p-1 hover:bg-white/20" aria-label="Remove photo"><Trash2 size={16} /></button>
                  <button type="button" disabled={i === f.images.length - 1} onClick={() => setF((x) => ({ ...x, images: move(x.images, i, i + 1) }))} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Move photo later"><ChevronRight size={16} /></button>
                </div>
              </div>
            ))}
            {f.images.length < MAX_PHOTOS && (
              <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs font-bold text-muted transition hover:border-brand hover:text-brand">
                <ImagePlus size={22} />
                {busy ? 'Uploading...' : 'Add photos'}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={addImages} />
              </label>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="url" className="input flex-1" placeholder="Or paste an image link, for example https://..." value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} aria-label="Image link" />
            <button type="button" className="btn btn-outline btn-sm" onClick={addLink}>Add link</button>
          </div>
          <p className="mt-1.5 text-xs text-muted">Select several photos at once. Customers see them in a gallery with a full-screen viewer. Without photographs, an illustrated placeholder is shown.</p>
        </div>

        <div className="sm:col-span-6">
          <span className="label">Supporting documents (up to 3, max 8 MB each)</span>
          <div className="flex flex-wrap items-center gap-3">
            {(f.documents || []).map((d, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2 text-sm font-semibold">
                <FileText size={16} className="text-brand" />
                <span className="max-w-[10rem] truncate">{d.name}</span>
                <button type="button" onClick={() => setF((x) => ({ ...x, documents: x.documents.filter((_, j) => j !== i) }))} aria-label={`Remove ${d.name}`} className="text-muted hover:text-ink"><Trash2 size={15} /></button>
              </span>
            ))}
            {(f.documents?.length || 0) < 3 && (
              <label className="btn btn-outline btn-sm cursor-pointer"><Upload size={16} /> Add document<input type="file" accept=".pdf,.doc,.docx,image/*" multiple className="sr-only" onChange={addDocs} /></label>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">Brochures, layout approvals, ownership papers or floor plans for customers to download.</p>
        </div>

        <div className="space-y-4 rounded-xl border border-line p-4 sm:col-span-6">
          <Toggle label="Published" description="Visible to customers on the website" checked={f.published} onChange={(v) => setF((x) => ({ ...x, published: v }))} />
          {isAdmin && <Toggle label="Featured" description="Show on the home page" checked={f.featured} onChange={(v) => setF((x) => ({ ...x, featured: v }))} />}
        </div>
      </form>
    </Modal>
  );
}
