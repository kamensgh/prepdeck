'use client';

import { motion } from 'motion/react';
import type { Question } from '@/lib/content/schema';

const rows = [
  { key: 'asking', title: 'What they’re really asking', accent: 'var(--color-sky)' },
  { key: 'hit', title: 'A strong answer covers', accent: 'var(--color-emerald)' },
  { key: 'avoid', title: 'Avoid', accent: 'var(--color-coral)' },
] as const;

export function TipsPanel({ question }: { question: Question }) {
  return (
    <motion.section
      aria-label="Tips for this question"
      className="card-surface mx-auto mt-8 max-w-xl bg-white p-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <ul className="space-y-5">
        {rows.map((row, i) => (
          <motion.li
            key={row.key}
            className="border-l-[5px] pl-4"
            style={{ borderColor: row.accent }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * (i + 1) }}
          >
            <h3 className="font-display text-base font-bold">{row.title}</h3>
            <p className="mt-1 leading-relaxed text-ink-soft">{question.tips[row.key]}</p>
          </motion.li>
        ))}
      </ul>
      {question.tips.exampleOutline && question.tips.exampleOutline.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-base font-bold">Example outline</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
            {question.tips.exampleOutline.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </motion.section>
  );
}
