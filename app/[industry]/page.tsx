import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/content/source';
import { BackLink } from '@/components/BackLink';

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: industryId } = await params;
  const content = await getContent();
  const industry = content.industries.find((i) => i.id === industryId);
  if (!industry) notFound();

  const families = content.roleFamilies.filter((r) => r.industryId === industry.id);

  return (
    <main style={{ '--industry': industry.color } as React.CSSProperties}>
      <BackLink href="/">All industries</BackLink>
      <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight" style={{ color: industry.color }}>
        {industry.name}
      </h1>
      <p className="mt-3 max-w-lg text-lg text-ink-soft">Which role are you interviewing for?</p>

      {families.map((family) => {
        const roles = content.specialisations.filter((s) => s.roleFamilyId === family.id);
        return (
          <section key={family.id} className="mt-10" aria-labelledby={`family-${family.id}`}>
            <h2 id={`family-${family.id}`} className="font-display text-xl font-bold">
              {family.name}
            </h2>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <li key={role.id}>
                  <Link
                    href={`/${industry.id}/${role.id}`}
                    className="card-surface block h-full bg-white p-5 transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[var(--shadow-card-lift)]"
                  >
                    <span className="font-display text-xl font-bold">{role.name}</span>
                    {role.stacks.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-2">
                        {role.stacks.map((stack) => (
                          <span
                            key={stack.id}
                            className="rounded-full px-2.5 py-0.5 text-sm font-semibold text-white"
                            style={{ background: industry.color }}
                          >
                            {stack.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
