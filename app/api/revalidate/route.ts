import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parseBody } from 'next-sanity/webhook';
import { CONTENT_TAG } from '@/lib/content/source';

/**
 * Called by a Sanity webhook whenever a question, industry, role family or specialisation
 * is published. Refreshes the cached question bank so edits reach the app within seconds.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Revalidation secret is not configured' }, { status: 500 });
  }

  // `true` waits for Sanity's eventual consistency so the refetch sees the new version.
  const { isValidSignature, body } = await parseBody<{ _type?: string }>(req, secret, true);
  if (!isValidSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  revalidateTag(CONTENT_TAG, 'max');
  return NextResponse.json({ revalidated: true, type: body?._type ?? null, now: Date.now() });
}
