"use client";

import type { Book } from "@/lib/types";
import {
  bookPace,
  bookProgress,
  formatShortDate,
  pagesLeft,
} from "@/lib/reading";
import { PaceBadge } from "./PaceBadge";

export function BookCard({
  book,
  active,
  onSelect,
  onQuickLog,
}: {
  book: Book;
  active?: boolean;
  onSelect: () => void;
  onQuickLog: () => void;
}) {
  const pace = bookPace(book);
  const progress = bookProgress(book);
  const left = pagesLeft(book);
  const done = book.status === "done" || book.currentPage >= book.totalPages;

  return (
    <article
      className={`group relative overflow-hidden rounded-[22px] border border-line bg-panel p-5 shadow-[var(--shadow)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 ${
        active ? "ring-2 ring-teal/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label={`Открыть ${book.title}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
              {book.course || "Без предмета"}
            </p>
            <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">
              {book.title}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">{book.author || "Автор не указан"}</p>
          </div>
          <PaceBadge status={pace.status} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
            <span>
              {book.currentPage} / {book.totalPages} стр.
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(21,32,40,0.08)]">
            <div
              className="progress-fill h-full rounded-full bg-teal"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          <span>Дедлайн {formatShortDate(book.deadline)}</span>
          {!done ? (
            <>
              <span>
                {pace.daysLeft < 0
                  ? `${Math.abs(pace.daysLeft)} дн. просрочки`
                  : `${pace.daysLeft} дн.`}
              </span>
              <span>~{Math.ceil(pace.requiredPerDay)} стр./день</span>
              <span>осталось {left}</span>
            </>
          ) : (
            <span className="text-good">Книга закрыта</span>
          )}
        </div>
      </div>

      {!done ? (
        <div className="relative z-10 mt-5 flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickLog();
            }}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-deep"
          >
            + сессия
          </button>
        </div>
      ) : null}
    </article>
  );
}
