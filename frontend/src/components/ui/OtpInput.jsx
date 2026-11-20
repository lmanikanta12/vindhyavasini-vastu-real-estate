import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export default function OtpInput({ value, onChange, length = 6, disabled, error, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const set = (i, ch) => {
    const next = digits.slice();
    next[i] = ch;
    onChange(next.join(''));
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) set(i, '');
      else if (i > 0) { set(i - 1, ''); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onInput = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    if (!ch) return;
    set(i, ch);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" onPaste={onPaste} role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn('input h-14 w-full min-w-0 px-0 text-center font-display text-2xl font-semibold', error && 'border-red-500', d && 'border-brand')}
        />
      ))}
    </div>
  );
}
