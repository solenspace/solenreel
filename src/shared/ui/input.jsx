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
        {label && <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>}
        <input
          ref={ref}
          className={`bg-bg-elevated/70 focus:border-accent focus:ring-accent w-full rounded-md border border-gray-600 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:ring-1 focus:outline-none ${className}`}
          {...props}
        />
        {error && <p className="text-accent mt-1 text-sm">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
