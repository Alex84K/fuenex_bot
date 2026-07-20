import React from "react";
import { Injectable, Logger } from "@nestjs/common";
import { renderToBuffer } from "@react-pdf/renderer";
import { JSDOM } from "jsdom";
import { OfferPdfDocument } from "./offer-pdf-document";
import type { OfferPdfRequest } from "./dto/offer-pdf-request.dto";

// html-react-parser requires browser globals; provide them via jsdom.
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).Element = dom.window.Element;

@Injectable()
export class OfferPdfService {
  private readonly logger = new Logger(OfferPdfService.name);

  async render(request: OfferPdfRequest): Promise<Buffer> {
    this.logger.log(`Rendering PDF for offer ${request.offer.offerNumber}`);
    try {
      const buffer = await renderToBuffer(
        React.createElement(OfferPdfDocument, { request }) as any,
      );
      this.logger.log(`PDF rendered: ${buffer.length} bytes`);
      return Buffer.from(buffer);
    } catch (err) {
      this.logger.error(
        `PDF render failed for offer ${request.offer.offerNumber}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
