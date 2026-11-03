import Link from 'next/link';

/** Switches between the two ways to practise a role. */
export function RoleNav({ base, current }: { base: string; current: 'deck' | 'read' }) {
  const items = [
    { id: 'deck', href: base, label: 'Shuffle the deck' },
    { id: 'read', href: `${base}/read`, label: 'Read aloud' },
  ] as const;

  return (
    <nav aria-label="Practice mode" className="mt-5">
      <ul className="inline-flex gap-1 rounded-full border-2 border-ink bg-white p-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={current === item.id ? 'page' : undefined}
              className={[
                'block rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
                current === item.id ? 'bg-[var(--industry)] text-white' : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
