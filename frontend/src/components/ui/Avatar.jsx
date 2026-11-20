import { cn, initials } from '../../lib/utils';

const COLORS = ['bg-brand/20', 'bg-water/35', 'bg-fire/35', 'bg-air/35'];

export default function Avatar({ name = '', size = 'md', className }) {
  const idx = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length;
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-ink', COLORS[idx], sizes[size], className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
