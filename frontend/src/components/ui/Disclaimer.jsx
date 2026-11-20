import { Info } from 'lucide-react';
import { VASTU_DISCLAIMER } from '../../lib/constants';
import { cn } from '../../lib/utils';

export default function Disclaimer({ className }) {
  return (
    <aside className={cn('flex items-start gap-3 rounded-2xl border border-fire/50 bg-fire/10 p-4 text-sm', className)} aria-label="Disclaimer">
      <Info size={19} className="mt-0.5 shrink-0 text-brand" />
      <p><b>Disclaimer: </b>{VASTU_DISCLAIMER}</p>
    </aside>
  );
}
