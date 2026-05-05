// @ts-check
import { useLayoutEffect, useState } from 'react';

const COLOR_TOKENS = /** @type {const} */ ([
  '--color-bg',
  '--color-bg-elevated',
  '--color-bg-overlay',
  '--color-ink',
  '--color-ink-muted',
  '--color-ink-faint',
  '--color-border',
  '--color-border-subtle',
  '--color-accent',
  '--color-accent-strong',
  '--color-accent-ink',
  '--color-success',
  '--color-danger',
]);

/**
 * @param {string} name
 * @returns {string}
 */
const readToken = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const Tokens = () => {
  const [theme, setTheme] = useState(
    /** @type {'dark' | 'light'} */ (
      document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
    ),
  );

  useLayoutEffect(() => {
    if (theme === 'dark') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'light';
  }, [theme]);

  const display = readToken('--font-display');
  const sans = readToken('--font-sans');
  const mono = readToken('--font-mono');

  return (
    <div className="bg-bg text-ink min-h-screen px-8 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="display text-3xl font-semibold">Token reference</h1>
          <p className="text-ink-muted mt-2 text-sm">
            Live values from <code className="font-mono">getComputedStyle</code>. Toggle theme to
            see overrides.
          </p>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="bg-bg-elevated text-ink border-border hover:bg-border rounded-md border px-4 py-2 text-sm transition-colors"
        >
          theme: {theme}
        </button>
      </header>

      <section className="mb-12">
        <h2 className="text-ink-muted mb-4 text-xs tracking-widest uppercase">Color</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_TOKENS.map((name) => {
            const value = readToken(name);
            return (
              <div
                key={name}
                className="border-border bg-bg-elevated flex items-center gap-4 rounded-md border p-3"
              >
                <div
                  className="border-border h-12 w-12 flex-shrink-0 rounded border"
                  style={{ background: `var(${name})` }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-ink font-mono text-xs">{name}</p>
                  <p className="text-ink-muted truncate font-mono text-xs">{value || '—'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-ink-muted mb-4 text-xs tracking-widest uppercase">Typography</h2>
        <div className="space-y-6">
          <div className="border-border border-l-2 pl-4">
            <p className="text-ink-faint mb-2 font-mono text-xs">--font-display</p>
            <p className="text-ink-muted mb-2 font-mono text-xs">{display}</p>
            <p className="display text-4xl">The slow tide of memory</p>
          </div>
          <div className="border-border border-l-2 pl-4">
            <p className="text-ink-faint mb-2 font-mono text-xs">--font-sans</p>
            <p className="text-ink-muted mb-2 font-mono text-xs">{sans}</p>
            <p className="text-base" style={{ fontFamily: sans }}>
              1973 · 110 min · drama, observational, hurts on rewatch — 13:42
            </p>
          </div>
          <div className="border-border border-l-2 pl-4">
            <p className="text-ink-faint mb-2 font-mono text-xs">--font-mono</p>
            <p className="text-ink-muted mb-2 font-mono text-xs">{mono}</p>
            <p className="text-sm" style={{ fontFamily: mono }}>
              {`movie_id: 0x9af3 · runtime_ms: 6_600_000`}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-ink-muted mb-4 text-xs tracking-widest uppercase">Sample surfaces</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="bg-accent text-accent-ink hover:bg-accent-strong rounded-md px-4 py-2 text-sm font-semibold transition-colors">
            Primary
          </button>
          <button className="bg-bg-elevated text-ink border-border hover:bg-border rounded-md border px-4 py-2 text-sm transition-colors">
            Secondary
          </button>
          <span className="bg-accent text-accent-ink rounded-full px-2 py-0.5 text-xs font-semibold">
            For you
          </span>
          <a href="#" className="text-sm">
            Anchor link
          </a>
          <input
            placeholder="Focus me"
            className="bg-bg-elevated text-ink border-border placeholder:text-ink-faint rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </section>
    </div>
  );
};

export default Tokens;
