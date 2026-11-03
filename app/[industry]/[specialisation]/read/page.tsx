import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/content/source';
import { passagesForRole } from '@/lib/read';
import { BackLink } from '@/components/BackLink';
import { RoleNav } from '@/components/RoleNav';
import { ReadAloud } from '@/components/read/ReadAloud';

type Params = Promise<{ industry: string; specialisation: string }>;

async function loadRole(params: Params) {
  const { industry: industryId, specialisation: specialisationId } = await params;
  const content = await getContent();
  const industry = content.industries.find((i) => i.id === industryId);
  const specialisation = content.specialisations.find((s) => s.id === specialisationId);
  const family = content.roleFamilies.find((r) => r.id === specialisation?.roleFamilyId);
  if (!industry || !specialisation || !family || family.industryId !== industry.id) notFound();
  return { content, industry, specialisation, family };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { specialisation } = await loadRole(params);
  return { title: `Read aloud: ${specialisation.name} | Prepdeck` };
}

export default async function ReadAloudPage({ params }: { params: Params }) {
  const { content, industry, specialisation, family } = await loadRole(params);

  const passages = passagesForRole(content.passages, {
    industryId: industry.id,
    roleFamilyId: family.id,
    specialisationId: specialisation.id,
    stacks: specialisation.stacks.map((s) => s.id),
  });

  // Question text for the "Answering:" line on model answers.
  const questionText = Object.fromEntries(
    passages
      .map((p) => [p.questionId, content.questions.find((q) => q.id === p.questionId)?.text] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );

  return (
    <main style={{ '--industry': industry.color } as React.CSSProperties}>
      <BackLink href={`/${industry.id}`}>{industry.name}</BackLink>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{specialisation.name}</h1>
      <RoleNav base={`/${industry.id}/${specialisation.id}`} current="read" />
      <ReadAloud passages={passages} questionText={questionText} />
    </main>
  );
}
