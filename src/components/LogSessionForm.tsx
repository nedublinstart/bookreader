"use client";

import { FormEvent, useState } from "react";
import type { Book } from "@/lib/types";
import { bookPace, pagesLeft } from "@/lib/reading";

export function LogSessionForm({
  book,
  onSubmit,
  onCancel,
}: {
  book: Book;
  onSubmit: (data: { pagesRead: number; minutes: number; note: string }) => void;
  onCancel: () => void;
}) {
  const pace = bookPace(book);
  const suggested = Math.min(
    pagesLeft(book),
    Math.max(5, Math.ceil(pace.requiredPerDay)),
  );

  return (
    <LogSessionFormInner
      key={`${book.id}-${suggested}`}
      book={book}
      suggested={suggested}
      requiredPerDay={pace.requiredPerDay}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

function LogSessionFormInner({
  book,
  suggested,
  requiredPerDay,
  onSubmit,
  onCancel,
}: {
  book: Book;
  suggested: number;
  requiredPerDay: number;
  onSubmit: (data: { pagesRead: number; minutes: number; note: string }) => void;
  onCancel: () => void;
}) {
  const [pagesRead, setPagesRead] = useState(suggested);
  const [minutes, setMinutes] = useState(25);
  const [note, setNote] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ pagesRead, minutes, note });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-rise rounded-[24px] border border-line bg-white/85 p-6 shadow-[var(--shadow)] backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Сессия чтения
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">{book.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Чтобы уложиться в срок — около {Math.ceil(requiredPerDay)} стр. в день
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          Закрыть
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Страниц за сессию</span>
          <input
            type="number"
            min={1}
            required
            value={pagesRead}
            onChange={(e) => setPagesRead(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Минут</span>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Заметка</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Что успел понять / где остановился"
            className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[10, 15, 20, 30, suggested]
          .filter((v, i, arr) => arr.indexOf(v) === i && v > 0)
          .map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPagesRead(n)}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-teal hover:text-teal"
            >
              {n} стр.
            </button>
          ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep"
        >
          Записать прогресс
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-ink-soft"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
