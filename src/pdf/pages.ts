import { OrderPayload, PageSpec } from "./types";
import { fmt, renderHeader, renderFooter } from "./utils";

// Calculate what pages are needed based on the payload
export function calculatePages(payload: OrderPayload): PageSpec[] {
  const pages: PageSpec[] = [];
  const buildConfig = payload.buildConfig as Record<string, unknown> | undefined;

  if (!buildConfig) {
    return pages;
  }

  const floors = Number(buildConfig.floors) || 1;

  // TODO: Add more sophisticated page calculation logic
  // For now, one page per floor as a starting point
  for (let i = 1; i <= floors; i++) {
    pages.push({
      pageNumber: i + 1, // +1 because instructions page is page 1
      title: `Floor ${i}`,
      data: {
        floor: i,
        // Add more floor-specific data here
        // e.g., windowsOnFloor: buildConfig.windowsPerFloor?.[i-1]
      },
    });
  }

  // TODO: Add pages for other things based on complexity
  // Example:
  // if (buildConfig.hasBalcony) {
  //   pages.push({ pageNumber: pages.length + 2, title: "Balcony Assembly", data: {} });
  // }
  // if (buildConfig.roofType === 'complex') {
  //   pages.push({ pageNumber: pages.length + 2, title: "Roof Assembly", data: {} });
  // }

  return pages;
}

// Render a single build page
export function renderBuildPage(doc: PDFKit.PDFDocument, spec: PageSpec, payload: OrderPayload) {
  const buildConfig = payload.buildConfig as Record<string, unknown> | undefined;

  renderHeader(doc, spec.title);

  doc.fontSize(11).fillColor("#000");

  // TODO: Fill in actual page content based on spec and payload
  // This is placeholder content

  if (spec.data.floor !== undefined) {
    const floorNum = spec.data.floor as number;
    doc.text(`Assembly instructions for floor ${floorNum}`);
    doc.moveDown(0.5);

    // Example: show windows for this floor
    if (buildConfig?.windowsPerFloor && Array.isArray(buildConfig.windowsPerFloor)) {
      const windowsOnFloor = buildConfig.windowsPerFloor[floorNum - 1];
      if (windowsOnFloor !== undefined) {
        doc.text(`Windows on this floor: ${windowsOnFloor}`);
      }
    }

    // Example: show floor height
    if (buildConfig?.floorHeight) {
      doc.text(`Floor height: ${fmt(buildConfig.floorHeight)}m`);
    }
  }

  doc.moveDown(1);
  doc.fontSize(10).fillColor("#666");
  doc.text("Detailed instructions to be added...");

  renderFooter(doc, spec.pageNumber);
}
