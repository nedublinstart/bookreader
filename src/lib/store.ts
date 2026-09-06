"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  AppData,
  Book,
  DEFAULT_SETTINGS,
  ReadingSession,
  Settings,
  STORAGE_KEY,
} from "./types";
import { todayISO, uid } from "./reading";
import { deletePdf } from "./pdfStore";

const emptyData: AppData = {
  books: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
};

function readStorage(): AppData {
  if (typeof window === "undefined") return emptyData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      books: (parsed.books ?? []).map(normalizeBook),
      sessions: (parsed.sessions ?? []).map(normalizeSession),
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return emptyData;
  }
}

function normalizeBook(book: Partial<Book> & { id: string }): Book {
  return {
    id: book.id,
    title: book.title ?? "Без названия",
    author: book.author ?? "",
    course: book.course ?? "",
    totalPages: book.totalPages ?? 1,
    currentPage: book.currentPage ?? 0,
    deadline: book.deadline ?? todayISO(),
    status: book.status ?? "planned",
    pdfId: book.pdfId ?? null,
    guidedPageIndex: book.guidedPageIndex ?? book.currentPage ?? 0,
    guidedChunkIndex: book.guidedChunkIndex ?? 0,
    createdAt: book.createdAt ?? new Date().toISOString(),
    updatedAt: book.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeSession(
  session: Partial<ReadingSession> & { id: string },
): ReadingSession {
  return {
    id: session.id,
    bookId: session.bookId ?? "",
    pagesRead: session.pagesRead ?? 0,
    minutes: session.minutes ?? 0,
    note: session.note ?? "",
    date: session.date ?? todayISO(),
    createdAt: session.createdAt ?? new Date().toISOString(),
    guided: Boolean(session.guided),
  };
}

function writeStorage(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("semestr-storage"));
}

let memoryCache: AppData | null = null;

function getSnapshot(): AppData {
  if (typeof window === "undefined") return emptyData;
  if (!memoryCache) memoryCache = readStorage();
  return memoryCache;
}

function getServerSnapshot(): AppData {
  return emptyData;
}

function subscribe(onStoreChange: () => void) {
  const handler = () => {
    memoryCache = readStorage();
    onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("semestr-storage", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("semestr-storage", handler);
  };
}

function update(mutator: (prev: AppData) => AppData) {
  const next = mutator(getSnapshot());
  memoryCache = next;
  writeStorage(next);
}

function getHydratedSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

function subscribeHydrated(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);
  return () => {};
}

export function useAppData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );

  const addBook = useCallback(
    (input: {
      title: string;
      author: string;
      course: string;
      totalPages: number;
      currentPage?: number;
      deadline: string;
      pdfId?: string | null;
    }) => {
      const now = new Date().toISOString();
      const totalPages = Math.max(1, input.totalPages);
      const currentPage = Math.min(input.currentPage ?? 0, totalPages);
      const book: Book = {
        id: uid(),
        title: input.title.trim(),
        author: input.author.trim(),
        course: input.course.trim(),
        totalPages,
        currentPage,
        deadline: input.deadline,
        status:
          currentPage >= totalPages
            ? "done"
            : currentPage > 0
              ? "reading"
              : "planned",
        pdfId: input.pdfId ?? null,
        guidedPageIndex: currentPage,
        guidedChunkIndex: 0,
        createdAt: now,
        updatedAt: now,
      };
      update((prev) => ({ ...prev, books: [book, ...prev.books] }));
      return book;
    },
    [],
  );

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    update((prev) => ({
      ...prev,
      books: prev.books.map((book) => {
        if (book.id !== id) return book;
        const next = { ...book, ...patch, updatedAt: new Date().toISOString() };
        if (next.currentPage >= next.totalPages) next.status = "done";
        else if (next.currentPage > 0) next.status = "reading";
        else next.status = "planned";
        return next;
      }),
    }));
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    const book = getSnapshot().books.find((b) => b.id === id);
    if (book?.pdfId) {
      try {
        await deletePdf(book.pdfId);
      } catch {
        // ignore
      }
    }
    update((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b.id !== id),
      sessions: prev.sessions.filter((s) => s.bookId !== id),
    }));
  }, []);

  const logSession = useCallback(
    (input: {
      bookId: string;
      pagesRead: number;
      minutes: number;
      note?: string;
      date?: string;
      guided?: boolean;
    }) => {
      const pagesRead = Math.max(0, Math.floor(input.pagesRead));
      if (pagesRead <= 0 && input.minutes <= 0) return null;

      const session: ReadingSession = {
        id: uid(),
        bookId: input.bookId,
        pagesRead,
        minutes: Math.max(0, Math.floor(input.minutes)),
        note: (input.note ?? "").trim(),
        date: input.date ?? todayISO(),
        createdAt: new Date().toISOString(),
        guided: Boolean(input.guided),
      };

      update((prev) => {
        const books = prev.books.map((book) => {
          if (book.id !== input.bookId) return book;
          const currentPage = Math.min(
            book.totalPages,
            book.currentPage + pagesRead,
          );
          return {
            ...book,
            currentPage,
            status: currentPage >= book.totalPages ? "done" : "reading",
            updatedAt: new Date().toISOString(),
          } satisfies Book;
        });
        return { ...prev, books, sessions: [session, ...prev.sessions] };
      });

      return session;
    },
    [],
  );

  const saveReadingProgress = useCallback(
    (input: {
      bookId: string;
      currentPage: number;
      pagesCompleted: number;
      minutes: number;
    }) => {
      update((prev) => {
        let sessions = prev.sessions;
        if (input.pagesCompleted > 0) {
          const session: ReadingSession = {
            id: uid(),
            bookId: input.bookId,
            pagesRead: input.pagesCompleted,
            minutes: Math.max(1, Math.round(input.minutes)),
            note: "Чтение PDF",
            date: todayISO(),
            createdAt: new Date().toISOString(),
            guided: false,
          };
          sessions = [session, ...sessions];
        }

        const books = prev.books.map((book) => {
          if (book.id !== input.bookId) return book;
          const currentPage = Math.min(
            book.totalPages,
            Math.max(0, input.currentPage),
          );
          return {
            ...book,
            currentPage,
            guidedPageIndex: currentPage,
            guidedChunkIndex: 0,
            status: currentPage >= book.totalPages ? "done" : "reading",
            updatedAt: new Date().toISOString(),
          } satisfies Book;
        });

        return { ...prev, books, sessions };
      });
    },
    [],
  );

  const deleteSession = useCallback((sessionId: string) => {
    update((prev) => {
      const session = prev.sessions.find((s) => s.id === sessionId);
      if (!session) return prev;

      const books = prev.books.map((book) => {
        if (book.id !== session.bookId) return book;
        const currentPage = Math.max(0, book.currentPage - session.pagesRead);
        return {
          ...book,
          currentPage,
          status:
            currentPage >= book.totalPages
              ? "done"
              : currentPage > 0
                ? "reading"
                : "planned",
          updatedAt: new Date().toISOString(),
        } satisfies Book;
      });

      return {
        ...prev,
        books,
        sessions: prev.sessions.filter((s) => s.id !== sessionId),
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const seedDemo = useCallback(() => {
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return todayISO(d);
    };

    const mk = (
      title: string,
      author: string,
      course: string,
      totalPages: number,
      currentPage: number,
      deadlineDays: number,
      createdDaysAgo: number,
    ): Book => ({
      id: uid(),
      title,
      author,
      course,
      totalPages,
      currentPage,
      deadline: inDays(deadlineDays),
      status: currentPage > 0 ? "reading" : "planned",
      pdfId: null,
      guidedPageIndex: currentPage,
      guidedChunkIndex: 0,
      createdAt: new Date(Date.now() - createdDaysAgo * 86_400_000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    update(() => ({
      books: [
        mk("История западной философии", "Бертран Рассел", "Философия", 120, 12, 21, 12),
        mk("Алгоритмы: построение и анализ", "Кормен и др.", "Алгоритмы", 90, 8, 10, 8),
        mk("Русская литература XIX века", "Хрестоматия", "Литература", 80, 0, 35, 1),
        mk("Социология культуры", "Л. Ионин", "Социология", 100, 5, 18, 6),
      ],
      sessions: [],
      settings: {
        ...DEFAULT_SETTINGS,
        displayName: "Студент",
        booksPerDay: 4,
        pagesPerBookPerDay: 10,
      },
    }));
  }, []);

  const resetAll = useCallback(() => {
    update(() => emptyData);
  }, []);

  return {
    ...data,
    hydrated,
    addBook,
    updateBook,
    deleteBook,
    logSession,
    saveReadingProgress,
    deleteSession,
    updateSettings,
    seedDemo,
    resetAll,
  };
}
