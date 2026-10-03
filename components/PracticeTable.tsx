'use client';

import { useMemo, useState } from 'react';
import {
  questionTypes,
  seniorities,
  seniorityLabels,
  typeLabels,
  type Industry,
  type Question,
  type QuestionType,
  type Seniority,
  type Specialisation,
} from '@/lib/content/schema';
import { buildDeck, type DeckSelection } from '@/lib/deck';
import { Deck } from './Deck';
import { Chip } from './Chip';

type Props = {
  industry: Industry;
  roleFamilyId: string;
  specialisation: Specialisation;
  questions: Question[];
};

export function PracticeTable({ industry, roleFamilyId, specialisation, questions }: Props) {
  const [stacks, setStacks] = useState<string[]>(specialisation.stacks.map((s) => s.id));
  const [level, setLevel] = useState<Seniority>('mid');
  const [types, setTypes] = useState<QuestionType[]>([]); // empty = mix of every type

  const selection: DeckSelection = {
    industryId: industry.id,
    roleFamilyId,
    specialisationId: specialisation.id,
    stacks,
    level,
    types,
  };

  const deck = useMemo(
    () => buildDeck({ industries: [], roleFamilies: [], specialisations: [], questions }, selection),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, stacks.join(), level, types.join()],
  );

  // Only offer types that actually have questions for this role.
  const availableTypes = questionTypes.filter((t) => questions.some((q) => q.type === t));

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr]">
      <aside aria-label="Deck settings" className="space-y-7">
        {specialisation.stacks.length > 0 && (
          <fieldset>
            <legend className="font-display text-lg font-bold">Stack</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialisation.stacks.map((stack) => (
                <Chip
                  key={stack.id}
                  pressed={stacks.includes(stack.id)}
                  onClick={() => setStacks((s) => toggle(s, stack.id))}
                >
                  {stack.name}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="font-display text-lg font-bold">Level</legend>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
            {seniorities.map((s) => (
              <Chip key={s} role="radio" pressed={level === s} onClick={() => setLevel(s)}>
                {seniorityLabels[s]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg font-bold">Question types</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip pressed={types.length === 0} onClick={() => setTypes([])}>
              Mix
            </Chip>
            {availableTypes.map((t) => (
              <Chip key={t} pressed={types.includes(t)} onClick={() => setTypes((ts) => toggle(ts, t))}>
                {typeLabels[t]}
              </Chip>
            ))}
          </div>
        </fieldset>
      </aside>

      <Deck deck={deck} industryName={industry.name} />
    </div>
  );
}
