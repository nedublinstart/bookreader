"use client";

import { FormEvent, useState } from "react";
import { todayISO, uid } from "@/lib/reading";
import { savePdf } from "@/lib/pdfStore";
import { extractPdfPages } from "@/lib/pdfText";

type Props = {
  onCancel: () => void;
  onSubmit: (data: {
    title: string;
    author: string;
    course: string;
    totalPages: number;
    currentPage: number;
    deadline: string;
    pdfId: string | null;
    guidedPageIndex: number;
  }) => void;
};

export function AddBookForm({ onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [course, setCourse] = useState("");
  const [totalPages, setTotalPages] = useState(200);
  const [currentPage, setCurrentPage] = useState(0);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return todayISO(d);
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let pdfId: string | null = null;
      let pages = Math.max(1, totalPages);
      let startPage = Math.min(Math.max(0, currentPage), pages);

      if (file) {
        const extracted = await extractPdfPages(file);
        pages = Math.max(1, extracted.pageCount);
        startPage = Math.min(startPage, Math.max(0, pages - 1));
        pdfId = uid();
        await savePdf({
          id: pdfId,
          bookId: "pending",
          name: file.name,
          mimeType: file.type || "application/pdf",
          size: file.size,
          blob: file,
          pages: extracted.pages,
          createdAt: new Date().toISOString(),
        });
      }

      onSubmit({
        title,
        author,
        course,
        totalPages: pages,
        currentPage: startPage,
        deadline,
        pdfId,
        guidedPageIndex: startPage,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось обработать PDF. Можно сохранить без файла.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-rise rounded-[24px] border border-line bg-white/85 p-6 shadow-[var(--shadow)] backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Новая книга
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Добавить в семестр</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Загрузи PDF. Дальше чтение только курсором: зажал — текст едет, отпустил —
            стоит. Так сложнее «пролистать под музыку».
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-sm font-medium text-ink-soft">
          Закрыть
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">PDF файл</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-teal file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <span className="mt-1 block text-xs text-ink-soft">
            {file
              ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} МБ`
              : "Без PDF откроется демо-текст — можно потренировать режим без страха."}
          </span>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Название</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Предмет</span>
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">
            Страниц {file ? "(из PDF)" : ""}
          </span>
          <input
            type="number"
            min={1}
            required
            disabled={Boolean(file)}
            value={totalPages}
            onChange={(e) => setTotalPages(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2 disabled:opacity-60"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Уже на странице</span>
          <input
            type="number"
            min={0}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Дедлайн</span>
          <input
            type="date"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[rgba(177,67,74,0.1)] px-4 py-3 text-sm text-rose">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Обрабатываем PDF…" : "Сохранить книгу"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink-soft"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
