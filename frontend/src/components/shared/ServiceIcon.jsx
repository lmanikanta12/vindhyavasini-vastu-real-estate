import { Building2, ClipboardCheck, FileSearch, Home, Map, Sparkles } from 'lucide-react';

const MAP = { FileSearch, Home, Map, Building2, ClipboardCheck, Sparkles };

export default function ServiceIcon({ name, size = 22 }) {
  const Icon = MAP[name] || Sparkles;
  return <Icon size={size} />;
}

export const SERVICE_ICON_NAMES = Object.keys(MAP);
