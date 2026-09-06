export type BookStatus = "planned" | "reading" | "done";

export type Book = {
  id: string;
  title: string;
  author: string;
  course: string;
  totalPages: number;
  currentPage: number;
  deadline: string; // YYYY-MM-DD
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  pagesRead: number;
  minutes: number;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
};

export type Settings = {
  dailyPageGoal: number;
  dailyMinuteGoal: number;
  displayName: string;
};

export type AppData = {
  books: Book[];
  sessions: ReadingSession[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  dailyPageGoal: 30,
  dailyMinuteGoal: 45,
  displayName: "Студент",
};

export const STORAGE_KEY = "semestr-reading-tracker-v1";
