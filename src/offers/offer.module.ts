import { Module } from "@nestjs/common";
import { OfferController } from "./offer.controller";
import { OfferPdfService } from "./offer-pdf.service";

@Module({
  controllers: [OfferController],
  providers: [OfferPdfService],
})
export class OfferModule {}
