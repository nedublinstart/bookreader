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
      books: parsed.books ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return emptyData;
  }
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
  // Client mount flips hydrated via useSyncExternalStore comparing snapshots
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
    }) => {
      const now = new Date().toISOString();
      const currentPage = Math.min(
        input.currentPage ?? 0,
        Math.max(1, input.totalPages),
      );
      const book: Book = {
        id: uid(),
        title: input.title.trim(),
        author: input.author.trim(),
        course: input.course.trim(),
        totalPages: Math.max(1, input.totalPages),
        currentPage,
        deadline: input.deadline,
        status: currentPage >= input.totalPages ? "done" : currentPage > 0 ? "reading" : "planned",
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

  const deleteBook = useCallback((id: string) => {
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
        return {
          ...prev,
          books,
          sessions: [session, ...prev.sessions],
        };
      });

      return session;
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
    const today = todayISO();
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return todayISO(d);
    };

    const books: Book[] = [
      {
        id: uid(),
        title: "История западной философии",
        author: "Бертран Рассел",
        course: "Философия",
        totalPages: 820,
        currentPage: 146,
        deadline: inDays(21),
        status: "reading",
        createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uid(),
        title: "Алгоритмы: построение и анализ",
        author: "Кормен и др.",
        course: "Алгоритмы",
        totalPages: 540,
        currentPage: 88,
        deadline: inDays(10),
        status: "reading",
        createdAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uid(),
        title: "Русская литература XIX века",
        author: "Хрестоматия",
        course: "Литература",
        totalPages: 260,
        currentPage: 0,
        deadline: inDays(35),
        status: "planned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sessions: ReadingSession[] = [
      {
        id: uid(),
        bookId: books[0].id,
        pagesRead: 22,
        minutes: 40,
        note: "Глава про Платона",
        date: today,
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        bookId: books[1].id,
        pagesRead: 18,
        minutes: 35,
        note: "",
        date: todayISO(new Date(Date.now() - 86_400_000)),
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        id: uid(),
        bookId: books[0].id,
        pagesRead: 16,
        minutes: 28,
        note: "",
        date: todayISO(new Date(Date.now() - 2 * 86_400_000)),
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
    ];

    update(() => ({
      books,
      sessions,
      settings: {
        dailyPageGoal: 35,
        dailyMinuteGoal: 45,
        displayName: "Студент",
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
    deleteSession,
    updateSettings,
    seedDemo,
    resetAll,
  };
}
