"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "@/lib/types";
import { getPdf } from "@/lib/pdfStore";
import {
  buildDemoPages,
  chunkPageText,
  msForChunk,
  type ReadingChunk,
} from "@/lib/pdfText";

type Props = {
  book: Book;
  maxWpm: number;
  pagesGoalToday: number;
  guidedToday: number;
  onClose: () => void;
  onSave: (input: {
    guidedPageIndex: number;
    guidedChunkIndex: number;
    pagesCompleted: number;
    minutes: number;
  }) => void;
};

export function GuidedReader({
  book,
  maxWpm,
  pagesGoalToday,
  guidedToday,
  onClose,
  onSave,
}: Props) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(Math.max(0, book.guidedPageIndex));
  const [chunkIndex, setChunkIndex] = useState(Math.max(0, book.guidedChunkIndex));
  const [holding, setHolding] = useState(false);
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [chunkProgress, setChunkProgress] = useState(0);

  const startedAt = useRef<number | null>(null);
  const holdAccMs = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const pageIndexRef = useRef(pageIndex);
  const chunkIndexRef = useRef(chunkIndex);
  const pagesCompletedRef = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);
  useEffect(() => {
    chunkIndexRef.current = chunkIndex;
  }, [chunkIndex]);
  useEffect(() => {
    pagesCompletedRef.current = pagesCompleted;
  }, [pagesCompleted]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (book.pdfId) {
          const stored = await getPdf(book.pdfId);
          if (!stored?.pages?.length) throw new Error("В PDF нет текста");
          if (!cancelled) setPages(stored.pages);
        } else if (!cancelled) {
          setPages(buildDemoPages(book.title, Math.max(book.totalPages, 12)));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Ошибка PDF");
          setPages(buildDemoPages(book.title, Math.max(book.totalPages, 12)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.pdfId, book.title, book.totalPages]);

  const safePageIndex = Math.min(pageIndex, Math.max(0, (pages?.length ?? 1) - 1));
  const chunks: ReadingChunk[] = useMemo(() => {
    if (!pages) return [];
    return chunkPageText(pages[safePageIndex] ?? "");
  }, [pages, safePageIndex]);
  const safeChunkIndex = Math.min(chunkIndex, Math.max(0, chunks.length - 1));
  const current = chunks[safeChunkIndex];
  const neededMs = current ? msForChunk(current.wordCount, maxWpm) : 1000;

  const finishAndClose = useCallback(() => {
    const start = startedAt.current ?? Date.now();
    const minutes = Math.max(1, Math.round((Date.now() - start) / 60_000));
    onSave({
      guidedPageIndex: pageIndexRef.current,
      guidedChunkIndex: chunkIndexRef.current,
      pagesCompleted: pagesCompletedRef.current,
      minutes,
    });
    onClose();
  }, [onClose, onSave]);

  const advance = useCallback(() => {
    if (!pages) return;
    const p = pageIndexRef.current;
    const c = chunkIndexRef.current;
    const pageChunks = chunkPageText(pages[p] ?? "");

    if (c + 1 < pageChunks.length) {
      setChunkIndex(c + 1);
      holdAccMs.current = 0;
      setChunkProgress(0);
      return;
    }

    const next = pagesCompletedRef.current + 1;
    setPagesCompleted(next);
    pagesCompletedRef.current = next;

    if (p + 1 < pages.length) {
      setPageIndex(p + 1);
      setChunkIndex(0);
    } else {
      setChunkIndex(Math.max(0, pageChunks.length - 1));
    }
    holdAccMs.current = 0;
    setChunkProgress(0);
  }, [pages]);

  useEffect(() => {
    if (!holding) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTs.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      holdAccMs.current += ts - lastTs.current;
      lastTs.current = ts;
      setChunkProgress(Math.min(1, holdAccMs.current / neededMs));
      if (holdAccMs.current >= neededMs) advance();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTs.current = null;
    };
  }, [holding, neededMs, advance]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) setHolding(true);
      }
      if (e.key === "Escape") finishAndClose();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setHolding(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [finishAndClose]);

  const todayAfter = guidedToday + pagesCompleted;
  const goalMet = todayAfter >= pagesGoalToday;

  if (!pages) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#101820]/95 text-white">
        <p className="text-lg">Готовим текст… Можно выдохнуть.</p>
      </div>
    );
  }

  const ahead = chunks.slice(Math.max(0, safeChunkIndex - 2), safeChunkIndex);
  const behind = chunks.slice(safeChunkIndex + 1, safeChunkIndex + 4);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f171e] text-[#e8eef3]">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7db7a8]">
            Курсорное чтение · нельзя перескочить
          </p>
          <h2 className="truncate font-serif text-xl text-white sm:text-2xl">{book.title}</h2>
        </div>
        <button
          type="button"
          onClick={finishAndClose}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Сохранить и выйти
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-sm text-white/70 sm:px-6">
        <span>
          Стр. {safePageIndex + 1}/{pages.length}
        </span>
        <span>
          Сегодня +{pagesCompleted} (итого {todayAfter}/{pagesGoalToday})
        </span>
        {goalMet ? (
          <span className="rounded-full bg-[#2f7d4a]/30 px-3 py-1 text-[#9ddeb0]">
            Норма по книге на сегодня закрыта
          </span>
        ) : null}
        {loadError ? <span className="text-amber-200/90">Демо: {loadError}</span> : null}
      </div>

      <div
        className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6"
        onWheel={(e) => e.preventDefault()}
      >
        <div className="space-y-3 text-lg leading-relaxed text-white/35 sm:text-xl">
          {ahead.map((c) => (
            <p key={c.id} className="select-none">
              {c.text}
            </p>
          ))}
        </div>

        <div className="relative my-5 rounded-3xl border border-[#3d8f7f]/50 bg-[#1a2a32] p-5">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-3xl bg-[#1f6f63]/25 transition-[width] duration-75"
            style={{ width: `${chunkProgress * 100}%` }}
          />
          <p className="relative font-serif text-2xl leading-snug text-white sm:text-3xl">
            {current?.text}
          </p>
          <p className="relative mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7db7a8]">
            Курсор здесь · {holding ? "читает…" : "зажми кнопку"}
          </p>
        </div>

        <div className="space-y-3 text-lg leading-relaxed text-white/25 sm:text-xl">
          {behind.map((c) => (
            <p key={c.id} className="select-none blur-[1px]">
              {c.text}
            </p>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 sm:px-6">
        <p className="mb-3 text-center text-sm text-white/55">
          Зажми пробел или кнопку — курсор едет. Отпустил — стоп. Так нельзя просто
          пролистать под музыку.
        </p>
        <button
          type="button"
          className={`mx-auto flex h-20 w-full max-w-md items-center justify-center rounded-[28px] text-lg font-semibold transition ${
            holding ? "scale-[0.98] bg-[#1f6f63] text-white" : "bg-white text-[#102018]"
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            setHolding(true);
          }}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
        >
          {holding ? "Читаю…" : "Зажми и читай"}
        </button>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70"
            onClick={() => {
              if (safeChunkIndex > 0) {
                setChunkIndex(safeChunkIndex - 1);
                holdAccMs.current = 0;
                setChunkProgress(0);
              }
            }}
          >
            ← На фразу назад
          </button>
        </div>
      </div>
    </div>
  );
}
