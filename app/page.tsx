import Link from 'next/link';
import { getContent } from '@/lib/content/source';

export default async function Home() {
  const content = await getContent();

  return (
    <main>
      <header className="grid items-center gap-10 pb-14 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-display text-lg font-bold text-violet">Prepdeck</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Shuffle the deck. Answer what you’re dealt.
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            Interview questions picked at random for your role, with notes on what a strong answer
            needs. No cherry-picking the easy ones.
          </p>
        </div>

        {/* Three fanned card backs: the one visual idea the whole app is built on. */}
        <div aria-hidden="true" className="relative mx-auto h-64 w-56 sm:h-72 sm:w-60">
          {[
            { color: 'var(--color-coral)', rotate: -14, x: -38 },
            { color: 'var(--color-emerald)', rotate: 2, x: 0 },
            { color: 'var(--color-violet)', rotate: 16, x: 40 },
          ].map((c, i) => (
            <div
              key={i}
              className="card-surface card-back absolute inset-0"
              style={
                {
                  '--industry': c.color,
                  transform: `translateX(${c.x}px) rotate(${c.rotate}deg)`,
                  transformOrigin: '50% 110%',
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </header>

      <section aria-labelledby="pick-industry">
        <h2 id="pick-industry" className="font-display text-2xl font-bold">
          Pick an industry
        </h2>
        <ul className="mt-5 grid gap-6 sm:grid-cols-2">
          {content.industries.map((industry) => {
            const roles = content.specialisations.filter((s) =>
              content.roleFamilies.some((r) => r.id === s.roleFamilyId && r.industryId === industry.id),
            );
            return (
              <li key={industry.id}>
                <Link
                  href={`/${industry.id}`}
                  className="card-surface group block p-6 text-white transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[var(--shadow-card-lift)]"
                  style={{ background: industry.color }}
                >
                  <span className="font-display text-3xl font-extrabold leading-tight">{industry.name}</span>
                  <span className="mt-2 block max-w-xs text-white/90">{industry.blurb}</span>
                  <span className="mt-6 inline-block rounded-full bg-white px-3 py-1 text-sm font-bold text-ink">
                    {roles.length} {roles.length === 1 ? 'role' : 'roles'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
