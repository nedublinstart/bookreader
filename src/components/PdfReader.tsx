"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Book } from "@/lib/types";
import { getPdf } from "@/lib/pdfStore";
import { openPdfFromBlob, renderPdfPage } from "@/lib/pdf";

type Props = {
  book: Book;
  pagesGoalToday: number;
  pagesToday: number;
  onClose: () => void;
  onSave: (input: {
    currentPage: number;
    pagesCompleted: number;
    minutes: number;
  }) => void;
};

export function PdfReader({
  book,
  pagesGoalToday,
  pagesToday,
  onClose,
  onSave,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const startPageRef = useRef(0);
  const renderTokenRef = useRef(0);

  const initialPage = Math.min(
    Math.max(0, book.currentPage),
    Math.max(0, book.totalPages - 1),
  );

  const [pageIndex, setPageIndex] = useState(initialPage);
  const [pageCount, setPageCount] = useState(Math.max(1, book.totalPages));
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpValue, setJumpValue] = useState(String(initialPage + 1));
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [sessionStartPage, setSessionStartPage] = useState(initialPage);

  useEffect(() => {
    startedAtRef.current = Date.now();
    startPageRef.current = initialPage;
  }, [initialPage]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!book.pdfId) {
        setError("У этой книги нет PDF. Добавь файл заново.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const stored = await getPdf(book.pdfId);
        if (!stored?.blob) {
          throw new Error(
            "PDF не найден в браузере. Добавь файл ещё раз через «Добавить книгу».",
          );
        }

        const { pdf, objectUrl } = await openPdfFromBlob(stored.blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          await pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        objectUrlRef.current = objectUrl;
        setPageCount(pdf.numPages);
        const start = Math.min(
          Math.max(0, book.currentPage),
          Math.max(0, pdf.numPages - 1),
        );
        setPageIndex(start);
        setJumpValue(String(start + 1));
        startPageRef.current = start;
        setSessionStartPage(start);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось открыть PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      const pdf = pdfRef.current;
      pdfRef.current = null;
      if (pdf) void pdf.destroy();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [book.pdfId, book.currentPage]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || loading) return;

    const token = ++renderTokenRef.current;
    let cancelled = false;

    (async () => {
      try {
        setRendering(true);
        await renderPdfPage(pdf, pageIndex + 1, canvas, scale);
        if (!cancelled && token === renderTokenRef.current) {
          setJumpValue(String(pageIndex + 1));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка отрисовки страницы");
        }
      } finally {
        if (!cancelled && token === renderTokenRef.current) {
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageIndex, scale, loading]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), Math.max(0, pageCount - 1));
      setPageIndex((prev) => {
        if (clamped > prev) {
          setPagesCompleted((count) => count + (clamped - prev));
        }
        return clamped;
      });
    },
    [pageCount],
  );

  const finishAndClose = useCallback(() => {
    const started = startedAtRef.current ?? Date.now();
    const minutes = Math.max(1, Math.round((Date.now() - started) / 60_000));
    const advanced = Math.max(0, pageIndex - startPageRef.current);
    onSave({
      currentPage: pageIndex,
      pagesCompleted: Math.max(pagesCompleted, advanced),
      minutes,
    });
    onClose();
  }, [onClose, onSave, pageIndex, pagesCompleted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(pageIndex + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(pageIndex - 1);
      }
      if (e.key === "Escape") finishAndClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishAndClose, goTo, pageIndex]);

  const todayAfter = pagesToday + Math.max(0, pageIndex - sessionStartPage);
  const goalMet = todayAfter >= pagesGoalToday;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121820] text-[#e8eef3]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7db7a8]">
            PDF-ридер
          </p>
          <h2 className="truncate font-serif text-xl text-white sm:text-2xl">
            {book.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={finishAndClose}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
        >
          Сохранить и выйти
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-sm text-white/70 sm:px-6">
        <span>
          Стр. {pageIndex + 1} / {pageCount}
        </span>
        <span>
          Сегодня ~{todayAfter}/{pagesGoalToday}
        </span>
        {goalMet ? (
          <span className="rounded-full bg-[#2f7d4a]/30 px-3 py-1 text-[#9ddeb0]">
            Норма на сегодня
          </span>
        ) : null}
        {rendering ? <span className="text-white/45">Рисуем…</span> : null}
      </div>

      <div className="relative flex-1 overflow-auto bg-[#0b1015]">
        {loading ? (
          <div className="grid h-full place-items-center px-6 text-center text-white/70">
            Открываем PDF… Для файлов на 1000+ страниц это может занять пару секунд.
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <p className="font-serif text-2xl text-white">Не открылось</p>
            <p className="mt-3 text-white/65">{error}</p>
            <button
              type="button"
              onClick={finishAndClose}
              className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#102018]"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <div className="flex min-h-full justify-center px-3 py-6">
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-lg bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            />
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={pageIndex <= 0 || loading}
            onClick={() => goTo(pageIndex - 1)}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            ← Назад
          </button>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(jumpValue);
              if (Number.isFinite(n)) goTo(n - 1);
            }}
          >
            <input
              type="number"
              min={1}
              max={pageCount}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              className="w-20 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-[#7db7a8]/40"
            />
            <button
              type="submit"
              className="rounded-full border border-white/20 px-3 py-2 text-sm font-semibold"
            >
              Перейти
            </button>
          </form>

          <button
            type="button"
            disabled={pageIndex >= pageCount - 1 || loading}
            onClick={() => goTo(pageIndex + 1)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#102018] disabled:opacity-40"
          >
            Дальше →
          </button>

          <div className="ml-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))))
              }
              className="rounded-full border border-white/20 px-3 py-2 text-sm"
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-white/60">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setScale((s) => Math.min(2.4, Number((s + 0.15).toFixed(2))))
              }
              className="rounded-full border border-white/20 px-3 py-2 text-sm"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/45">
          Стрелки ← → листают. Большой PDF ок: рисуется только текущая страница.
        </p>
      </div>
    </div>
  );
}
