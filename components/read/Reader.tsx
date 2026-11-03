'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { passageKindLabels, type Passage } from '@/lib/content/schema';
import { paragraphs, pickRandom } from '@/lib/read';

const SIZES = ['clamp(1.3rem, 2.4vw, 1.75rem)', 'clamp(1.55rem, 3.2vw, 2.3rem)', 'clamp(1.85rem, 4vw, 2.9rem)'];
const SIZE_KEY = 'prepdeck:read-size';

type Props = {
  passages: Passage[];
  index: number;
  questionText: Record<string, string>;
  onIndex: (index: number) => void;
  onClose: () => void;
};

/** Full-screen view: one passage, large and centred, to read out loud. */
export function Reader({ passages, index, questionText, onIndex, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState(1);
  const [reads, setReads] = useState<Record<string, number>>({}); // this visit only
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const closing = useRef(false);

  const passage = passages[index];
  const question = passage.questionId ? questionText[passage.questionId] : undefined;
  const count = reads[passage.id] ?? 0;

  // Open as a modal (focus trap, Esc, inert page behind), with a history entry so Back closes it.
  // Guarded because StrictMode runs effects twice in development.
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    if (!history.state?.prepdeckRead) history.pushState({ prepdeckRead: true }, '');
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      const saved = raw === null ? NaN : Number(raw);
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) setSize(saved);
    } catch {
      /* storage unavailable: keep the default */
    }

    const onPop = () => {
      closing.current = true;
      if (document.fullscreenElement) void document.exitFullscreen();
      onClose();
    };
    // Esc (or any other native close): consume the history entry, which then closes via onPop.
    const onDialogClose = () => {
      if (closing.current) return;
      closing.current = true;
      history.back();
    };
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener('popstate', onPop);
    d?.addEventListener('close', onDialogClose);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      window.removeEventListener('popstate', onPop);
      d?.removeEventListener('close', onDialogClose);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    history.back(); // fires popstate → onClose
  }, []);

  const go = useCallback(
    (next: number) => {
      onIndex((next + passages.length) % passages.length);
      scroller.current?.scrollTo({ top: 0 });
    },
    [onIndex, passages.length],
  );

  const another = useCallback(() => {
    const pick = pickRandom(passages, passage.id);
    if (pick) go(passages.indexOf(pick));
  }, [passages, passage.id, go]);

  const changeSize = (delta: number) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, size + delta));
    setSize(next);
    try {
      localStorage.setItem(SIZE_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => setCanFullscreen(false));
  };

  // ← and → move between passages, R picks another at random.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key.toLowerCase() === 'r') another();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, another, index]);

  const quietButton =
    'rounded-full border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-ink/5 disabled:opacity-40';

  return (
    <dialog
      ref={dialog}
      aria-labelledby="reader-title"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="grid h-full grid-rows-[auto_1fr_auto] border-t-[6px] border-[var(--industry)]">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="flex min-w-0 items-center gap-3">
            <span
              className={[
                'shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-bold',
                passage.kind === 'model-answer' ? 'bg-sun' : 'bg-sky',
              ].join(' ')}
            >
              {passageKindLabels[passage.kind]}
            </span>
            <span id="reader-title" className="truncate font-display text-lg font-bold">
              {passage.title}
            </span>
            <span className="shrink-0 text-sm font-semibold text-ink-soft">
              {index + 1} of {passages.length}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="Text size">
              <button type="button" className={quietButton} onClick={() => changeSize(-1)} disabled={size === 0} aria-label="Smaller text">
                A−
              </button>
              <button
                type="button"
                className={quietButton}
                onClick={() => changeSize(1)}
                disabled={size === SIZES.length - 1}
                aria-label="Larger text"
              >
                A+
              </button>
            </div>
            {canFullscreen && (
              <button type="button" className={`${quietButton} hidden sm:block`} onClick={toggleFullscreen} aria-pressed={fullscreen}>
                {fullscreen ? 'Exit full screen' : 'Full screen'}
              </button>
            )}
            <button type="button" className={quietButton} onClick={requestClose}>
              Close
            </button>
          </div>
        </header>

        <div ref={scroller} className="overflow-y-auto px-5 sm:px-[4vw]">
          <div className="flex min-h-full items-center justify-center py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={passage.id}
                className="w-full"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -10, transition: { duration: 0.15 } }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {question && (
                  <p className="mb-6 text-lg font-semibold text-ink-soft">
                    <span className="sr-only">Answering: </span>“{question}”
                  </p>
                )}
                <div className="space-y-[0.9em] font-display font-semibold leading-[1.45]" style={{ fontSize: SIZES[size] }}>
                  {paragraphs(passage.text).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-3 border-t-2 border-ink/10 px-4 py-4 sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReads((r) => ({ ...r, [passage.id]: count + 1 }))}
              className="card-surface rounded-full! bg-[var(--industry)] px-5 py-2.5 font-display font-extrabold text-white transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              I read it
            </button>
            <span className="text-sm font-semibold text-ink-soft" aria-live="polite">
              {count === 0 ? 'Read it out loud, then tap' : `Read ${count} ${count === 1 ? 'time' : 'times'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={quietButton} onClick={() => go(index - 1)} disabled={passages.length < 2}>
              Previous
            </button>
            <button type="button" className={quietButton} onClick={another} disabled={passages.length < 2}>
              Pick another
            </button>
            <button type="button" className={quietButton} onClick={() => go(index + 1)} disabled={passages.length < 2}>
              Next
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
