// @ts-check
import { forwardRef } from 'react';

/**
 * @typedef {React.InputHTMLAttributes<HTMLInputElement> & {
 *   label?: string,
 *   error?: string,
 * }} InputProps
 */

const Input = forwardRef(
  /**
   * @param {InputProps} props
   * @param {React.ForwardedRef<HTMLInputElement>} ref
   */
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-ink-muted mb-1.5 block text-sm font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`bg-bg-elevated/70 border-border focus:border-accent focus:ring-accent text-ink placeholder:text-ink-faint w-full rounded-md border px-4 py-3 transition-colors focus:ring-1 focus:outline-none ${className}`}
          {...props}
        />
        {error && <p className="text-accent mt-1 text-sm">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
