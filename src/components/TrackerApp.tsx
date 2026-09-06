"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/lib/store";
import {
  computeStreak,
  formatDateRu,
  formatShortDate,
  minutesOnDate,
  pagesOnDate,
  sortBooksByUrgency,
  suggestDailyGoal,
  todayISO,
  weekPages,
  bookPace,
} from "@/lib/reading";
import { ProgressRing } from "./ProgressRing";
import { BookCard } from "./BookCard";
import { AddBookForm } from "./AddBookForm";
import { LogSessionForm } from "./LogSessionForm";
import { PaceBadge } from "./PaceBadge";
import type { Book } from "@/lib/types";

type Panel = "none" | "add" | "log" | "settings";

export function TrackerApp() {
  const {
    books,
    sessions,
    settings,
    hydrated,
    addBook,
    deleteBook,
    logSession,
    deleteSession,
    updateSettings,
    seedDemo,
    resetAll,
  } = useAppData();

  const [panel, setPanel] = useState<Panel>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const today = todayISO();
  const sortedBooks = useMemo(() => sortBooksByUrgency(books), [books]);
  const selectedBook =
    books.find((b) => b.id === selectedId) ?? sortedBooks[0] ?? null;

  const pagesToday = pagesOnDate(sessions, today);
  const minutesToday = minutesOnDate(sessions, today);
  const streak = computeStreak(sessions, today);
  const week = weekPages(sessions, today);
  const suggested = suggestDailyGoal(books, today);
  const goalProgress = pagesToday / Math.max(1, settings.dailyPageGoal);
  const activeBooks = books.filter(
    (b) => b.status !== "done" && b.currentPage < b.totalPages,
  );
  const urgent = activeBooks
    .map((b) => ({ book: b, pace: bookPace(b, today) }))
    .filter((x) => x.pace.status === "behind" || x.pace.status === "overdue")
    .slice(0, 3);

  const recentSessions = sessions.slice(0, 8);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function openLog(book: Book) {
    setSelectedId(book.id);
    setPanel("log");
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
            Трекер чтения для вуза
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.95] tracking-tight text-ink sm:text-6xl">
            Семестр
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Держи учебники в графике до зачёта: дневная норма, стрик и честный темп
            по каждой книге — без самообмана.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPanel(panel === "add" ? "none" : "add")}
            className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep"
          >
            Добавить книгу
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "settings" ? "none" : "settings")}
            className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-ink"
          >
            Норма
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
              showToast("Книга добавлена на полку");
            }}
          />
        </div>
      ) : null}

      {panel === "log" && selectedBook ? (
        <div className="mt-8">
          <LogSessionForm
            book={selectedBook}
            onCancel={() => setPanel("none")}
            onSubmit={(data) => {
              logSession({ bookId: selectedBook.id, ...data });
              setPanel("none");
              showToast(
                data.pagesRead > 0
                  ? `+${data.pagesRead} стр. записано`
                  : "Сессия сохранена",
              );
            }}
          />
        </div>
      ) : null}

      {panel === "settings" ? (
        <section className="animate-rise mt-8 rounded-[24px] border border-line bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Самоконтроль
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Дневная норма</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            По текущим дедлайнам тебе нужно примерно{" "}
            <strong className="text-ink">{suggested} стр./день</strong>. Поставь цель
            чуть выше комфортной — так стрик держит лучше.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                Страниц в день
              </span>
              <input
                type="number"
                min={5}
                value={settings.dailyPageGoal}
                onChange={(e) =>
                  updateSettings({ dailyPageGoal: Number(e.target.value) || 5 })
                }
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none ring-teal/30 focus:ring-2"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                Минут в день
              </span>
              <input
                type="number"
                min={10}
                value={settings.dailyMinuteGoal}
                onChange={(e) =>
                  updateSettings({ dailyMinuteGoal: Number(e.target.value) || 10 })
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
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                updateSettings({ dailyPageGoal: suggested });
                showToast(`Норма обновлена: ${suggested} стр.`);
              }}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
            >
              Взять рекомендуемую норму
            </button>
            <button
              type="button"
              onClick={() => setPanel("none")}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink-soft"
            >
              Готово
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-rise-delay-1 rounded-[28px] border border-line bg-panel p-6 shadow-[var(--shadow)] backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
                Сегодня · {formatDateRu(today)}
              </p>
              <h2 className="mt-3 font-serif text-4xl text-ink">
                Привет, {settings.displayName || "студент"}
              </h2>
              <p className="mt-3 max-w-md text-ink-soft">
                {pagesToday >= settings.dailyPageGoal
                  ? "Норма закрыта. Можно чуть больше — стрик скажет спасибо."
                  : pagesToday === 0
                    ? "Ещё ни одной страницы. Открой самую срочную книгу и сделай короткую сессию."
                    : `Ещё ${Math.max(0, settings.dailyPageGoal - pagesToday)} стр. до дневной нормы.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedBook && selectedBook.status !== "done" ? (
                  <button
                    type="button"
                    onClick={() => openLog(selectedBook)}
                    className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-deep"
                  >
                    Читать сейчас
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPanel("add")}
                    className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-deep"
                  >
                    Добавить первую книгу
                  </button>
                )}
                {books.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      seedDemo();
                      showToast("Демо-полка загружена");
                    }}
                    className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-ink"
                  >
                    Загрузить демо
                  </button>
                ) : null}
              </div>
            </div>
            <ProgressRing
              value={goalProgress}
              label={`${pagesToday}`}
              sublabel={`из ${settings.dailyPageGoal}`}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Стрик"
              value={`${streak} дн.`}
              hint={streak > 0 ? "Не рви цепочку" : "Начни сегодня"}
              glow={streak > 0}
            />
            <Stat
              label="Минут сегодня"
              value={`${minutesToday}`}
              hint={`цель ${settings.dailyMinuteGoal}`}
            />
            <Stat
              label="Активных книг"
              value={`${activeBooks.length}`}
              hint={`${books.filter((b) => b.status === "done").length} закрыто`}
            />
          </div>
        </div>

        <div className="animate-rise-delay-2 flex flex-col gap-6">
          <div className="rounded-[28px] border border-line bg-white/75 p-6 shadow-[var(--shadow)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-ink">Неделя</h3>
              <span className="text-sm text-ink-soft">
                {week.reduce((a, b) => a + b, 0)} стр.
              </span>
            </div>
            <div className="mt-5 flex h-36 items-end gap-2">
              {week.map((pages, i) => {
                const max = Math.max(settings.dailyPageGoal, ...week, 1);
                const height = `${Math.max(8, (pages / max) * 100)}%`;
                const labels = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
                const isToday =
                  ((new Date().getDay() + 6) % 7) === i;
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

          <div className="rounded-[28px] border border-line bg-ink p-6 text-white shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              Давление дедлайнов
            </p>
            <h3 className="mt-2 font-serif text-2xl">Что горит</h3>
            <div className="mt-5 space-y-4">
              {urgent.length === 0 ? (
                <p className="text-sm leading-relaxed text-white/70">
                  Пока всё в графике. Держи норму — и сессия не превратится в ночной
                  марафон.
                </p>
              ) : (
                urgent.map(({ book, pace }) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => openLog(book)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3 text-left transition hover:bg-white/12"
                  >
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {pace.status === "overdue"
                          ? "просрочено"
                          : `${pace.daysLeft} дн.`}{" "}
                        · ~{Math.ceil(pace.requiredPerDay)} стр./день
                      </p>
                    </div>
                    <PaceBadge status={pace.status} />
                  </button>
                ))
              )}
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
              Добавь учебник с дедлайном — сервис сам посчитает, сколько страниц нужно
              читать каждый день.
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
                onSelect={() => setSelectedId(book.id)}
                onQuickLog={() => openLog(book)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedBook ? (
        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-line bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
                  Детали
                </p>
                <h3 className="mt-2 font-serif text-3xl text-ink">{selectedBook.title}</h3>
                <p className="mt-1 text-ink-soft">
                  {selectedBook.author || "Автор не указан"}
                  {selectedBook.course ? ` · ${selectedBook.course}` : ""}
                </p>
              </div>
              <PaceBadge status={bookPace(selectedBook).status} />
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <Detail
                label="Прогресс"
                value={`${selectedBook.currentPage}/${selectedBook.totalPages}`}
              />
              <Detail label="Дедлайн" value={formatShortDate(selectedBook.deadline)} />
              <Detail
                label="Темп"
                value={`~${Math.ceil(bookPace(selectedBook).requiredPerDay)} стр./день`}
              />
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              {selectedBook.status !== "done" ? (
                <button
                  type="button"
                  onClick={() => openLog(selectedBook)}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
                >
                  Записать сессию
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Удалить «${selectedBook.title}»?`)) {
                    deleteBook(selectedBook.id);
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

          <div className="rounded-[28px] border border-line bg-panel p-6 shadow-[var(--shadow)] backdrop-blur-md">
            <h3 className="font-serif text-2xl text-ink">Последние сессии</h3>
            <div className="mt-5 space-y-3">
              {recentSessions.length === 0 ? (
                <p className="text-sm text-ink-soft">Пока нет записей чтения.</p>
              ) : (
                recentSessions.map((session) => {
                  const book = books.find((b) => b.id === session.bookId);
                  return (
                    <div
                      key={session.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white/60 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {book?.title ?? "Удалённая книга"}
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {formatShortDate(session.date)} · +{session.pagesRead} стр.
                          {session.minutes ? ` · ${session.minutes} мин.` : ""}
                          {session.note ? ` · ${session.note}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          deleteSession(session.id);
                          showToast("Сессия удалена");
                        }}
                        className="text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-rose"
                      >
                        Undo
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>
          Данные хранятся локально в браузере — удобно для личного самоконтроля.
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
      <p
        className={`mt-2 font-serif text-3xl text-ink ${glow ? "streak-glow" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
