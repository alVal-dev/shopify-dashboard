import { api } from './index';

export const CSV_EXPORT_TYPES = ['orders', 'products', 'customers'] as const;
export type CsvExportType = (typeof CSV_EXPORT_TYPES)[number];

export async function downloadCsvExport(
  type: CsvExportType,
  now: Date = new Date(),
): Promise<string> {
  const response = await api().get<Blob>(`/export/${type}`, {
    responseType: 'blob',
  });

  const fallbackFilename = buildFallbackFilename(type, now);
  const filename = extractFilename(response.headers['content-disposition'], fallbackFilename);

  triggerBrowserDownload(response.data, filename);

  return filename;
}

export async function exportOrdersCsv(now: Date = new Date()): Promise<string> {
  return downloadCsvExport('orders', now);
}

function extractFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (unquotedMatch?.[1]) {
    return unquotedMatch[1].trim();
  }

  return fallback;
}

function buildFallbackFilename(type: CsvExportType, now: Date): string {
  const year = now.getUTCFullYear();
  const month = pad2(now.getUTCMonth() + 1);
  const day = pad2(now.getUTCDate());

  return `${type}-${year}-${month}-${day}.csv`;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
