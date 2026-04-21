// constants/Theme.ts — BharatShop OS 2026
// "Industrial-Chic Retail" design system.
// ALL color references in the app must import from here — zero hardcoded hex.
// Rationale: Kirana = dusty hands, bright sunlight, fast glances.
//            High contrast. Large targets. Immediate feedback.

// ── Color tokens ─────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  background:    '#0F0F0F',   // near-black — primary app background
  surface:       '#1A1A1A',   // card backgrounds
  surfaceRaised: '#242424',   // elevated surfaces (modals, dropdowns)
  border:        '#2A2A2A',

  // Semantic — high visibility on dark
  amber:         '#FFBF00',   // PRIMARY CTA, alerts, warnings
  emerald:       '#50C878',   // success, confirmed sales, in-stock
  crimson:       '#DC2626',   // errors, low stock, destructive actions
  cobalt:        '#2563EB',   // info, UPI payment badge

  // Text
  textPrimary:   '#F5F5F5',
  textSecondary: '#A3A3A3',
  textMuted:     '#525252',
  textInverse:   '#0F0F0F',   // text ON amber / emerald buttons

  // Semantic aliases (used by components for intent signalling)
  alert:         '#FFBF00',   // = amber
  success:       '#50C878',   // = emerald
  danger:        '#DC2626',   // = crimson
  info:          '#2563EB',   // = cobalt
} as const;

// ── Touch target sizes (pt) ──────────────────────────────────
// Never go below minimum — WCAG 2.1 AA compliance for accessibility.

export const TouchTargets = {
  minimum:  48,   // WCAG baseline — every tappable element
  standard: 56,   // default buttons
  hero:     72,   // primary scan CTA — cannot be missed
} as const;

// ── Spacing scale (pt) ───────────────────────────────────────
// 4-point grid. Use these everywhere — no arbitrary padding/margin.

export const Spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
} as const;

// ── Border radius ────────────────────────────────────────────

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  pill: 999,
} as const;

// ── Shadow presets (cross-platform) ─────────────────────────

export const Shadows = {
  subtle: {
    shadowColor:   '#000',
    shadowOpacity: 0.18,
    shadowRadius:  4,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     3,
  },
  card: {
    shadowColor:   '#000',
    shadowOpacity: 0.28,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     6,
  },
  glow: (color: string) => ({
    shadowColor:   color,
    shadowOpacity: 0.55,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     10,
  }),
} as const;

// ── Typography scale ─────────────────────────────────────────

export const Typography = {
  hero:     { fontSize: 40, fontWeight: '700', lineHeight: 46 },
  h1:       { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2:       { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3:       { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label:    { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  caption:  { fontSize: 11, fontWeight: '500', lineHeight: 16 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
} as const;
