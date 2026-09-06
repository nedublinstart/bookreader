"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/store";
import {
  computeStreak,
  dailyBookPlan,
  formatDateRu,
  formatShortDate,
  guidedPagesOnDate,
  minutesOnDate,
  pagesOnDate,
  sortBooksByUrgency,
  todayISO,
  weekPages,
} from "@/lib/reading";
import type { Book } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";
import { BookCard } from "./BookCard";
import { AddBookForm } from "./AddBookForm";
import { GuidedReader } from "./GuidedReader";

type Panel = "none" | "add" | "settings";

export function TrackerApp() {
  const {
    books,
    sessions,
    settings,
    hydrated,
    addBook,
    deleteBook,
    saveGuidedProgress,
    updateSettings,
    seedDemo,
    resetAll,
  } = useAppData();

  const [panel, setPanel] = useState<Panel>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const today = todayISO();
  const sortedBooks = useMemo(() => sortBooksByUrgency(books), [books]);
  const selectedBook =
    books.find((b) => b.id === selectedId) ?? sortedBooks[0] ?? null;
  const readingBook = books.find((b) => b.id === readingId) ?? null;

  const plan = useMemo(
    () => dailyBookPlan(books, sessions, settings, today),
    [books, sessions, settings, today],
  );
  const planDoneCount = plan.filter((p) => p.done).length;
  const pagesToday = pagesOnDate(sessions, today);
  const guidedTodayTotal = sessions
    .filter((s) => s.date === today && s.guided)
    .reduce((sum, s) => sum + s.pagesRead, 0);
  const minutesToday = minutesOnDate(sessions, today);
  const streak = computeStreak(sessions, today);
  const week = weekPages(sessions, today);
  const dayGoal = settings.booksPerDay * settings.pagesPerBookPerDay;
  const goalProgress = guidedTodayTotal / Math.max(1, dayGoal);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function openRead(book: Book) {
    setSelectedId(book.id);
    setReadingId(book.id);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        Загружаем полку…
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="animate-rise flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
            Трекер чтения для вуза · анти-скип
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.95] tracking-tight text-ink sm:text-6xl">
            Семестр
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Страшно начинать — нормально. Не нужно «настроиться». Зажми кнопку и
            пройди курсором{" "}
            <strong className="font-semibold text-ink">
              {settings.pagesPerBookPerDay} стр. × {settings.booksPerDay} книги
            </strong>
            . Без курсора страницы почти не считаются.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPanel(panel === "add" ? "none" : "add")}
            className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-deep"
          >
            Добавить книгу / PDF
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "settings" ? "none" : "settings")}
            className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-ink"
          >
            Норма дня
          </button>
        </div>
      </header>

      {panel === "add" ? (
        <div className="mt-8">
          <AddBookForm
            onCancel={() => setPanel("none")}
            onSubmit={(data) => {
              const book = addBook(data);
              setSelectedId(book.id);
              setPanel("none");
              showToast(
                data.pdfId ? "PDF на полке. Можно читать курсором." : "Книга с демо-текстом добавлена",
              );
            }}
          />
        </div>
      ) : null}

      {panel === "settings" ? (
        <section className="animate-rise mt-8 rounded-[24px] border border-line bg-white/80 p-6 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Самоконтроль без героизма
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Дневной план</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            По умолчанию 4 книги × 10 страниц курсорным чтением. Скорость курсора
            ограничена — нельзя пролететь текст.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Книг в день</span>
              <input
                type="number"
                min={1}
                max={8}
                value={settings.booksPerDay}
                onChange={(e) =>
                  updateSettings({ booksPerDay: Number(e.target.value) || 1 })
                }
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Стр. на книгу</span>
              <input
                type="number"
                min={3}
                max={40}
                value={settings.pagesPerBookPerDay}
                onChange={(e) =>
                  updateSettings({
                    pagesPerBookPerDay: Number(e.target.value) || 3,
                  })
                }
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                Макс. скорость (слов/мин)
              </span>
              <input
                type="number"
                min={80}
                max={200}
                value={settings.maxWpm}
                onChange={(e) =>
                  updateSettings({ maxWpm: Number(e.target.value) || 120 })
                }
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Имя</span>
              <input
                value={settings.displayName}
                onChange={(e) => updateSettings({ displayName: e.target.value })}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setPanel("none")}
            className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Готово
          </button>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-rise-delay-1 rounded-[28px] border border-line bg-panel p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
                Сегодня · {formatDateRu(today)}
              </p>
              <h2 className="mt-3 font-serif text-4xl text-ink">
                Привет, {settings.displayName || "студент"}
              </h2>
              <p className="mt-3 max-w-md text-ink-soft">
                {guidedTodayTotal >= dayGoal
                  ? "Дневная норма курсором закрыта. Можно остановиться без чувства вины."
                  : guidedTodayTotal === 0
                    ? "Ещё ни одной страницы курсором. Выбери срочную книгу и просто зажми кнопку."
                    : `Ещё ${Math.max(0, dayGoal - guidedTodayTotal)} стр. курсором до нормы (${planDoneCount}/${settings.booksPerDay} книг).`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {plan[0] && !plan[0].done ? (
                  <button
                    type="button"
                    onClick={() => openRead(plan[0].book)}
                    className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-deep"
                  >
                    Читать сейчас: {plan[0].book.title.slice(0, 28)}
                    {plan[0].book.title.length > 28 ? "…" : ""}
                  </button>
                ) : books.length === 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPanel("add")}
                      className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white"
                    >
                      Добавить первую книгу
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        seedDemo();
                        showToast("Демо-полка из 4 книг");
                      }}
                      className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Загрузить демо
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectedBook && openRead(selectedBook)}
                    className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white"
                  >
                    Продолжить чтение
                  </button>
                )}
              </div>
            </div>
            <ProgressRing
              value={goalProgress}
              label={`${guidedTodayTotal}`}
              sublabel={`из ${dayGoal}`}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Стрик"
              value={`${streak} дн.`}
              hint={streak > 0 ? "Не рви цепочку" : "Начни с 1 страницы"}
              glow={streak > 0}
            />
            <Stat label="Минут сегодня" value={`${minutesToday}`} hint={`${pagesToday} стр. всего`} />
            <Stat
              label="Книг в плане"
              value={`${planDoneCount}/${settings.booksPerDay}`}
              hint={`по ${settings.pagesPerBookPerDay} стр.`}
            />
          </div>
        </div>

        <div className="animate-rise-delay-2 flex flex-col gap-6">
          <div className="rounded-[28px] border border-line bg-ink p-6 text-white shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              План на сегодня
            </p>
            <h3 className="mt-2 font-serif text-2xl">
              {settings.booksPerDay}×{settings.pagesPerBookPerDay} без самообмана
            </h3>
            <div className="mt-5 space-y-3">
              {plan.length === 0 ? (
                <p className="text-sm leading-relaxed text-white/70">
                  Добавь книги с PDF или возьми демо — план соберётся сам.
                </p>
              ) : (
                plan.map((item) => (
                  <button
                    key={item.book.id}
                    type="button"
                    onClick={() => openRead(item.book)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3 text-left hover:bg-white/12"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.book.title}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {item.guidedToday}/{item.goal} стр. курсором
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.done
                          ? "bg-[rgba(47,125,74,0.35)] text-[#b6e6c4]"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      {item.done ? "готово" : "читать"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-line bg-white/75 p-6 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-ink">Неделя</h3>
              <span className="text-sm text-ink-soft">
                {week.reduce((a, b) => a + b, 0)} стр.
              </span>
            </div>
            <div className="mt-5 flex h-36 items-end gap-2">
              {week.map((pages, i) => {
                const max = Math.max(dayGoal, ...week, 1);
                const height = `${Math.max(8, (pages / max) * 100)}%`;
                const labels = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
                const isToday = (new Date().getDay() + 6) % 7 === i;
                return (
                  <div key={labels[i]} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-2xl bg-paper-deep/70 px-1.5 py-1.5">
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${
                          isToday ? "bg-teal" : "bg-[rgba(31,111,99,0.35)]"
                        }`}
                        style={{ height }}
                        title={`${pages} стр.`}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isToday ? "text-teal" : "text-ink-soft"
                      }`}
                    >
                      {labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="animate-rise-delay-3 mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
              Полка семестра
            </p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Книги</h2>
          </div>
          <p className="text-sm text-ink-soft">Сортировка по срочности</p>
        </div>

        {sortedBooks.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-line bg-white/50 px-6 py-16 text-center">
            <h3 className="font-serif text-3xl text-ink">Полка пустая</h3>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              Страх чтения — не приговор. Добавь PDF или открой демо-текст и пройди
              первые страницы курсором.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setPanel("add")}
                className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white"
              >
                Добавить книгу
              </button>
              <button
                type="button"
                onClick={() => {
                  seedDemo();
                  showToast("Демо-полка загружена");
                }}
                className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink"
              >
                Посмотреть демо
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {sortedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                active={selectedBook?.id === book.id}
                guidedToday={guidedPagesOnDate(sessions, today, book.id)}
                dailyGoal={settings.pagesPerBookPerDay}
                onSelect={() => setSelectedId(book.id)}
                onRead={() => openRead(book)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedBook ? (
        <section className="mt-12 rounded-[28px] border border-line bg-white/80 p-6 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
                Выбрано
              </p>
              <h3 className="mt-2 font-serif text-3xl text-ink">{selectedBook.title}</h3>
              <p className="mt-1 text-ink-soft">
                {selectedBook.author || "Автор не указан"}
                {selectedBook.course ? ` · ${selectedBook.course}` : ""}
                {selectedBook.pdfId ? " · PDF" : " · демо-текст"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Дедлайн {formatShortDate(selectedBook.deadline)} · курсор: стр.{" "}
                {selectedBook.guidedPageIndex + 1}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedBook.status !== "done" ? (
                <button
                  type="button"
                  onClick={() => openRead(selectedBook)}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
                >
                  Читать курсором
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Удалить «${selectedBook.title}»?`)) {
                    void deleteBook(selectedBook.id);
                    setSelectedId(null);
                    showToast("Книга удалена");
                  }
                }}
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-rose"
              >
                Удалить
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>
          Данные и PDF хранятся локально в браузере. Курсорное чтение — основной способ
          засчитывать страницы.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Сбросить все данные трекера?")) {
              resetAll();
              setSelectedId(null);
              setPanel("none");
              showToast("Данные сброшены");
            }
          }}
          className="self-start font-semibold text-ink hover:text-rose"
        >
          Сбросить данные
        </button>
      </footer>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {readingBook ? (
        <GuidedReader
          book={readingBook}
          maxWpm={settings.maxWpm}
          pagesGoalToday={settings.pagesPerBookPerDay}
          guidedToday={guidedPagesOnDate(sessions, today, readingBook.id)}
          onClose={() => setReadingId(null)}
          onSave={(input) => {
            saveGuidedProgress({
              bookId: readingBook.id,
              guidedPageIndex: input.guidedPageIndex,
              guidedChunkIndex: input.guidedChunkIndex,
              pagesCompleted: input.pagesCompleted,
              minutes: input.minutes,
            });
            showToast(
              input.pagesCompleted > 0
                ? `+${input.pagesCompleted} стр. курсором`
                : "Прогресс курсора сохранён",
            );
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  glow,
}: {
  label: string;
  value: string;
  hint: string;
  glow?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/65 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>
      <p className={`mt-2 font-serif text-3xl text-ink ${glow ? "streak-glow" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}
