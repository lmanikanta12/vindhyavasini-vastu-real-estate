export const BRAND = 'Vindhyavasini Vastu and Real Estate';

export const ROLES = {
  customer: { label: 'Customer', home: '/customer' },
  agent: { label: 'Real Estate Agent', home: '/agent' },
  consultant: { label: 'Vastu Consultant', home: '/consultant' },
  admin: { label: 'Administrator', home: '/admin' },
};

export const DIRECTIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];

export const PROPERTY_CATEGORIES = ['Residential', 'Commercial', 'Rental', 'Plot'];

export const PROPERTY_TYPES = {
  Residential: ['Villa', 'Apartment', 'Independent House', 'Penthouse'],
  Commercial: ['Office Space', 'Retail Shop', 'Warehouse', 'Showroom'],
  Rental: ['Apartment', 'Independent House', 'Office Space', 'Studio'],
  Plot: ['Residential Plot', 'Commercial Plot', 'Farm Plot'],
};

export const CITIES = ['Bengaluru', 'Hyderabad', 'Chennai', 'Pune'];

export const AMENITIES = [
  'Covered Parking',
  'Power Backup',
  'Security',
  'Lift',
  'Garden',
  'Clubhouse',
  'Swimming Pool',
  'Gym',
  'Water Supply',
  'Gated Community',
  'Vastu Compliant Entrance',
  'Rain Water Harvesting',
];

export const PROPERTY_STATUSES = ['Available', 'Reserved', 'Sold', 'Rented'];
export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Scheduled', 'Completed', 'Closed'];
export const VISIT_STATUSES = ['Requested', 'Scheduled', 'Completed', 'Cancelled'];
export const CONSTRUCTION_TYPES = ['New house construction', 'Apartment or villa construction', 'Commercial building', 'Renovation and repairs', 'Interior work'];
export const CONSTRUCTION_STATUSES = ['New', 'Site visit', 'Quoted', 'In progress', 'Completed', 'Closed'];
export const CONSULT_STATUSES = ['Requested', 'Confirmed', 'Completed', 'Cancelled'];
export const PAYMENT_STATUSES = ['Pending', 'Completed'];

export const TIME_SLOTS = ['10:00', '11:30', '14:00', '15:30', '17:00'];
export const VISIT_SLOTS = ['09:30', '11:00', '12:30', '15:00', '16:30'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const BUDGETS = {
  sale: [
    { key: 'any', label: 'Any budget' },
    { key: 'u50l', label: 'Under ₹50 L', max: 5e6 },
    { key: '50l1c', label: '₹50 L - ₹1 Cr', min: 5e6, max: 1e7 },
    { key: '1c2c', label: '₹1 Cr - ₹2 Cr', min: 1e7, max: 2e7 },
    { key: '2c5c', label: '₹2 Cr - ₹5 Cr', min: 2e7, max: 5e7 },
    { key: 'o5c', label: 'Above ₹5 Cr', min: 5e7 },
  ],
  rent: [
    { key: 'any', label: 'Any budget' },
    { key: 'u25k', label: 'Under ₹25,000', max: 25000 },
    { key: '25k50k', label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
    { key: '50k1l', label: '₹50,000 - ₹1 L', min: 50000, max: 100000 },
    { key: 'o1l', label: 'Above ₹1 L', min: 100000 },
  ],
};

export const SIZES = [
  { key: 'any', label: 'Any size' },
  { key: 's1', label: 'Under 1,000 sq ft', max: 1000 },
  { key: 's2', label: '1,000 - 2,000 sq ft', min: 1000, max: 2000 },
  { key: 's3', label: '2,000 - 3,500 sq ft', min: 2000, max: 3500 },
  { key: 's4', label: 'Above 3,500 sq ft', min: 3500 },
];

export const STATUS_TONE = {
  Available: 'air',
  Reserved: 'fire',
  Sold: 'brand',
  Rented: 'water',
  New: 'water',
  Contacted: 'fire',
  Scheduled: 'brand',
  Completed: 'air',
  Closed: 'muted',
  Requested: 'fire',
  Confirmed: 'air',
  Cancelled: 'muted',
  Pending: 'fire',
  Active: 'air',
  Inactive: 'muted',
  Published: 'air',
  Draft: 'muted',
  'Site visit': 'brand',
  Quoted: 'fire',
  'In progress': 'water',
};

export const ELEMENTS = [
  { key: 'earth', photo: 'photo-1557431103-9e10a5279b1b', name: 'Earth', sanskrit: 'Prithvi', color: 'brand', text: 'Stability and grounding. Associated with the south-west of a plot.' },
  { key: 'water', photo: 'photo-1438449805896-28a666819a20', name: 'Water', sanskrit: 'Jal', color: 'water', text: 'Flow and clarity. Associated with the north-east of a plot.' },
  { key: 'fire', photo: 'photo-1597856911509-359a0a0e0bcc', name: 'Fire', sanskrit: 'Agni', color: 'fire', text: 'Energy and warmth. Associated with the south-east of a plot.' },
  { key: 'air', photo: 'photo-1625759910025-16c05c4a7ec2', name: 'Air', sanskrit: 'Vayu', color: 'air', text: 'Movement and freshness. Associated with the north-west of a plot.' },
  { key: 'space', photo: 'photo-1592071666760-421c34665779', name: 'Space', sanskrit: 'Akasha', color: 'space', text: 'Openness and light. Associated with the centre of a plot.' },
];

export const VASTU_DISCLAIMER =
  'Vastu recommendations are consultancy guidance and not a guarantee of property value, health, financial outcomes or other results.';
