import PDFDocument from "pdfkit";

export async function makeSimplePdfBuffer(title: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const chunks: Uint8Array[] = [];

  doc.on("data", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(22).text(title);
  doc.moveDown();
  doc.fontSize(12).text("Hello from the Railway worker 👋");
  doc.end();

  return done;
}