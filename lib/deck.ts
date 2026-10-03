import type { Content, Question, Seniority, QuestionType } from './content/schema.ts';

export type DeckSelection = {
  industryId: string;
  roleFamilyId: string;
  specialisationId: string;
  stacks: string[];
  level: Seniority;
  types: QuestionType[]; // empty = all types ("Mix")
};

const levelRank: Record<Seniority, number> = { entry: 0, mid: 1, senior: 2 };

/** A question is in the deck when every scope field it sets matches the selection. */
export function matchesSelection(q: Question, s: DeckSelection): boolean {
  const { scope } = q;
  if (scope.industryId && scope.industryId !== s.industryId) return false;
  if (scope.roleFamilyId && scope.roleFamilyId !== s.roleFamilyId) return false;
  if (scope.specialisationId && scope.specialisationId !== s.specialisationId) return false;
  if (scope.stack && !s.stacks.includes(scope.stack)) return false;
  if (q.level !== 'all' && levelRank[q.level] > levelRank[s.level]) return false;
  if (s.types.length > 0 && !s.types.includes(q.type)) return false;
  return true;
}

export function buildDeck(content: Content, s: DeckSelection): Question[] {
  return content.questions.filter((q) => q.status === 'approved' && matchesSelection(q, s));
}

/** Fisher–Yates. `random` is injectable so tests are deterministic. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
