const DB_NAME = "semestr-pdfs";
const DB_VERSION = 2;
const STORE = "files";

export type StoredPdf = {
  id: string;
  bookId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  pageCount: number;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

export async function savePdf(record: StoredPdf): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record);
  await txDone(tx);
  db.close();
}

export async function getPdf(id: string): Promise<StoredPdf | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get(id);
  const result = await new Promise<StoredPdf | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as StoredPdf | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
  });
  await txDone(tx);
  db.close();
  return result ?? null;
}

export async function deletePdf(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}
