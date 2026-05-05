// @ts-check

/** @type {Record<string, string>} */
const variants = {
  primary: 'bg-accent hover:bg-accent-strong text-accent-ink',
  secondary: 'bg-bg-elevated hover:bg-border border border-border text-ink',
  ghost: 'bg-transparent hover:bg-bg-elevated text-ink',
  play: 'bg-ink hover:bg-ink/80 text-bg',
};

/** @type {Record<string, string>} */
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2 text-base',
  lg: 'px-8 py-3 text-lg',
  full: 'w-full px-5 py-3 text-base',
};

/**
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: keyof typeof variants,
 *   size?: keyof typeof sizes,
 * }} props
 */
const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
