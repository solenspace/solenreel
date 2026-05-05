// @ts-check
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

const cssPath = resolve(cwd(), 'src/main.css');
const css = readFileSync(cssPath, 'utf8');
const root = postcss.parse(css);

const DARK_TOKENS = /** @type {const} */ ({
  '--color-bg': '#0a090c',
  '--color-bg-elevated': '#14121a',
  '--color-bg-overlay': '#08070bcc',
  '--color-ink': '#ece8f0',
  '--color-ink-muted': '#a89fb3',
  '--color-ink-faint': '#6b6377',
  '--color-border': '#27232e',
  '--color-border-subtle': '#1a161f',
  '--color-accent': '#b69ad8',
  '--color-accent-strong': '#9b7bc9',
  '--color-accent-ink': '#15101e',
  '--color-success': '#7ea96b',
  '--color-danger': '#c64a3a',
});

const LIGHT_OVERRIDES = /** @type {const} */ ({
  '--color-bg': '#faf8fb',
  '--color-bg-elevated': '#f1eef5',
  '--color-ink': '#1a1620',
  '--color-ink-muted': '#5a5363',
  '--color-ink-faint': '#8e8898',
  '--color-border': '#d8d1de',
  '--color-accent': '#6b4ba0',
  '--color-accent-strong': '#553a82',
  '--color-accent-ink': '#fafafa',
});

const FONT_TOKENS = /** @type {const} */ ({
  '--font-display': /Newsreader/,
  '--font-sans': /Inter/,
  '--font-mono': /JetBrains Mono/,
});

/** @returns {Record<string, string>} */
const collectThemeDecls = () => {
  /** @type {Record<string, string>} */
  const decls = {};
  root.walkAtRules('theme', (rule) => {
    rule.walkDecls((decl) => {
      decls[decl.prop] = decl.value;
    });
  });
  return decls;
};

/** @returns {Record<string, string>} */
const collectLightDecls = () => {
  /** @type {Record<string, string>} */
  const decls = {};
  root.walkRules((rule) => {
    if (rule.selector !== "[data-theme='light']" && rule.selector !== '[data-theme="light"]') {
      return;
    }
    rule.walkDecls((decl) => {
      decls[decl.prop] = decl.value;
    });
  });
  return decls;
};

/**
 * Convert a hex color (#rgb / #rrggbb / #rrggbbaa) to {r,g,b} in [0,255].
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  /** @param {string} s */
  const expand = (s) =>
    s.length === 3
      ? s
          .split('')
          .map((/** @type {string} */ c) => c + c)
          .join('')
      : s;
  const full = expand(h.length === 4 ? h.slice(0, 3) : h.slice(0, 6));
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

/** @param {number} c */
const channelLuminance = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** @param {string} hex */
const relativeLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
};

/** @param {string} a @param {string} b */
const contrastRatio = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

describe('@theme block (dark default)', () => {
  const decls = collectThemeDecls();

  for (const [name, expected] of Object.entries(DARK_TOKENS)) {
    it(`${name} = ${expected}`, () => {
      expect(decls[name]).toBe(expected);
    });
  }

  for (const [name, pattern] of Object.entries(FONT_TOKENS)) {
    it(`${name} declares ${pattern}`, () => {
      expect(decls[name]).toMatch(pattern);
    });
  }
});

describe('[data-theme="light"] overrides', () => {
  const decls = collectLightDecls();

  for (const [name, expected] of Object.entries(LIGHT_OVERRIDES)) {
    it(`${name} = ${expected}`, () => {
      expect(decls[name]).toBe(expected);
    });
  }
});

describe('WCAG AA contrast', () => {
  /** @type {Array<[string, string, string]>} */
  const darkPairs = [
    ['ink on bg', DARK_TOKENS['--color-ink'], DARK_TOKENS['--color-bg']],
    ['ink-muted on bg', DARK_TOKENS['--color-ink-muted'], DARK_TOKENS['--color-bg']],
    ['accent on bg', DARK_TOKENS['--color-accent'], DARK_TOKENS['--color-bg']],
    ['accent-ink on accent', DARK_TOKENS['--color-accent-ink'], DARK_TOKENS['--color-accent']],
  ];

  for (const [label, fg, bg] of darkPairs) {
    it(`dark: ${label} ≥ 4.5:1`, () => {
      const ratio = contrastRatio(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  /** @type {Array<[string, string, string]>} */
  const lightPairs = [
    ['ink on bg', LIGHT_OVERRIDES['--color-ink'], LIGHT_OVERRIDES['--color-bg']],
    ['ink-muted on bg', LIGHT_OVERRIDES['--color-ink-muted'], LIGHT_OVERRIDES['--color-bg']],
    ['accent on bg', LIGHT_OVERRIDES['--color-accent'], LIGHT_OVERRIDES['--color-bg']],
    [
      'accent-ink on accent',
      LIGHT_OVERRIDES['--color-accent-ink'],
      LIGHT_OVERRIDES['--color-accent'],
    ],
  ];

  for (const [label, fg, bg] of lightPairs) {
    it(`light: ${label} ≥ 4.5:1`, () => {
      const ratio = contrastRatio(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
});
