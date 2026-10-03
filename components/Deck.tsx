'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import type { Question } from '@/lib/content/schema';
import { shuffle } from '@/lib/deck';
import { supportsAnalysis } from '@/lib/speech/support';
import { AnalysisOverlay } from './analysis/AnalysisOverlay';
import { QuestionCard } from './QuestionCard';
import { TipsPanel } from './TipsPanel';

export const shuffleStyles = [
  { id: 'riffle', name: 'Riffle', duration: 3000 },
  { id: 'fan', name: 'Fan', duration: 3200 },
  { id: 'instant', name: 'Instant', duration: 250 },
] as const;
type ShuffleStyleId = (typeof shuffleStyles)[number]['id'];

const STYLE_KEY = 'prepdeck:shuffle-style';
const PILE = 5; // card backs drawn in the pile; the real deck can be any size

type Phase = 'idle' | 'shuffling' | 'dealt' | 'done';

/** Keyframes for one card back in the pile, per shuffle style. */
function pileAnimation(style: ShuffleStyleId, i: number): TargetAndTransition {
  const rest = { x: 0, y: -i * 3, rotate: 0 };
  if (style === 'riffle') {
    // Deck splits into two halves that slide out and interleave back together.
    const side = i % 2 === 0 ? -1 : 1;
    return {
      x: [0, side * 120, side * 36, 0],
      y: [rest.y, rest.y - 14, rest.y - 4, rest.y],
      rotate: [0, side * 11, -side * 4, 0],
      transition: { duration: 0.9, repeat: 2, delay: i * 0.05, times: [0, 0.35, 0.7, 1], ease: 'easeInOut' },
    };
  }
  if (style === 'fan') {
    // Cards fan into an arc like "pick a card", then sweep closed.
    const angle = (i - (PILE - 1) / 2) * 15;
    return {
      x: [0, angle * 4, angle * 4, 0],
      y: [rest.y, rest.y - 10, rest.y - 10, rest.y],
      rotate: [0, angle, angle, 0],
      transition: { duration: 1.0, repeat: 2, delay: i * 0.03, times: [0, 0.4, 0.65, 1], ease: 'easeInOut' },
    };
  }
  return { ...rest, opacity: [1, 0.5, 1], transition: { duration: 0.25 } };
}

