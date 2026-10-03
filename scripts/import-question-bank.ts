/**
 * Converts the question bank doc (exported as Markdown) into Sanity NDJSON.
 *
 *   npm run import:bank -- path/to/question-bank.md
 *   cd studio && npm run import
 *
 * Taxonomy comes from lib/content/seed.ts; question scope is derived from the ID prefix.
 * Document IDs are deterministic, so re-importing updates questions instead of duplicating them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { seedContent } from '../lib/content/seed.ts';

type Scope = { industry?: string; roleFamily?: string; specialisation?: string; stack?: string };

const FRONTEND: Scope = { industry: 'technology', roleFamily: 'software-engineering', specialisation: 'frontend' };
const MNA: Scope = { industry: 'm-and-a', roleFamily: 'm-and-a' };

const scopeByPrefix: Record<string, { scope: Scope; version?: string }> = {
  U: { scope: {} },
  FE: { scope: FRONTEND },
  SD: { scope: FRONTEND },
  RE: { scope: { ...FRONTEND, stack: 'react' }, version: 'react@19' },
  NX: { scope: { ...FRONTEND, stack: 'nextjs' } },
  MA: { scope: MNA },
  AC: { scope: MNA },
  VA: { scope: MNA },
  DP: { scope: MNA },
  SM: { scope: MNA },
};

const typeByLabel: Record<string, string> = {
  behavioural: 'behavioural',
  situational: 'situational',
  technical: 'technical',
  'role-specific': 'role-specific',
  'culture fit': 'culture-fit',
  curveball: 'curveball',
};

const statusByLabel: Record<string, string> = {
  'to review': 'to-review',
  approved: 'approved',
  'needs edit': 'needs-edit',
  drop: 'drop',
};

const ref = (prefix: string, id: string) => ({ _type: 'reference', _ref: `${prefix}-${id}` });

export function parseTips(cell: string) {
  const grab = (label: string, next?: string) => {
    const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)${next ? `\\s*${next}:` : '$'}`, 'i');
    return cell.match(pattern)?.[1].trim() ?? '';
  };
  return { asking: grab('Asking', 'Hit'), hit: grab('Hit', 'Avoid'), avoid: grab('Avoid') };
}

/** Reads every 6-column table row whose first cell looks like a question ID (e.g. FE-01). */
export function parseBank(markdown: string) {
  const docs: Record<string, unknown>[] = [];
  const problems: string[] = [];

  for (const line of markdown.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().replace(/\\\|/g, '|'));
    const [code, text, typeLabel, levelLabel, tipsCell, reviewLabel = ''] = cells;
    const match = code?.match(/^([A-Z]+)-\d+$/);
    if (!match) continue;

    const prefix = scopeByPrefix[match[1]];
    const type = typeByLabel[typeLabel.toLowerCase()];
    const level = levelLabel.toLowerCase();
    const tips = parseTips(tipsCell ?? '');
    if (!prefix) problems.push(`${code}: unknown ID prefix`);
    if (!type) problems.push(`${code}: unknown type "${typeLabel}"`);
    if (!['all', 'entry', 'mid', 'senior'].includes(level)) problems.push(`${code}: unknown level "${levelLabel}"`);
    if (!tips.asking || !tips.hit || !tips.avoid) problems.push(`${code}: tips missing Asking/Hit/Avoid`);
    if (!prefix || !type) continue;

    const { scope, version } = prefix;
    docs.push({
      _id: `question-${code}`,
      _type: 'question',
      code,
      text,
      type,
      level,
      scope: {
        ...(scope.industry && { industry: ref('industry', scope.industry) }),
        ...(scope.roleFamily && { roleFamily: ref('roleFamily', scope.roleFamily) }),
        ...(scope.specialisation && { specialisation: ref('specialisation', scope.specialisation) }),
        ...(scope.stack && { stack: scope.stack }),
      },
      tips,
      status: statusByLabel[reviewLabel.toLowerCase()] ?? 'to-review',
      ...(version && { version }),
    });
  }
  return { docs, problems };
}

export function taxonomyDocs() {
  return [
    ...seedContent.industries.map((i, order) => ({
      _id: `industry-${i.id}`,
      _type: 'industry',
      name: i.name,
      slug: { _type: 'slug', current: i.id },
      color: i.color,
      blurb: i.blurb,
      order,
    })),
    ...seedContent.roleFamilies.map((r) => ({
      _id: `roleFamily-${r.id}`,
      _type: 'roleFamily',
      name: r.name,
      slug: { _type: 'slug', current: r.id },
      industry: ref('industry', r.industryId),
    })),
    ...seedContent.specialisations.map((s) => ({
      _id: `specialisation-${s.id}`,
      _type: 'specialisation',
      name: s.name,
      slug: { _type: 'slug', current: s.id },
      roleFamily: ref('roleFamily', s.roleFamilyId),
      stacks: s.stacks.map((st) => ({ _key: st.id, ...st })),
    })),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npm run import:bank -- path/to/question-bank.md');
    process.exit(1);
  }
  const { docs, problems } = parseBank(readFileSync(input, 'utf8'));
  const all = [...taxonomyDocs(), ...docs];
  writeFileSync('question-bank.ndjson', all.map((d) => JSON.stringify(d)).join('\n') + '\n');
  const approved = docs.filter((d) => d.status === 'approved').length;
  console.log(`Wrote ${docs.length} questions (${approved} approved) + ${all.length - docs.length} taxonomy docs to question-bank.ndjson`);
  if (problems.length) {
    console.warn(`\n${problems.length} rows need attention:\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  }
}
