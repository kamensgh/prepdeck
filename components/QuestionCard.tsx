'use client';

import { motion } from 'motion/react';
import { seniorityLabels, typeLabels, type Question, type QuestionType } from '@/lib/content/schema';

// Each question type gets its own badge colour so the dealt card reads at a glance.
const typeColours: Record<QuestionType, { bg: string; fg: string }> = {
  behavioural: { bg: 'var(--color-sun)', fg: 'var(--color-ink)' },
  situational: { bg: 'var(--color-sky)', fg: 'var(--color-ink)' },
  technical: { bg: 'var(--color-pink)', fg: 'var(--color-ink)' },
  'role-specific': { bg: 'var(--color-coral)', fg: 'var(--color-ink)' },
  'culture-fit': { bg: 'var(--color-emerald)', fg: 'white' },
  curveball: { bg: 'var(--color-ink)', fg: 'var(--color-sun)' },
};

type Props = {
  question: Question;
  instant: boolean;
  tipsOpen: boolean;
  onToggleTips: () => void;
  onAnalyse?: () => void;
};

export function QuestionCard({ question, instant, tipsOpen, onToggleTips, onAnalyse }: Props) {
  const colour = typeColours[question.type];
  const level = question.level === 'all' ? 'Any level' : `${seniorityLabels[question.level]}+`;

  return (
    <motion.article
      className="card-surface absolute inset-0 z-10 flex flex-col bg-white p-6 sm:p-7"
      style={{ transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}
      // Dealt from the top of the pile, flipping face-up as it lands.
      initial={instant ? { opacity: 0 } : { opacity: 0, rotateY: 100, y: -40, x: 30, scale: 0.94 }}
      animate={{ opacity: 1, rotateY: 0, y: 0, x: 0, scale: 1 }}
      exit={instant ? { opacity: 0 } : { opacity: 0, x: -260, rotate: -14, transition: { duration: 0.28 } }}
      transition={instant ? { duration: 0.2 } : { type: 'spring', stiffness: 170, damping: 19 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full border-2 border-ink px-3 py-0.5 text-sm font-bold"
          style={{ background: colour.bg, color: colour.fg }}
        >
          {typeLabels[question.type]}
        </span>
        <span className="text-sm font-semibold text-ink-soft">{level}</span>
      </div>

      <h2 className="mt-6 flex-1 overflow-y-auto font-display text-[clamp(1.4rem,4.6vw,1.9rem)] font-bold leading-tight text-balance">
        {question.text}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleTips}
          aria-expanded={tipsOpen}
          className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-ink/5"
          style={tipsOpen ? { background: 'var(--industry)', color: 'white' } : undefined}
        >
          {tipsOpen ? 'Hide tips' : 'What makes a great answer?'}
        </button>
        {onAnalyse && (
          <button
            type="button"
            onClick={onAnalyse}
            className="rounded-full border-2 border-ink bg-[var(--industry)] px-4 py-2 text-sm font-bold text-white"
          >
            Analyse my answer
          </button>
        )}
      </div>
    </motion.article>
  );
}
