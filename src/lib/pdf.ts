import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";

let workerReady = false;

export function ensurePdfWorker() {
  if (workerReady || typeof window === "undefined") return;
  // Public copy — stable for Next.js / Turbopack and large PDFs
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerReady = true;
}

/** Fast: only page count, no text extraction (works for 1000+ page PDFs). */
export async function getPdfPageCount(file: File | Blob): Promise<number> {
  ensurePdfWorker();
  const url = URL.createObjectURL(file);
  try {
    const pdf = await getDocument({ url }).promise;
    const count = pdf.numPages;
    await pdf.destroy();
    return count;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function openPdfFromBlob(blob: Blob): Promise<{
  pdf: PDFDocumentProxy;
  objectUrl: string;
}> {
  ensurePdfWorker();
  const objectUrl = URL.createObjectURL(blob);
  const pdf = await getDocument({
    url: objectUrl,
    // Don't disable streaming — better for big files
    disableAutoFetch: false,
    disableStream: false,
  }).promise;
  return { pdf, objectUrl };
}

export async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.25,
): Promise<void> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D недоступен");

  const transform =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  await page.render({
    canvasContext: context,
    viewport,
    transform,
  }).promise;
}
