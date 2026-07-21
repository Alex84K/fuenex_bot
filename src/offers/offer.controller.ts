import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiKeyGuard } from "../telegram/controller/api-key.guard";
import { OfferPdfService } from "./offer-pdf.service";
import type { OfferPdfRequest } from "./dto/offer-pdf-request.dto";

@Controller("api/v1/offer-pdf")
export class OfferController {
  private readonly logger = new Logger(OfferController.name);

  constructor(private readonly offerPdfService: OfferPdfService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard)
  async renderPdf(
    @Body() request: OfferPdfRequest,
    @Headers("x-correlation-id") cid: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const tag = cid ? `[cid=${cid}] ` : "";
    const offerNumber = request?.offer?.offerNumber;
    try {
      this.logger.log(`${tag}Render request for offer ${offerNumber}`);
      const buffer = await this.offerPdfService.render(request);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Length": buffer.length.toString(),
      });
      res.end(buffer);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `${tag}Render failed for offer ${offerNumber}: ${detail}`,
        err instanceof Error ? err.stack : undefined,
      );
      // Echo cid back so the Java-side error log (which prints this body) carries
      // the same correlation key → both logs are searchable by one id.
      res.status(500).json({ error: "PDF render failed", detail, cid });
    }
  }
}
