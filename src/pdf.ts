import PDFDocument from "pdfkit";

// Accept any payload - we'll safely extract what we can
export type OrderPayload = Record<string, unknown>;

// Helper to safely get nested values
function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Helper to format a value for display
function fmt(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Helper to format date strings
function fmtDate(value: unknown): string {
  if (!value) return '';
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

export async function makeOrderPdfBuffer(payload: OrderPayload): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const chunks: Uint8Array[] = [];

  doc.on("data", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Safely extract data - everything is optional
  const buildName = get(payload, 'buildName');
  const customerDetails = get(payload, 'customerDetails') as Record<string, unknown> | undefined;
  const orderMetadata = get(payload, 'orderMetadata') as Record<string, unknown> | undefined;
  const buildConfig = get(payload, 'buildConfig') as Record<string, unknown> | undefined;

  // Title
  doc.fontSize(24).text("Order Confirmation", { align: "center" });
  if (buildName) {
    doc.moveDown(0.5);
    doc.fontSize(18).text(fmt(buildName), { align: "center" });
  }
  doc.moveDown(1.5);

  // Customer Details Section - only if we have data
  if (customerDetails && Object.keys(customerDetails).length > 0) {
    doc.fontSize(14).fillColor("#333").text("Customer Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#000");

    if (customerDetails.name) doc.text(`Name: ${fmt(customerDetails.name)}`);
    if (customerDetails.userId) doc.text(`User ID: ${fmt(customerDetails.userId)}`);
    if (customerDetails.email) doc.text(`Email: ${fmt(customerDetails.email)}`);

    doc.moveDown(1);
  }

  // Order Metadata Section - only if we have data
  if (orderMetadata && Object.keys(orderMetadata).length > 0) {
    doc.fontSize(14).fillColor("#333").text("Order Information", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#000");

    if (orderMetadata.orderId) doc.text(`Order ID: ${fmt(orderMetadata.orderId)}`);
    if (orderMetadata.buildId) doc.text(`Build ID: ${fmt(orderMetadata.buildId)}`);
    if (orderMetadata.status) doc.text(`Status: ${fmt(orderMetadata.status)}`);
    if (orderMetadata.createdAt) doc.text(`Created: ${fmtDate(orderMetadata.createdAt)}`);
    if (orderMetadata.sessionId) doc.text(`Session ID: ${fmt(orderMetadata.sessionId)}`);

    doc.moveDown(1);
  }

  // Build Configuration Section - only if we have data
  if (buildConfig && Object.keys(buildConfig).length > 0) {
    doc.fontSize(14).fillColor("#333").text("Build Configuration", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#000");

    // Dimensions - group them if any exist
    const hasDimensions = buildConfig.depth || buildConfig.width || buildConfig.floors || buildConfig.floorHeight;
    if (hasDimensions) {
      doc.fontSize(12).fillColor("#555").text("Dimensions:");
      doc.fontSize(11).fillColor("#000");
      if (buildConfig.depth) doc.text(`  Depth: ${fmt(buildConfig.depth)}m`);
      if (buildConfig.width) doc.text(`  Width: ${fmt(buildConfig.width)}m`);
      if (buildConfig.floors) doc.text(`  Floors: ${fmt(buildConfig.floors)}`);
      if (buildConfig.floorHeight) doc.text(`  Floor Height: ${fmt(buildConfig.floorHeight)}m`);
      doc.moveDown(0.5);
    }

    // Design - group them if any exist
    const hasDesign = buildConfig.shape || buildConfig.roofType || buildConfig.roofColor || buildConfig.wallColor;
    if (hasDesign) {
      doc.fontSize(12).fillColor("#555").text("Design:");
      doc.fontSize(11).fillColor("#000");
      if (buildConfig.shape) doc.text(`  Shape: ${fmt(buildConfig.shape)}`);
      if (buildConfig.roofType) doc.text(`  Roof Type: ${fmt(buildConfig.roofType)}`);
      if (buildConfig.roofColor) doc.text(`  Roof Color: ${fmt(buildConfig.roofColor)}`);
      if (buildConfig.wallColor) doc.text(`  Wall Color: ${fmt(buildConfig.wallColor)}`);
      doc.moveDown(0.5);
    }

    // Features - group them if any exist
    const hasFeatures = buildConfig.windowStyle || buildConfig.windowsPerFloor ||
                        buildConfig.doorCount !== undefined ||
                        buildConfig.hasBalcony !== undefined ||
                        buildConfig.hasDeck !== undefined;
    if (hasFeatures) {
      doc.fontSize(12).fillColor("#555").text("Features:");
      doc.fontSize(11).fillColor("#000");
      if (buildConfig.windowStyle) doc.text(`  Window Style: ${fmt(buildConfig.windowStyle)}`);
      if (buildConfig.windowsPerFloor) doc.text(`  Windows Per Floor: ${fmt(buildConfig.windowsPerFloor)}`);
      if (buildConfig.doorCount !== undefined) doc.text(`  Door Count: ${fmt(buildConfig.doorCount)}`);
      if (buildConfig.hasBalcony !== undefined) doc.text(`  Has Balcony: ${fmt(buildConfig.hasBalcony)}`);
      if (buildConfig.hasDeck !== undefined) doc.text(`  Has Deck: ${fmt(buildConfig.hasDeck)}`);
      doc.moveDown(0.5);
    }

    // Any other buildConfig fields we haven't explicitly handled
    const knownKeys = new Set([
      'depth', 'width', 'floors', 'floorHeight',
      'shape', 'roofType', 'roofColor', 'wallColor',
      'windowStyle', 'windowsPerFloor', 'doorCount', 'hasBalcony', 'hasDeck'
    ]);
    const otherKeys = Object.keys(buildConfig).filter(k => !knownKeys.has(k));
    if (otherKeys.length > 0) {
      doc.fontSize(12).fillColor("#555").text("Other:");
      doc.fontSize(11).fillColor("#000");
      for (const key of otherKeys) {
        doc.text(`  ${key}: ${fmt(buildConfig[key])}`);
      }
    }
  }

  // If we got literally nothing useful, show a message
  if (!buildName && !customerDetails && !orderMetadata && !buildConfig) {
    doc.fontSize(12).fillColor("#666").text("No order details provided.", { align: "center" });
    doc.moveDown(1);

    // Dump whatever we did receive as raw JSON
    if (payload && Object.keys(payload).length > 0) {
      doc.fontSize(10).fillColor("#888").text("Raw payload received:");
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#000").text(JSON.stringify(payload, null, 2));
    }
  }

  doc.moveDown(2);

  // Footer
  doc.fontSize(9).fillColor("#888").text(
    `Generated on ${new Date().toLocaleString()}`,
    { align: "center" }
  );

  doc.end();

  return done;
}