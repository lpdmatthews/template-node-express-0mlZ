// Payload is loosely typed - we handle missing fields gracefully
export type OrderPayload = Record<string, unknown>;

// Represents a single dynamic page to render
export interface PageSpec {
  pageNumber: number;
  title: string;
  // Add more fields as needed, e.g.:
  // floor?: number;
  // components?: string[];
  // instructions?: string[];
  data: Record<string, unknown>;
}