export function Deck({ deck, industryName }: { deck: Question[]; industryName: string }) {
  const reduceMotion = useReducedMotion();
  const [style, setStyle] = useState<ShuffleStyleId>('riffle');
  const [order, setOrder] = useState<Question[]>([]);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0); // bumps on every shuffle to replay the animation
  const [showTips, setShowTips] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [canAnalyse, setCanAnalyse] = useState(false);
  // Checked after mount so server and client render the same markup.
  useEffect(() => setCanAnalyse(supportsAnalysis()), []);
  const closeAnalysis = useCallback(() => setAnalysing(false), []);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const effectiveStyle: ShuffleStyleId = reduceMotion ? 'instant' : style;
  const current = phase === 'dealt' ? order[pos] : undefined;

  // Remember the chosen style on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (shuffleStyles.some((s) => s.id === saved)) setStyle(saved as ShuffleStyleId);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const chooseStyle = (id: ShuffleStyleId) => {
    setStyle(id);
    try {
      localStorage.setItem(STYLE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  // A new filter selection means a new deck: start over.
  useEffect(() => {
    clearTimeout(timer.current);
    setPhase('idle');
    setOrder([]);
    setPos(0);
    setShowTips(false);
  }, [deck]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const shuffleAndDeal = useCallback(() => {
    if (deck.length === 0) return;
    clearTimeout(timer.current);
    setOrder(shuffle(deck)); // shuffle first so the animation and the result agree
    setPos(0);
    setShowTips(false);
    setRound((r) => r + 1);
    setPhase('shuffling');
    const duration = shuffleStyles.find((s) => s.id === effectiveStyle)!.duration;
    timer.current = setTimeout(() => setPhase('dealt'), duration);
  }, [deck, effectiveStyle]);

  const dealNext = useCallback(() => {
    setShowTips(false);
    if (pos + 1 >= order.length) {
      setPhase('done');
      return;
    }
    setPos((p) => p + 1);
  }, [pos, order.length]);

  const primary =
    phase === 'dealt'
      ? { label: 'Deal another', action: dealNext }
      : phase === 'done'
        ? { label: 'Shuffle again', action: shuffleAndDeal }
        : { label: 'Shuffle and deal', action: shuffleAndDeal };

  // Space deals, T toggles tips — unless the user is typing or focused on a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (analysing) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, select, a')) return;
      if (e.code === 'Space' && phase !== 'shuffling') {
        e.preventDefault();
        primary.action();
      } else if (e.key.toLowerCase() === 't' && phase === 'dealt') {
        setShowTips((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, primary, analysing]);

  const remaining = phase === 'dealt' ? order.length - pos - 1 : deck.length;

  return (
    <section aria-label="Deck" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-ink-soft">
          {deck.length === 0
            ? 'No questions match these settings'
            : `${deck.length} ${deck.length === 1 ? 'question' : 'questions'} in your deck`}
        </p>
        <div className="flex items-center gap-1 rounded-full border-2 border-ink bg-white p-1" role="radiogroup" aria-label="Shuffle style">
          {shuffleStyles.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={style === s.id}
              onClick={() => chooseStyle(s.id)}
              className={[
                'rounded-full px-3 py-1 text-sm font-bold transition-colors',
                style === s.id ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* The table: pile of card backs with the dealt card on top. */}
      <div className="relative mx-auto mt-8 flex justify-center" style={{ perspective: 1200 }}>
        <div className="relative aspect-[3/4] w-[min(86vw,340px)]">
          {deck.length > 0 &&
            Array.from({ length: Math.min(PILE, deck.length) }).map((_, i) => (
              <motion.div
                key={`${round}-${i}`}
                aria-hidden="true"
                className="card-surface card-back absolute inset-0"
                initial={{ x: 0, y: -i * 3, rotate: 0 }}
                animate={phase === 'shuffling' ? pileAnimation(effectiveStyle, i) : { x: 0, y: -i * 3, rotate: 0 }}
                style={{ zIndex: i }}
              />
            ))}

          <AnimatePresence mode="wait">
            {current && (
              <QuestionCard
                key={`${round}-${current.id}`}
                question={current}
                instant={effectiveStyle === 'instant'}
                onToggleTips={() => setShowTips((s) => !s)}
                tipsOpen={showTips}
                onAnalyse={canAnalyse ? () => setAnalysing(true) : undefined}
              />
            )}
          </AnimatePresence>

          {deck.length === 0 && (
            <div className="card-surface absolute inset-0 grid place-items-center bg-white p-8 text-center">
              <p className="text-lg text-ink-soft">
                Nothing to deal yet. Try a different level or turn on more question types.
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="card-surface absolute inset-0 z-20 grid place-items-center bg-sun p-8 text-center">
              <div>
                <p className="font-display text-3xl font-extrabold">That’s the whole deck</p>
                <p className="mt-2 text-ink-soft">
                  You’ve seen all {order.length} questions. Shuffle again for a fresh order.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={primary.action}
          disabled={deck.length === 0 || phase === 'shuffling'}
          className="card-surface rounded-full! bg-[var(--industry)] px-7 py-3 font-display text-lg font-extrabold text-white transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          {phase === 'shuffling' ? 'Shuffling…' : primary.label}
        </button>
        {phase === 'dealt' && (
          <button
            type="button"
            onClick={shuffleAndDeal}
            className="rounded-full border-2 border-ink bg-white px-5 py-2.5 font-bold hover:bg-ink/5"
          >
            Reshuffle
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-sm text-ink-soft">
        {phase === 'dealt' && `${remaining} left in the deck. `}Press Space to deal and T for tips.
      </p>

      <AnimatePresence>{current && showTips && <TipsPanel key={current.id} question={current} />}</AnimatePresence>

      <p className="sr-only" aria-live="polite">
        {current ? `${industryName} question: ${current.text}` : ''}
      </p>

      {analysing && (current || phase === 'done') && (
        <AnalysisOverlay question={current} deckDone={phase === 'done'} onClose={closeAnalysis} onNewQuestion={dealNext} />
      )}
    </section>
  );
}
