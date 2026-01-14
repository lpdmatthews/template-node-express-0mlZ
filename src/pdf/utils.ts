import PDFDocument from "pdfkit";

// Helper to safely get nested values from an object
export function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Helper to format a value for display
export function fmt(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Helper to format date strings
export function fmtDate(value: unknown): string {
  if (!value) return '';
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

// Convert a PDFDocument to a Buffer
export function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  doc.on("data", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

// Standard page header
export function renderHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(18).fillColor("#333").text(title, { align: "center" });
  doc.moveDown(1);
}

// Standard page footer
export function renderFooter(doc: PDFKit.PDFDocument, pageNum?: number) {
  const bottomY = doc.page.height - 50;
  doc.fontSize(9).fillColor("#888");

  if (pageNum !== undefined) {
    doc.text(`Page ${pageNum}`, 50, bottomY, { align: "center" });
  }

  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    50,
    bottomY + 12,
    { align: "center" }
  );
}
