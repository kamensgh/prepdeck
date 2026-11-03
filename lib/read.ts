import type { Passage } from './content/schema.ts';

export type RoleScope = {
  industryId: string;
  roleFamilyId: string;
  specialisationId: string;
  stacks: string[]; // every stack the role offers
};

/** Same layer rule as the deck: each scope field a passage sets must match the role. */
export function passagesForRole(passages: Passage[], role: RoleScope): Passage[] {
  return passages.filter(({ scope, status }) => {
    if (status !== 'approved') return false;
    if (scope.industryId && scope.industryId !== role.industryId) return false;
    if (scope.roleFamilyId && scope.roleFamilyId !== role.roleFamilyId) return false;
    if (scope.specialisationId && scope.specialisationId !== role.specialisationId) return false;
    if (scope.stack && !role.stacks.includes(scope.stack)) return false;
    return true;
  });
}

/** Random passage, avoiding the one on screen whenever there is another to show. */
export function pickRandom(list: Passage[], currentId: string | undefined, random: () => number = Math.random) {
  const pool = list.length > 1 ? list.filter((p) => p.id !== currentId) : list;
  return pool.length ? pool[Math.floor(random() * pool.length)] : undefined;
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Minutes to read aloud at a calm interview pace (~140 words per minute), at least 1. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 140));
}
