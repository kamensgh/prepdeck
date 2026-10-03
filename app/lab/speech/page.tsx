import { notFound } from 'next/navigation';
import { LabClient } from './LabClient';

/** Stage 0 measurement bench. Never available in production. */
export default function SpeechLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main>
      <h1 className="font-display text-3xl font-extrabold">Speech lab</h1>
      <LabClient />
    </main>
  );
}
