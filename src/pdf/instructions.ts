import { OrderPayload } from "./types";
import { fmt, fmtDate, renderHeader, renderFooter } from "./utils";

export function renderInstructionsPage(doc: PDFKit.PDFDocument, payload: OrderPayload) {
  const buildName = payload.buildName as string | undefined;
  const customerDetails = payload.customerDetails as Record<string, unknown> | undefined;
  const orderMetadata = payload.orderMetadata as Record<string, unknown> | undefined;
  const buildConfig = payload.buildConfig as Record<string, unknown> | undefined;

  // Title
  doc.fontSize(24).fillColor("#000").text("Order Confirmation", { align: "center" });
  if (buildName) {
    doc.moveDown(0.5);
    doc.fontSize(18).text(fmt(buildName), { align: "center" });
  }
  doc.moveDown(1.5);

  // Customer Details Section
  if (customerDetails && Object.keys(customerDetails).length > 0) {
    doc.fontSize(14).fillColor("#333").text("Customer Details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#000");

    if (customerDetails.name) doc.text(`Name: ${fmt(customerDetails.name)}`);
    if (customerDetails.userId) doc.text(`User ID: ${fmt(customerDetails.userId)}`);
    if (customerDetails.email) doc.text(`Email: ${fmt(customerDetails.email)}`);

    doc.moveDown(1);
  }

  // Order Metadata Section
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

  // Build Configuration Summary
  if (buildConfig && Object.keys(buildConfig).length > 0) {
    doc.fontSize(14).fillColor("#333").text("Build Summary", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#000");

    // Key specs at a glance
    if (buildConfig.floors) doc.text(`Floors: ${fmt(buildConfig.floors)}`);
    if (buildConfig.depth) doc.text(`Depth: ${fmt(buildConfig.depth)}m`);
    if (buildConfig.width) doc.text(`Width: ${fmt(buildConfig.width)}m`);
    if (buildConfig.shape) doc.text(`Shape: ${fmt(buildConfig.shape)}`);
    if (buildConfig.roofType) doc.text(`Roof: ${fmt(buildConfig.roofType)}`);

    doc.moveDown(1);
  }

  // Instructions / Notes section - placeholder for calculated instructions
  doc.fontSize(14).fillColor("#333").text("Assembly Notes", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#000");

  // TODO: Add calculated instructions based on payload
  // Example: estimated assembly time, tools needed, etc.
  doc.text("Detailed assembly instructions follow on subsequent pages.");

  doc.moveDown(1.5);

  // Raw payload dump for debugging/reference
  doc.fontSize(10).fillColor("#333").text("Raw Payload:", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor("#555");

  try {
    const payloadStr = JSON.stringify(payload, null, 2);
    doc.text(payloadStr, {
      width: doc.page.width - 100,
    });
  } catch {
    doc.text("Unable to serialize payload");
  }

  renderFooter(doc, 1);
}
