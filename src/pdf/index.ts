import PDFDocument from "pdfkit";
import { OrderPayload } from "./types";
import { bufferFromDoc } from "./utils";
import { renderInstructionsPage } from "./instructions";
import { calculatePages, renderBuildPage } from "./pages";

export { OrderPayload } from "./types";

export async function makeOrderPdfBuffer(payload: OrderPayload): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Start collecting chunks immediately
  const bufferPromise = bufferFromDoc(doc);

  // 1. Instructions page (always first)
  renderInstructionsPage(doc, payload);

  // 2. Calculate what pages are needed
  const pageSpecs = calculatePages(payload);

  // 3. Render each dynamic page
  for (const spec of pageSpecs) {
    doc.addPage();
    renderBuildPage(doc, spec, payload);
  }

  // Finalize
  doc.end();

  return bufferPromise;
}
