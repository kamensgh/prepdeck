import 'server-only';
import { createClient } from 'next-sanity';
import { ContentSchema, type Content } from './schema.ts';
import { seedContent } from './seed.ts';

export const CONTENT_TAG = 'questions';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2026-10-01',
      useCdn: false, // freshness comes from tag revalidation, not the CDN
      token: process.env.SANITY_API_READ_TOKEN,
      perspective: 'published',
    })
  : null;

// Only approved questions reach the app; the Review status is the publishing gate.
const CONTENT_QUERY = /* groq */ `{
  "industries": *[_type == "industry"] | order(order asc) {
    "id": slug.current, name, color, blurb
  },
  "roleFamilies": *[_type == "roleFamily"] {
    "id": slug.current, "industryId": industry->slug.current, name
  },
  "specialisations": *[_type == "specialisation"] | order(name asc) {
    "id": slug.current, "roleFamilyId": roleFamily->slug.current, name,
    "stacks": coalesce(stacks[]{ "id": id, name }, [])
  },
  "questions": *[_type == "question" && status == "approved"] {
    "id": code, text, type, level,
    "scope": {
      "industryId": scope.industry->slug.current,
      "roleFamilyId": scope.roleFamily->slug.current,
      "specialisationId": scope.specialisation->slug.current,
      "stack": scope.stack
    },
    tips, status, version, lastReviewed
  }
}`;

/** Drops null fields that GROQ returns for unset scope/optional values. */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)]),
    );
  }
  return value;
}

export async function getContent(): Promise<Content> {
  if (!client) return seedContent;

  const raw = await client.fetch(CONTENT_QUERY, {}, { cache: 'force-cache', next: { tags: [CONTENT_TAG] } });
  const parsed = ContentSchema.safeParse(stripNulls(raw));
  if (!parsed.success) {
    // Fail loudly in development; in production keep serving rather than crash the page.
    console.error('Question bank failed validation', parsed.error.issues.slice(0, 5));
    if (process.env.NODE_ENV !== 'production') throw parsed.error;
    return seedContent;
  }
  return parsed.data;
}
