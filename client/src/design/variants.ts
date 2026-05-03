import { cva, type VariantProps } from 'class-variance-authority';

export const heroCard = cva(
  'overflow-hidden border-0 text-slate-50 shadow-2xl shadow-slate-900/20',
  {
    variants: {
      accent: {
        blue:    'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.32),_transparent_36%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#111827)]',
        sky:     'bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.25),_transparent_36%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#111827)]',
        emerald: 'bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_36%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#111827)]',
        violet:  'bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.22),_transparent_36%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#111827)]',
        amber:   'bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.25),_transparent_36%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#111827)]',
      },
    },
    defaultVariants: {
      accent: 'blue',
    },
  },
);

export const glassTile = cva(
  'border border-white/10 bg-white/5 backdrop-blur',
  {
    variants: {
      size: {
        sm: 'rounded-3xl p-4',
        // 32px deviates from Tailwind's rounded-3xl (24px) to match the design spec
        lg: 'rounded-[32px] p-5',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
);

export const sectionCard = cva(
  'overflow-hidden border-slate-200/80 bg-white/90 shadow-sm transition duration-200',
  {
    variants: {
      radius: {
        md: 'rounded-[24px]',
        lg: 'rounded-[28px]',
      },
      hover: {
        true:  'hover:-translate-y-0.5 hover:shadow-lg',
        false: '',
      },
    },
    defaultVariants: {
      radius: 'md',
      // String 'true' because CVA boolean variants use string keys, not JS booleans
      hover: 'true',
    },
  },
);

export const sectionCardHeader = cva(
  'border-b border-slate-100 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(241,245,249,0.82))]',
);

export const labelBadge = cva(
  'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em]',
  {
    variants: {
      tone: {
        light: 'text-sky-100/80',
        muted: 'text-slate-400',
      },
    },
    defaultVariants: {
      tone: 'light',
    },
  },
);

export const statusBadge = cva(
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
  {
    variants: {
      status: {
        gain:    'bg-emerald-500/15 text-emerald-200',
        loss:    'bg-rose-500/15 text-rose-200',
        neutral: 'bg-slate-500/15 text-slate-300',
      },
    },
    defaultVariants: {
      status: 'neutral',
    },
  },
);

export type HeroCardVariants  = VariantProps<typeof heroCard>;
export type GlassTileVariants = VariantProps<typeof glassTile>;
export type SectionCardVariants = VariantProps<typeof sectionCard>;
export type LabelBadgeVariants  = VariantProps<typeof labelBadge>;
export type StatusBadgeVariants = VariantProps<typeof statusBadge>;
