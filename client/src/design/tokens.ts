// ─── Screen accent colours ────────────────────────────────────────────────────
// One radial-gradient accent per feature screen, used inside heroCard variants.
export const screenAccents = {
  overview:      'rgba(59,130,246,0.32)',   // blue
  holdings:      'rgba(56,189,248,0.25)',   // sky
  contributions: 'rgba(16,185,129,0.22)',   // emerald
  assets:        'rgba(168,85,247,0.22)',   // violet
  taxPlanning:   'rgba(245,158,11,0.25)',   // amber
} as const;

export type ScreenAccent = keyof typeof screenAccents;

// ─── Hero card accent names (maps to CVA variant keys) ────────────────────────
export type HeroAccent = 'blue' | 'sky' | 'emerald' | 'violet' | 'amber';

// ─── Tax bracket / allocation bar colours ────────────────────────────────────
// Ordered light → dark within each hue family; cycle with index % length.
export const bracketColours = [
  'bg-cyan-500 dark:bg-cyan-600',
  'bg-blue-500 dark:bg-blue-600',
  'bg-violet-500 dark:bg-violet-500',
  'bg-orange-500 dark:bg-orange-500',
  'bg-red-600 dark:bg-red-500',
] as const;

export const bracketColoursDark = [
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-teal-600 dark:bg-teal-500',
  'bg-blue-600 dark:bg-blue-500',
  'bg-indigo-600 dark:bg-indigo-500',
  'bg-violet-600 dark:bg-violet-500',
  'bg-orange-600 dark:bg-orange-500',
  'bg-red-600 dark:bg-red-500',
] as const;

// ─── Semantic status colours (gain / loss / neutral) ─────────────────────────
// Used for gain/loss badges, delta values, etc.
export const statusColours = {
  gain: {
    badge: 'bg-emerald-500/15 text-emerald-200',
    text:  'text-green-600 dark:text-green-400',
  },
  loss: {
    badge: 'bg-rose-500/15 text-rose-200',
    text:  'text-red-600 dark:text-red-400',
  },
  neutral: {
    badge: 'bg-slate-500/15 text-slate-300',
    text:  'text-muted-foreground',
  },
} as const;

export type StatusColour = keyof typeof statusColours;

// ─── Chart palette — primary (hex, for Recharts/SVG) ─────────────────────────
// Matches LINE_COLORS / PIE_COLORS used across insight components.
export const chartPaletteHex = [
  '#2563eb', // blue-600
  '#f97316', // orange-500
  '#22c55e', // green-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
] as const;

// ─── Chart palette — alternate (hex, for stacked bar charts) ─────────────────
// Matches BAR_COLORS used in MonthlyCategorySpendCard.
export const chartPaletteAlt = [
  '#0f766e', // teal-700
  '#f97316', // orange-500
  '#2563eb', // blue-600
  '#e11d48', // rose-600
  '#22c55e', // green-500
  '#facc15', // yellow-400
] as const;

// ─── Chart palette — summary (income / expense / savings) ────────────────────
// Matches the 3 inline fill values in SummaryCard BarChart.
export const chartPaletteSummary = {
  income:   '#22c55e', // green-500
  expense:  '#ef4444', // red-500
  savings:  '#3b82f6', // blue-500
} as const;

// ─── Goal status colour classes (Tailwind) ────────────────────────────────────
export const goalStatusColours: Record<string, string> = {
  'in-progress': 'bg-blue-500 bg-opacity-20 text-blue-400',
  completed:     'bg-green-500 bg-opacity-20 text-green-400',
  pending:       'bg-yellow-500 bg-opacity-20 text-yellow-400',
};

// ─── Entity (goal / account) icon colour classes (Tailwind) ──────────────────
// icon bg + text colour, used with bg-opacity-20 wrapper on account/goal icons.
export const entityColourClasses: Record<string, string> = {
  green:  'bg-green-500 bg-opacity-20 text-green-400',
  blue:   'bg-blue-500 bg-opacity-20 text-blue-400',
  purple: 'bg-purple-500 bg-opacity-20 text-purple-400',
  red:    'bg-red-500 bg-opacity-20 text-red-400',
  yellow: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
  amber:  'bg-amber-500 bg-opacity-20 text-amber-400',
  teal:   'bg-teal-500 bg-opacity-20 text-teal-400',
};

// Goal icon colour classes differ — solid bg without opacity wrapper.
export const goalIconColourClasses: Record<string, string> = {
  blue:   'bg-blue-500 text-blue-400',
  green:  'bg-green-500 text-green-400',
  yellow: 'bg-yellow-500 text-yellow-400',
  purple: 'bg-purple-500 text-purple-400',
  red:    'bg-red-500 text-red-400',
};

// ─── Chat UI colours (hex) ────────────────────────────────────────────────────
export const chatColours = {
  surface:       '#1a1a1a',
  surfaceRaised:  '#2a2a2a',
  border:        '#333333',
  accent:        '#2970ff',
} as const;

// ─── Goal / account colour options (used in forms) ────────────────────────────
export const entityColours = [
  { label: 'Green',  value: 'green',  class: 'bg-green-500'  },
  { label: 'Blue',   value: 'blue',   class: 'bg-blue-500'   },
  { label: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { label: 'Red',    value: 'red',    class: 'bg-red-500'    },
  { label: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
  { label: 'Amber',  value: 'amber',  class: 'bg-amber-500'  },
  { label: 'Teal',   value: 'teal',   class: 'bg-teal-500'   },
] as const;

export type EntityColour = (typeof entityColours)[number]['value'];
