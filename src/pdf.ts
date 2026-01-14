import PDFDocument from "pdfkit";

export interface BuildConfig {
  depth: number;
  width: number;
  floors: number;
  floorHeight: number;
  shape: string;
  roofType: string;
  roofColor: string;
  wallColor: string;
  windowStyle: string;
  windowsPerFloor: number[];
  doorCount: number;
  hasBalcony: boolean;
  hasDeck: boolean;
  [key: string]: unknown;
}

export interface CustomerDetails {
  name: string;
  userId: string;
}

export interface OrderMetadata {
  orderId: string;
  createdAt: string;
  status: string;
  sessionId: string;
  buildId: string;
}

export interface OrderPayload {
  orderId: string;
  record?: unknown;
  buildConfig: BuildConfig;
  buildName: string;
  customerDetails: CustomerDetails;
  orderMetadata: OrderMetadata;
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

  const { buildConfig, buildName, customerDetails, orderMetadata } = payload;

  // Title
  doc.fontSize(24).text("Order Confirmation", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(18).text(buildName, { align: "center" });
  doc.moveDown(1.5);

  // Customer Details Section
  doc.fontSize(14).fillColor("#333").text("Customer Details", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#000");
  doc.text(`Name: ${customerDetails.name}`);
  doc.text(`User ID: ${customerDetails.userId}`);
  doc.moveDown(1);

  // Order Metadata Section
  doc.fontSize(14).fillColor("#333").text("Order Information", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#000");
  doc.text(`Order ID: ${orderMetadata.orderId}`);
  doc.text(`Build ID: ${orderMetadata.buildId}`);
  doc.text(`Status: ${orderMetadata.status}`);
  doc.text(`Created: ${new Date(orderMetadata.createdAt).toLocaleString()}`);
  doc.moveDown(1);

  // Build Configuration Section
  doc.fontSize(14).fillColor("#333").text("Build Configuration", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#000");

  // Dimensions
  doc.fontSize(12).fillColor("#555").text("Dimensions:");
  doc.fontSize(11).fillColor("#000");
  doc.text(`  Depth: ${buildConfig.depth}m`);
  doc.text(`  Width: ${buildConfig.width}m`);
  doc.text(`  Floors: ${buildConfig.floors}`);
  doc.text(`  Floor Height: ${buildConfig.floorHeight}m`);
  doc.moveDown(0.5);

  // Design
  doc.fontSize(12).fillColor("#555").text("Design:");
  doc.fontSize(11).fillColor("#000");
  doc.text(`  Shape: ${buildConfig.shape}`);
  doc.text(`  Roof Type: ${buildConfig.roofType}`);
  doc.text(`  Roof Color: ${buildConfig.roofColor}`);
  doc.text(`  Wall Color: ${buildConfig.wallColor}`);
  doc.moveDown(0.5);

  // Features
  doc.fontSize(12).fillColor("#555").text("Features:");
  doc.fontSize(11).fillColor("#000");
  doc.text(`  Window Style: ${buildConfig.windowStyle}`);
  doc.text(`  Windows Per Floor: ${buildConfig.windowsPerFloor.join(", ")}`);
  doc.text(`  Door Count: ${buildConfig.doorCount}`);
  doc.text(`  Has Balcony: ${buildConfig.hasBalcony ? "Yes" : "No"}`);
  doc.text(`  Has Deck: ${buildConfig.hasDeck ? "Yes" : "No"}`);

  doc.moveDown(2);

  // Footer
  doc.fontSize(9).fillColor("#888").text(
    `Generated on ${new Date().toLocaleString()}`,
    { align: "center" }
  );

  doc.end();

  return done;
}