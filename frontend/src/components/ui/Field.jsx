import { useId } from 'react';
import { cn } from '../../lib/utils';

export function Field({ label, hint, error, children, className, required, htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="text-brand"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Input({ label, hint, error, className, wrapperClass, required, id, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClass} required={required} htmlFor={fid}>
      <input id={fid} className={cn('input', error && 'border-red-500', className)} required={required} {...props} />
    </Field>
  );
}

export function Select({ label, hint, error, options = [], className, wrapperClass, placeholder, required, id, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClass} required={required} htmlFor={fid}>
      <select id={fid} className={cn('input appearance-none bg-no-repeat pr-9', className)} required={required} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Textarea({ label, hint, error, className, wrapperClass, required, rows = 4, id, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClass} required={required} htmlFor={fid}>
      <textarea id={fid} rows={rows} className={cn('input resize-y', className)} required={required} {...props} />
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-brand' : 'bg-line')}
      >
        <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform duration-300', checked && 'translate-x-5')} />
      </button>
    </label>
  );
}
