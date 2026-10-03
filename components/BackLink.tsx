import Link from 'next/link';

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
