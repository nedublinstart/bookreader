import type { Book, ReadingSession, Settings } from "./types";

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function formatDateRu(iso: string): string {
  return parseISODate(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function bookProgress(book: Book): number {
  if (book.totalPages <= 0) return 0;
  return clamp(book.currentPage / book.totalPages, 0, 1);
}

export function pagesLeft(book: Book): number {
  return Math.max(0, book.totalPages - book.currentPage);
}

export type PaceStatus = "ahead" | "on_track" | "behind" | "overdue" | "done";

export function bookPace(
  book: Book,
  today = todayISO(),
): {
  status: PaceStatus;
  daysLeft: number;
  pagesPerDay: number;
  requiredPerDay: number;
} {
  if (book.status === "done" || book.currentPage >= book.totalPages) {
    return { status: "done", daysLeft: 0, pagesPerDay: 0, requiredPerDay: 0 };
  }

  const left = pagesLeft(book);
  const daysLeft = daysBetween(today, book.deadline);
  const createdDays = Math.max(
    1,
    daysBetween(book.createdAt.slice(0, 10), today) + 1,
  );
  const pagesPerDay = book.currentPage / createdDays;

  if (daysLeft < 0) {
    return { status: "overdue", daysLeft, pagesPerDay, requiredPerDay: left };
  }

  const remainingDays = Math.max(1, daysLeft);
  const requiredPerDay = left / remainingDays;

  let status: PaceStatus = "on_track";
  if (pagesPerDay > requiredPerDay * 1.1) status = "ahead";
  else if (pagesPerDay < requiredPerDay * 0.85) status = "behind";

  return { status, daysLeft, pagesPerDay, requiredPerDay };
}

export function paceLabel(status: PaceStatus): string {
  switch (status) {
    case "ahead":
      return "Опережаешь";
    case "on_track":
      return "В графике";
    case "behind":
      return "Отстаёшь";
    case "overdue":
      return "Просрочено";
    case "done":
      return "Прочитано";
  }
}

export function sessionsOnDate(
  sessions: ReadingSession[],
  date: string,
): ReadingSession[] {
  return sessions.filter((s) => s.date === date);
}

export function pagesOnDate(sessions: ReadingSession[], date: string): number {
  return sessionsOnDate(sessions, date).reduce((sum, s) => sum + s.pagesRead, 0);
}

export function guidedPagesOnDate(
  sessions: ReadingSession[],
  date: string,
  bookId?: string,
): number {
  return sessionsOnDate(sessions, date)
    .filter((s) => s.guided && (!bookId || s.bookId === bookId))
    .reduce((sum, s) => sum + s.pagesRead, 0);
}

export function minutesOnDate(sessions: ReadingSession[], date: string): number {
  return sessionsOnDate(sessions, date).reduce((sum, s) => sum + s.minutes, 0);
}

export function computeStreak(
  sessions: ReadingSession[],
  today = todayISO(),
): number {
  const days = new Set(
    sessions.filter((s) => s.pagesRead > 0 && s.guided).map((s) => s.date),
  );
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = parseISODate(today);
  if (!days.has(todayISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(todayISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function weekPages(sessions: ReadingSession[], today = todayISO()): number[] {
  const base = parseISODate(today);
  const day = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - day);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return pagesOnDate(sessions, todayISO(d));
  });
}

export function sortBooksByUrgency(books: Book[], today = todayISO()): Book[] {
  return [...books].sort((a, b) => {
    const aDone = a.status === "done" || a.currentPage >= a.totalPages;
    const bDone = b.status === "done" || b.currentPage >= b.totalPages;
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aPace = bookPace(a, today);
    const bPace = bookPace(b, today);
    const rank = (s: PaceStatus) =>
      ({ overdue: 0, behind: 1, on_track: 2, ahead: 3, done: 4 })[s];

    if (rank(aPace.status) !== rank(bPace.status)) {
      return rank(aPace.status) - rank(bPace.status);
    }
    return aPace.daysLeft - bPace.daysLeft;
  });
}

export function dailyBookPlan(
  books: Book[],
  sessions: ReadingSession[],
  settings: Settings,
  today = todayISO(),
): Array<{
  book: Book;
  guidedToday: number;
  goal: number;
  done: boolean;
}> {
  const active = sortBooksByUrgency(books, today).filter(
    (b) => b.status !== "done" && b.currentPage < b.totalPages,
  );
  const picked = active.slice(0, settings.booksPerDay);

  return picked.map((book) => {
    const guidedToday = guidedPagesOnDate(sessions, today, book.id);
    const goal = settings.pagesPerBookPerDay;
    return {
      book,
      guidedToday,
      goal,
      done: guidedToday >= goal,
    };
  });
}
