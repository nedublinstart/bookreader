import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";

let workerReady = false;

function ensureWorker() {
  if (workerReady || typeof window === "undefined") return;
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  workerReady = true;
}

export async function extractPdfPages(file: File | Blob): Promise<{
  pageCount: number;
  pages: string[];
}> {
  ensureWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf: PDFDocumentProxy = await getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .filter(Boolean);
    pages.push(normalizePageText(strings.join(" ")));
  }

  return { pageCount: pdf.numPages, pages };
}

function normalizePageText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\u00ad/g, "")
    .trim();
}

/** Demo academic Russian text when user has no PDF yet */
export function buildDemoPages(title: string, pageCount = 24): string[] {
  const paragraphs = [
    `${title}. Введение. Университетское чтение отличается от привычного скролла ленты: здесь важно не «пролистать», а действительно удержать мысль.`,
    "Первый шаг — снизить страх. Не нужно читать идеально. Нужна короткая честная сессия: несколько страниц с вниманием, без фоновой музыки, которая уводит голову в сторону.",
    "Текст учебника часто плотный. Поэтому полезно идти по нему медленно, фраза за фразой, и не перескакивать абзацы только глазами.",
    "Дедлайн сам по себе не учит. Учит ритм: сегодня немного из этой книги, завтра снова, и так до зачёта.",
    "Когда мысль ускользает, вернись на предыдущую фразу. Это не провал, это рабочий приём.",
    "Академический аргумент обычно строится так: тезис, пояснение, пример, вывод. Если видишь эту схему, текст становится понятнее.",
    "Не пытайся запомнить всё. Цель сессии — пройти назначенные страницы осознанно и отметить, что именно стало яснее.",
    "Если страница почти без текста или сплошные формулы, всё равно веди курсор до конца: так привычка не ломается.",
    "Чтение четырёх книг понемногу лучше, чем одна книга «рывком» раз в неделю. Мозг любит регулярность сильнее героизма.",
    "В конце сессии сформулируй одну фразу своими словами. Даже слабая формулировка закрепляет материал сильнее пассивного пролистывания.",
  ];

  return Array.from({ length: pageCount }, (_, page) => {
    const block = [];
    for (let i = 0; i < 4; i += 1) {
      block.push(paragraphs[(page + i) % paragraphs.length]);
    }
    return `Страница ${page + 1}. ${block.join(" ")}`;
  });
}

export type ReadingChunk = {
  id: string;
  text: string;
  wordCount: number;
};

/** Split page text into small hold-to-advance chunks */
export function chunkPageText(pageText: string, wordsPerChunk = 9): ReadingChunk[] {
  const words = pageText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [
      {
        id: "empty",
        text: "На этой странице почти нет текста — просто доведи курсор до конца.",
        wordCount: 8,
      },
    ];
  }

  const chunks: ReadingChunk[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const slice = words.slice(i, i + wordsPerChunk);
    chunks.push({
      id: `c-${i}`,
      text: slice.join(" "),
      wordCount: slice.length,
    });
  }
  return chunks;
}

export function msForChunk(wordCount: number, wpm: number, minMs = 900): number {
  const safeWpm = Math.max(60, Math.min(220, wpm));
  const raw = (wordCount / safeWpm) * 60_000;
  return Math.max(minMs, raw);
}
