// Mirrors Java OfferPdfRequest record tree exactly.
// Spring assembles + sends; this service only renders.

export interface AddressPdfDto {
  street: string | null;
  houseNumber: string | null;
  zipCode: string | null;
  city: string | null;
}

export interface CompanyPdfDto {
  name: string;
  street: string | null;
  houseNumber: string | null;
  zipCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  logoBase64: string | null; // data URI (data:image/...;base64,...) or null
}

export interface RecipientDto {
  forename: string | null;
  lastname: string | null;
  street: string | null;
  houseNr: string | null;
  plz: string | null;
  ort: string | null;
}

export interface OfferPositionDto {
  itemName: string | null;
  quantity: number;
  unit: string | null;
  sellingPrice: number;
  positionSumme: number;
  shortText: string | null; // HTML, nullable
  bigText: string | null;   // HTML, nullable
}

export interface OfferGroupDto {
  title: string;
  positions: OfferPositionDto[];
}

export interface OfferPdfDto {
  offerNumber: string;
  date: string;             // already formatted dd.MM.yyyy by assembler
  employeeName: string | null;
  netto: number;
  brutto: number;
  vortext: string | null;   // HTML
  nachtext: string | null;  // HTML
  recipient: RecipientDto;
  installationSite: AddressPdfDto;
  groups: OfferGroupDto[];
}

export interface OfferPdfRequest {
  company: CompanyPdfDto;
  offer: OfferPdfDto;
}
