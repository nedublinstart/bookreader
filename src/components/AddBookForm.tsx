"use client";

import { FormEvent, useState } from "react";
import { todayISO } from "@/lib/reading";

export function AddBookForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    title: string;
    author: string;
    course: string;
    totalPages: number;
    currentPage: number;
    deadline: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [course, setCourse] = useState("");
  const [totalPages, setTotalPages] = useState(300);
  const [currentPage, setCurrentPage] = useState(0);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return todayISO(d);
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || totalPages < 1) return;
    onSubmit({
      title,
      author,
      course,
      totalPages,
      currentPage,
      deadline,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-rise rounded-[24px] border border-line bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Новая книга
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Добавить в семестр</h2>
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
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Название</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Введение в психологию"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Автор</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Предмет / курс</span>
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Философия"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Всего страниц</span>
          <input
            type="number"
            min={1}
            required
            value={totalPages}
            onChange={(e) => setTotalPages(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Уже прочитано</span>
          <input
            type="number"
            min={0}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">
            Дедлайн (зачёт / семинар / эссе)
          </span>
          <input
            type="date"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep"
        >
          Сохранить книгу
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
