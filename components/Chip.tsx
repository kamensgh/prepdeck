'use client';

type ChipProps = {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: 'radio';
};

/** Toggle chip. Selected chips fill with the industry colour. */
export function Chip({ pressed, onClick, children, role }: ChipProps) {
  const stateProps = role === 'radio' ? { role, 'aria-checked': pressed } : { 'aria-pressed': pressed };
  return (
    <button
      type="button"
      onClick={onClick}
      {...stateProps}
      className={[
        'rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition-[transform,background-color,color] duration-150 active:translate-y-px',
        pressed ? 'bg-[var(--industry)] text-white shadow-[2px_2px_0_0_var(--color-ink)]' : 'bg-white text-ink hover:bg-ink/5',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
