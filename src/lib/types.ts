export type BookStatus = "planned" | "reading" | "done";

export type Book = {
  id: string;
  title: string;
  author: string;
  course: string;
  totalPages: number;
  currentPage: number;
  deadline: string;
  status: BookStatus;
  pdfId: string | null;
  guidedPageIndex: number;
  guidedChunkIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  pagesRead: number;
  minutes: number;
  note: string;
  date: string;
  createdAt: string;
  guided: boolean;
};

export type Settings = {
  dailyPageGoal: number;
  dailyMinuteGoal: number;
  displayName: string;
  booksPerDay: number;
  pagesPerBookPerDay: number;
  maxWpm: number;
};

export type AppData = {
  books: Book[];
  sessions: ReadingSession[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  dailyPageGoal: 40,
  dailyMinuteGoal: 60,
  displayName: "Студент",
  booksPerDay: 4,
  pagesPerBookPerDay: 10,
  maxWpm: 160,
};

export const STORAGE_KEY = "semestr-reading-tracker-v2";
