'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Question } from '@/lib/content/schema';
import * as engine from '@/lib/speech/client';
import { micHelp, requestMic } from '@/lib/speech/mic';
import { RECORDING } from '@/lib/analysis/thresholds';
import { initialSession, sessionReducer } from '@/lib/speech/session';
import { isLikelyPhone } from '@/lib/speech/support';
import { useRecorder } from '@/lib/speech/useRecorder';
import { RecordStep } from './RecordStep';
import { ResultsStep } from './ResultsStep';
import { SetupStep } from './SetupStep';

type Props = {
  question: Question | undefined; // undefined once the deck is used up
  deckDone: boolean;
  onClose: () => void;
  onNewQuestion: () => void;
};

const stageLabel = { transcribing: 'Transcribing', pauses: 'Checking pauses', content: 'Checking content' } as const;

export function AnalysisOverlay({ question, deckDone, onClose, onNewQuestion }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, dispatch] = useReducer(sessionReducer, engine.isLoaded(), initialSession);
  const [cached, setCached] = useState<boolean | null>(null);
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  // The worker transcribes ~25 s chunks while the user is still talking (Stage 0: whole-recording
  // analysis of a 3-minute answer took ~24 s). Stop only waits for the last chunk.
  const session = useRef<engine.AnalysisSession | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Set as soon as a close is committed to (confirm accepted, or none needed), so in-flight
  // effects (count-in tick, recording start, setup's mic prompt) stop acting on stale state.
  const closing = useRef(false);

  const dropSession = () => {
    session.current?.reset();
    session.current = null;
  };

  const finishAnalysis = useCallback(async () => {
    const s = session.current;
    if (!question || !s) return;
    dispatch({ type: 'recording-stopped' });
    try {
      const result = await s.finish(question.tips, (stage) => dispatch({ type: 'stage', stage }));
      dispatch({ type: 'analysed', result });
    } catch (e) {
      if (!(e instanceof engine.Cancelled)) dispatch({ type: 'analysis-failed' });
    } finally {
      if (session.current === s) session.current = null;
    }
  }, [question]);

  const recorder = useRecorder({
    onChunk: (audio, offsetSec) => session.current?.push(audio, offsetSec),
    onStop: () => void finishAnalysis(),
    onLost: () => dispatch({ type: 'mic-lost' }),
  });

  const opened = useRef(false);

  // Open as a modal, and give the browser Back button an entry to close.
  // Guarded because StrictMode runs effects twice in development.
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null;
    const d = dialog.current;
    if (!d?.open) d?.showModal();
    if (!opened.current) {
      opened.current = true;
      history.pushState({ prepdeckAnalyse: true }, '');
    }
    // Finishes a close already committed to: stop any live recording, drop the session, notify.
    const finalizeClose = () => {
      closing.current = true;
      if (stateRef.current.step === 'analysing') engine.cancel();
      else dropSession();
      recorder.discard();
      onClose();
    };
    const onPop = () => {
      if (closing.current) {
        onClose();
        return;
      }
      const s = stateRef.current.step;
      if ((s === 'count-in' || s === 'recording') && !window.confirm('Discard this recording?')) {
        history.pushState({ prepdeckAnalyse: true }, ''); // declined: restore the entry Back just consumed
        return;
      }
      finalizeClose();
    };
    // Covers the dialog closing some other way (e.g. the browser's own handling of a repeated Esc).
    // Consume the pushed history entry via back() (→ popstate → onPop → onClose) rather than
    // calling onClose() directly, so the entry doesn't linger for a later Back press to trip over.
    const onDialogClose = () => {
      if (closing.current) return;
      closing.current = true;
      if (stateRef.current.step === 'analysing') engine.cancel();
      else dropSession();
      recorder.discard();
      history.back();
    };
    window.addEventListener('popstate', onPop);
    d?.addEventListener('close', onDialogClose);
    void engine.modelsCached().then(setCached);
    void engine.hasWebGPU().then(setWebgpu);
    return () => {
      window.removeEventListener('popstate', onPop);
      d?.removeEventListener('close', onDialogClose);
      // The dialog unmounts without close(), so restore focus ourselves. The original target
      // (e.g. the card's Analyse button) may itself have unmounted (new question / deck reset).
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      } else {
        const fallback =
          document.querySelector<HTMLElement>('[data-analyse-button]') ?? document.querySelector<HTMLElement>('[data-deck-primary]');
        fallback?.focus();
      }
    };
    // recorder.discard is stable (useCallback with no changing deps); omitted so this effect
    // doesn't re-run (and re-focus) on every render while elapsed/levels update during recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closing.current) return; // a close is already underway (e.g. a second Esc/✕ press)
    const s = stateRef.current.step;
    if ((s === 'count-in' || s === 'recording') && !window.confirm('Discard this recording?')) return;
    closing.current = true;
    if (stateRef.current.step === 'analysing') engine.cancel();
    else dropSession();
    recorder.discard();
    history.back(); // fires popstate → onClose
  }, [recorder]);

  const beginSetup = useCallback(async () => {
    if (!(await engine.hasRoomForModels())) return dispatch({ type: 'setup-failed', error: 'storage-full' });
    setStartedAt(performance.now());
    try {
      await engine.loadModels((loaded, total) => dispatch({ type: 'download-progress', loaded, total }));
    } catch (e) {
      if (!(e instanceof engine.Cancelled)) dispatch({ type: 'setup-failed', error: 'load-failed' });
      return;
    }
    if (closing.current) return; // overlay closed while the model was downloading
    const mic = await requestMic();
    if (closing.current) return; // overlay closed while the mic prompt was up
    if (mic !== 'ok') return dispatch({ type: 'setup-failed', error: mic });
    dispatch({ type: 'ready' });
  }, []);

  // Returning visitors skip the consent screen: load straight from the cache.
  useEffect(() => {
    if (cached && state.step === 'setup' && !state.progress && !state.error) void beginSetup();
  }, [cached, state, beginSetup]);

  // Count-in ticks, then recording starts.
  useEffect(() => {
    if (state.step !== 'count-in' || closing.current) return;
    setAnnounce(String(state.remaining));
    const t = setTimeout(() => {
      if (!closing.current) dispatch({ type: 'tick' });
    }, 1000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state.step === 'recording' && !recorder.active && !closing.current) {
      setAnnounce('Recording started');
      session.current = engine.startSession();
      recorder.start().catch(() => {
        dropSession();
        if (!closing.current) dispatch({ type: 'mic-failed' });
      });
    }
    if (state.step === 'analysing') setAnnounce(stageLabel[state.stage]);
    if (state.step === 'results') setAnnounce('Results ready');
    // recorder.start is stable; recorder.active is read once per step change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.step === 'analysing' ? state.stage : null]);

  // Announce time left at 1:00 and 0:10.
  const left = Math.ceil(RECORDING.maxSec - recorder.elapsed);
  useEffect(() => {
    if (state.step === 'recording' && (left === 60 || left === 10)) setAnnounce(left === 60 ? '1 minute left' : '10 seconds left');
  }, [left, state.step]);

  // New question (or the deck running out): start over on the new card.
  const questionId = question?.id;
  useEffect(() => {
    recorder.discard();
    dropSession();
    dispatch({ type: 'try-again', loaded: engine.isLoaded() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const tryAgain = () => {
    recorder.discard();
    dropSession();
    dispatch({ type: 'try-again', loaded: engine.isLoaded() });
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Analyse my answer"
      onCancel={(e) => {
        e.preventDefault(); // Esc: confirm first when recording
        requestClose();
      }}
      onKeyDown={(e) => {
        if (e.code === 'Space' && state.step === 'recording') {
          e.preventDefault();
          recorder.stop();
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-paper p-0 backdrop:bg-ink/60"
    >
      <div className="mx-auto flex min-h-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-balance sm:text-2xl">{question?.text ?? 'That’s the whole deck'}</h2>
          <button type="button" onClick={requestClose} className="shrink-0 rounded-full border-2 border-ink bg-white px-4 py-2 font-bold" aria-label="Close">
            ✕ Close
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          {!question ? (
            <div className="text-center">
              <p className="text-ink-soft">You’ve seen every question. Shuffle again for a fresh order.</p>
              <button type="button" onClick={requestClose} className="mt-6 rounded-full border-2 border-ink bg-white px-6 py-3 font-bold">
                Back to deck
              </button>
            </div>
          ) : state.step === 'setup' ? (
            <SetupStep
              state={state}
              cached={cached}
              webgpu={webgpu}
              phone={isLikelyPhone()}
              startedAt={startedAt}
              onBegin={beginSetup}
              onCancel={() => {
                engine.cancel();
                dispatch({ type: 'retry-setup' });
                setCached(false);
              }}
              onRetry={() => dispatch({ type: 'retry-setup' })}
            />
          ) : state.step === 'ready' || state.step === 'count-in' || state.step === 'recording' ? (
            <RecordStep
              step={state.step}
              remaining={state.step === 'count-in' ? state.remaining : 0}
              elapsed={recorder.elapsed}
              levels={recorder.levels}
              flat={recorder.flat}
              onStart={() => dispatch({ type: 'start' })}
              onStop={recorder.stop}
            />
          ) : state.step === 'interrupted' ? (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">Your microphone disconnected.</p>
              <div className="mt-6 flex justify-center gap-3">
                <button type="button" onClick={() => void finishAnalysis()} className="card-surface rounded-full! bg-[var(--industry)] px-6 py-3 font-bold text-white">
                  Analyse what we have
                </button>
                <button type="button" onClick={tryAgain} className="rounded-full border-2 border-ink bg-white px-6 py-3 font-bold">
                  Discard
                </button>
              </div>
            </div>
          ) : state.step === 'analysing' ? (
            <div className="text-center">
              <p className="font-display text-3xl font-extrabold">Listening back…</p>
              <ol className="mt-4 flex justify-center gap-3 text-sm font-bold">
                {(['transcribing', 'pauses', 'content'] as const).map((s) => (
                  <li key={s} aria-current={s === state.stage ? 'step' : undefined} className={s === state.stage ? 'text-ink' : 'text-ink-soft/50'}>
                    {stageLabel[s]}
                  </li>
                ))}
              </ol>
            </div>
          ) : state.step === 'failed' ? (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">
                {state.reason === 'mic' ? 'Microphone access is blocked.' : 'Analysis failed. Try again'}
              </p>
              {state.reason === 'mic' && <p className="mt-3 text-ink-soft">{micHelp()}</p>}
              <button type="button" onClick={tryAgain} className="card-surface mt-6 rounded-full! bg-[var(--industry)] px-6 py-3 font-bold text-white">
                Try again
              </button>
            </div>
          ) : (
            <ResultsStep
              result={state.result}
              question={question}
              audioUrl={recorder.recording?.url ?? null}
              deckDone={deckDone}
              onTryAgain={tryAgain}
              onNewQuestion={onNewQuestion}
              onBack={requestClose}
            />
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </dialog>
  );
}
