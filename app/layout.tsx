import type { Metadata } from 'next';
// Self-hosted variable fonts from npm: no build-time fetch to Google Fonts.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prepdeck — interview practice, one card at a time',
  description: 'Pick your industry and role, shuffle the deck, and answer the question you are dealt.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8">{children}</div>
      </body>
    </html>
  );
}
