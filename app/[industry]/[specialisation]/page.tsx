import { notFound } from 'next/navigation';
import { getContent } from '@/lib/content/source';
import { BackLink } from '@/components/BackLink';
import { PracticeTable } from '@/components/PracticeTable';

export default async function PracticePage({
  params,
}: {
  params: Promise<{ industry: string; specialisation: string }>;
}) {
  const { industry: industryId, specialisation: specialisationId } = await params;
  const content = await getContent();

  const industry = content.industries.find((i) => i.id === industryId);
  const specialisation = content.specialisations.find((s) => s.id === specialisationId);
  const family = content.roleFamilies.find((r) => r.id === specialisation?.roleFamilyId);
  if (!industry || !specialisation || !family || family.industryId !== industry.id) notFound();

  // Send the client only the questions that could ever appear for this role.
  const questions = content.questions.filter(
    (q) =>
      (!q.scope.industryId || q.scope.industryId === industry.id) &&
      (!q.scope.roleFamilyId || q.scope.roleFamilyId === family.id) &&
      (!q.scope.specialisationId || q.scope.specialisationId === specialisation.id),
  );

  return (
    <main style={{ '--industry': industry.color } as React.CSSProperties}>
      <BackLink href={`/${industry.id}`}>{industry.name}</BackLink>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {specialisation.name}
      </h1>
      <PracticeTable
        industry={industry}
        roleFamilyId={family.id}
        specialisation={specialisation}
        questions={questions}
      />
    </main>
  );
}
